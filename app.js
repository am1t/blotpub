'use strict';

const express = require('express');
const micropub = require('micropub-express');
const request = require('request');

require('isomorphic-fetch');
const Dropbox = require('dropbox').Dropbox;
const kebabCase = require('lodash.kebabcase');
const cheerio = require('cheerio');
const removeMd = require('remove-markdown');
const Twitter = require('twitter');
const config = require('./config/config');

const app = express();

app.disable('x-powered-by');

let dbx = new Dropbox({ accessToken: config.dropbox_token });

const isEmpty = function (value) {
    if (typeof value === 'undefined' && !value) { return true; }
    if (Array.isArray(value) && value.length === 0) { return true; }
    if (typeof value === 'object' && Object.keys(value).length === 0) { return true; }
    return false;
  };

const getFileName = function (doc) {
    if (doc.mp && typeof doc.mp.slug !== 'undefined' && doc.mp.slug) {
        return '' + doc.mp.slug;
    } else if (typeof doc.properties['mp-slug'] !== 'undefined' && doc.properties['mp-slug']) {
        return '' + doc.properties['mp-slug'];
    } else {
        if (typeof doc.properties.name !== 'undefined' && doc.properties.name && doc.properties.name[0] !== '') {
            return kebabCase(doc.properties.name[0].trim());
        } else {
            return '' + Date.now();
        }
    }
};

const getFilePath = function (doc) {
    if (doc.properties.name !== undefined && doc.properties.name[0] !== '') {
        return Promise.resolve(config.post_path);
    } else {
        return Promise.resolve(config.micro_post_path);
    }
};

const getMetadata = function (doc) {
    let metadata = '' + 'title : ' + (doc.properties.name ? doc.properties.name.join('') : '') + '\n';

    if (typeof config.set_date !== 'undefined' && config.set_date) {
        if (doc.properties.published) {
            metadata += 'date : ' + doc.properties.published[0] + '\n';
        } else {
            let today = new Date();
            metadata += 'date : ' + today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() +
                ' ' + today.getHours() + ':' + today.getMinutes() + '\n';
        }
    }

    if (doc.properties.category) {
        metadata += 'tags : ' + doc.properties.category.join(', ') + '\n';
    } else if (typeof config.default_tag !== 'undefined') {
        metadata += 'tags : ' + config.default_tag + '\n';
    }

    if (doc.properties.photo) {
        if (Array.isArray(doc.properties.photo)) {
            if (doc.properties.photo[0].value) {
                metadata += 'photo : ' + doc.properties.photo[0].value + '\n';
                metadata += 'photo-alt : ' + doc.properties.photo[0].alt + '\n';
            } else {
                metadata += 'photo : ' + doc.properties.photo.join(', ') + '\n';
            }
        } else {
            metadata += 'photo : ' + doc.properties.photo + '\n';
        }
    }

    if (doc.properties['in-reply-to'] && doc.properties['in-reply-to'][0] !== '') {
        metadata += 'in-reply-to : ' + doc.properties['in-reply-to'][0] + '\n';
        metadata += 'is-social : yes\n';
    } else if (doc.properties['like-of'] && doc.properties['like-of'][0] !== '') {
        metadata += 'like-of : ' + doc.properties['like-of'][0] + '\n';
        metadata += 'is-social : yes\n';
    }

    return Promise.resolve(metadata.replace(/\n$/, ''));
};

const getTitle = function (doc) {
    let url = '';
    let titlePre = '';
    if (doc.properties['in-reply-to'] && doc.properties['in-reply-to'][0] !== '') {
        url = doc.properties['in-reply-to'][0];
        titlePre = 'in-reply-to-title';
    } else if (doc.properties['like-of'] && doc.properties['like-of'][0] !== '') {
        url = doc.properties['like-of'][0];
        titlePre = 'like-of-title';
    } else {
        return Promise.resolve('');
    }

    return new Promise((resolve, reject) => {
        request(url, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                let $ = cheerio.load(body);
                let title = $('head > title').text().trim();
                resolve(titlePre + ' : ' + title);
            } else {
                console.log('Failed to load the title for ', url);
                resolve(titlePre + ' : a post');
            }
        });
    });
};

const handleFiles = function (doc) {
    if (isEmpty(doc.files) || (isEmpty(doc.files.photo) && isEmpty(doc.files.file))) {
        console.log('No files found to be uploaded');
        return Promise.resolve('');
    }
    let files = isEmpty(doc.files.photo) ? doc.files.file : doc.files.photo;
    return Promise.all(
        (files || []).map(file => {
            let photoFileName = file.filename;
            if (photoFileName.indexOf('image.') !== -1) {
                photoFileName = 'img_' + Date.now() +
                    photoFileName.substr(photoFileName.lastIndexOf('.'), photoFileName.length);
            }
            let photoName = config.photo_path + photoFileName;
            let photoURL = config.site_url + '/' + config.photo_uri + '/' + photoFileName;
            return new Promise((resolve, reject) => {
                dbx.filesUpload({ path: photoName, contents: file.buffer })
                .then(response => {
                    if (!response) {
                        console.log('Failed to upload the photos'); resolve('');
                    } else {
                        console.log('Photo uploaded at ' + response.path_lower);
                        resolve(photoURL);
                    }
                })
                .catch(err => {
                    console.log('Failed to upload the photos\n' + err);
                    resolve('');
                });
            });
        })
    ).then(result => 'photo: ' + result.filter(value => !!value).join(', '));
};

const getContent = function (doc) {
    let content = doc.properties.content;
    if (!content) { return Promise.resolve(''); }

    if (Array.isArray(content)) {
        return Promise.all(content.map(content => {
          if (typeof content !== 'object') {
            content = { value: content };
          }

          if (content.html) {
            return content.html;
          }

          return content.value;
        }))
        .then(result => result.filter(value => !!value).join('\n') + '\n');
      }
};

const syndicate_mast = function (doc, file_name) {
    if (isEmpty(doc.properties['mp-syndicate-to']) &&
        (doc.mp === undefined || isEmpty(doc.mp['syndicate-to']))) {
        return Promise.resolve('');
    }

    let syndicate_to = [].concat(!isEmpty(doc.properties['mp-syndicate-to'])
        ? doc.properties['mp-syndicate-to']
        : doc.mp['syndicate-to']);
    if (syndicate_to.indexOf(config.mastodon_instance) !== -1) {
        return getContent(doc).then(content => {
            let MASTO_API = config.mastodon_instance + 'api/v1/statuses';
            let post_url = config.site_url + '/' + file_name;
            content = removeMd(content);
            if (content.length > 512) {
                content = content.substr(0, 500 - post_url.length);
                content = content.substr(0, Math.min(content.length, content.lastIndexOf(' ')));
                content = content + '.. ' + post_url;
            }
            content = encodeURIComponent(content);
            let options = {
                url: MASTO_API,
                body: 'status=' + content,
                headers: {'Authorization': 'Bearer ' + config.mastodon_token}
            };
            return new Promise((resolve, reject) => {
                request.post(options, function (error, response, body) {
                    if (error) {
                        console.log('Failed to syndicate post to mastodon. ' + error);
                        resolve('');
                    } else {
                        body = JSON.parse(body);
                        console.log('Post syndicated to Mastodon instance ' + body.url.toString());
                        resolve('mastodon-link : ' + body.url.toString());
                    }
                });
            });
        });
    } else {
        return Promise.resolve('');
    }
};

const syndicate_twit = function (doc, file_name) {
    if (isEmpty(doc.properties['mp-syndicate-to']) &&
        (doc.mp === undefined || isEmpty(doc.mp['syndicate-to']))) {
        return Promise.resolve('\n');
    }

    let syndicate_to = [].concat(!isEmpty(doc.properties['mp-syndicate-to'])
        ? doc.properties['mp-syndicate-to']
        : doc.mp['syndicate-to']);
    if (syndicate_to.indexOf(config.twitter_instance) !== -1) {
        return getContent(doc).then(content => {
            let post_url = config.site_url + '/' + file_name;
            content = removeMd(content);
            if (content.length > 280) {
                content = content.substr(0, 275 - post_url.length);
                content = content.substr(0, Math.min(content.length, content.lastIndexOf(' ')));
                content = content + '.. ' + post_url;
            }

            let client = new Twitter({
                consumer_key: config.twitter_api_key,
                consumer_secret: config.twitter_api_secret,
                access_token_key: config.twitter_access,
                access_token_secret: config.twitter_access_secret
              });
            return new Promise((resolve, reject) => {
                client.post('statuses/update', {status: content}, function (error, tweet, response) {
                    if (error) {
                        console.log('Failed to syndicate post to twitter. ' + error);
                        resolve('\n');
                    } else {
                        let tweet_url = config.twitter_instance + 'status/' + tweet.id_str;
                        console.log('Post syndicated to Twitter instance ' + tweet_url);
                        resolve('twitter-link : ' + tweet_url + '\n');
                    }
                  });
            });
        });
    } else {
        return Promise.resolve('\n');
    }
};

const getFileContent = function (doc, file_name) {
    return Promise.all([
        getMetadata(doc),
        getTitle(doc),
        handleFiles(doc),
        syndicate_mast(doc, file_name),
        syndicate_twit(doc, file_name),
        getContent(doc)
      ])
        .then(result => result.filter(value => !!value).join('\n'));
};

const getFileNameFromURL = function (post_url) {
    let file_name = decodeURIComponent(post_url).split(config.site_url + '/')[1];
    if (file_name.indexOf('/') !== -1) {
        file_name = file_name.split('/');
    }
    return file_name;
};

const buildMicropubDocument = function (file_name) {
    let dbx_file_path = config.micro_post_path + file_name + '.md';
    console.log('Trying to fetch file from dropbox - ' + dbx_file_path);
    return dbx.filesDownload({path: dbx_file_path})
    .then(function (res) {
        let file_response = {};
        let file_content = res.fileBinary + '';
        let file_content_lines = file_content.split(/\r?\n/);
        file_response = {'type': ['h-entry']};
        file_response.properties = {};
        file_response.properties.category = [];
        file_content_lines.forEach(elm => {
            if (elm.indexOf('title :') !== -1 && elm.indexOf('-title') === -1) {
                file_response.properties.name = elm.split(':')[1].trim();
            } else if (elm.indexOf('date :') !== -1) {
                file_response.properties.published = [elm.split(':')[1].trim()];
            } else if (elm.indexOf('tags :') !== -1) {
                elm.split(':')[1].trim().split(',').forEach(tag => {
                    file_response.properties.category.push(tag.trim());
                });
            }
        });
        file_response.properties['mp-slug'] = file_name;
        file_response.properties.content = [file_content.split(/\r?\n\n/)[1].trim()];
        console.log(JSON.stringify(file_response));
        return file_response;
    })
    .catch(function (error) {
        console.error('Failed to read file' + error);
        return {};
    });
};

// Micropub endpoint
app.use('/micropub', micropub({

    tokenReference: config.token,
    queryHandler: (q, req) => {
        if (q === 'config') {
            const config_res = {};
          if (config.media_endpoint) { config_res['media-endpoint'] = config.media_endpoint; }
            if (!isEmpty(config.syndicate_to)) {
                config_res['syndicate-to'] = config.syndicate_to;
            }
            return config_res;
        } else if (q === 'syndicate-to') {
            return config.syndicate_to ? { 'syndicate-to': config.syndicate_to } : undefined;
        } else if (q === 'source') {
            console.log('Received request for updating post ' + req.query.url);
            let file_name = getFileNameFromURL(req.query.url);
            return buildMicropubDocument(file_name);
        }
    },
    handler: function (mp_document, req) {
        console.log('Generated Micropub Document \n' + JSON.stringify(mp_document));
        let file_name, current_document, dbx_post_mode;
        if (mp_document.action === undefined) {
            file_name = getFileName(mp_document);
            dbx_post_mode = 'add';
            current_document = mp_document;
        } else {
            dbx_post_mode = 'overwrite';
            file_name = getFileNameFromURL(mp_document.url);
            current_document = buildMicropubDocument(file_name);
            let mp_action_type = ['replace', 'add', 'delete'];
            mp_action_type.forEach(action_type => {
                if (action_type in mp_document) {
                    let action = mp_document[action_type];
                    if (action_type === 'replace' || action_type === 'delete') {
                        delete current_document.properties[action];
                        if (action_type === 'replace') {
                            current_document.properties[action] = action;
                        }
                    } else if (action_type === 'add') {
                        if (!current_document.properties[action]) {
                            current_document.properties[action] = action;
                        } else {
                            action.forEach(value => {
                                current_document.properties[action].push(value);
                            });
                        }
                    }
                }
            });
        }
        return Promise.resolve().then(() => {
            return Promise.all([
                getFilePath(current_document),
                getFileContent(current_document, file_name)
            ]);
        })
        .then(result => {
            let path = result[0];
            let content = result[1];
            // let write_mode
            return dbx.filesUpload({ path: path + file_name + '.md', contents: content, mode: dbx_post_mode })
            .then(function (response) {
                console.log('Post file uploaded at ' + response.path_lower);
                return { url: config.site_url + '/' + file_name };
            })
            .catch(function (err) {
                console.log(err);
            });
        });
    },
    media_handler: function (data, req) {
        console.log('Received request for media handling');
        return Promise.resolve().then(() => {
            return handleFiles(data).then(res => {
                if (!res) {
                    console.log('Failed to upload the media.');
                    return {};
                }
                console.log('Media handled with response ' + res);
                let resurl = res.split(/:(.+)/)[1];
                return resurl ? { url: resurl.trim() } : {};
            });
        });
    }
  }));

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server Started on port ${port}`);
});
