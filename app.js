const express = require('express');
const micropub = require('micropub-express');
const request = require('request');

require('isomorphic-fetch');
const Dropbox = require('dropbox').Dropbox;
const kebabCase = require('lodash.kebabcase');
const cheerio = require('cheerio');
const config = require('./config/config');

const app = express();

app.disable('x-powered-by');

var dbx = new Dropbox({ accessToken: config.dropbox_token });

const isEmpty = function (value) {
    if (typeof value === 'undefined' && !value) { return true; }
    if (Array.isArray(value) && value.length === 0) { return true; }
    if (typeof value === 'object' && Object.keys(value).length === 0) { return true; }
    return false;
  };

const getFileName = function (doc) {
    if(doc.mp && typeof doc.mp.slug !== 'undefined' && doc.mp.slug){ 
        return Promise.resolve("" + doc.mp.slug);
    } else if(typeof doc.properties["mp-slug"] !== 'undefined' && doc.properties["mp-slug"]) {
        return Promise.resolve("" + doc.properties["mp-slug"]);
    } else {
        if(typeof doc.properties.name !== 'undefined' && doc.properties.name && doc.properties.name[0] !== ""){
            return Promise.resolve(kebabCase(doc.properties.name[0].trim()));
        } else {
            return Promise.resolve("" + Date.now());
        }
    }
};

const getFilePath = function (doc) {
    if(doc.properties.name !== undefined && doc.properties.name[0] !== ""){
        return Promise.resolve(config.post_path);
    } else {
        return Promise.resolve(config.micro_post_path);
    }
};

const getMetadata = function (doc) {
    var metadata = "" + "title : " + (doc.properties.name ? doc.properties.name.join('') : '') + "\n";
    
    if(typeof config.set_date !== 'undefined' && config.set_date){
        if(doc.properties.published){
            metadata += "date : " + doc.properties.published[0] + "\n";
        } else {
            var today = new Date();
            metadata += "date : " + today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate()
                + " " + today.getHours() + ":" + today.getMinutes() + "\n"
        }
    }

    if(doc.properties.category){
        metadata += "tags : " + doc.properties.category.join(', ') + "\n";
    } else if(typeof config.default_tag !== 'undefined'){
        metadata += "tags : " + config.default_tag + "\n";
    }

    if(doc.properties.photo){
        if(Array.isArray(doc.properties.photo)){
            if(doc.properties.photo[0].value){
                metadata += "photo : " + doc.properties.photo[0].value + "\n";
                metadata += "photo-alt : " + doc.properties.photo[0].alt + "\n";
            } else {
                metadata += "photo : " + doc.properties.photo.join(', ') + "\n";
            }
        } else {
            metadata += "photo : " + doc.properties.photo + "\n";
        }
    }    

    if(doc.properties["in-reply-to"] && doc.properties["in-reply-to"][0] !== ""){
        metadata += "in-reply-to : " + doc.properties["in-reply-to"][0] + "\n";
        metadata += "is-social : yes\n";
    } else if(doc.properties["like-of"] && doc.properties["like-of"][0] !== ""){
        metadata += "like-of : " + doc.properties["like-of"][0] + "\n";
        metadata += "is-social : yes\n";
    }

    return Promise.resolve(metadata.replace(/\n$/, ""));
}

const getTitle = function(doc) {
    let url = "", title_pre = "";
    if(doc.properties["in-reply-to"] && doc.properties["in-reply-to"][0] !== ""){
        url = doc.properties["in-reply-to"][0];
        title_pre = "in-reply-to-title";
    } else if(doc.properties["like-of"] && doc.properties["like-of"][0] !== ""){
        url = doc.properties["like-of"][0];
        title_pre = "like-of-title";
    } else {
        return Promise.resolve("");
    }

    return new Promise((resolve, reject) => {
        request(url, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                var $ = cheerio.load(body);
                var title = $("head > title").text().trim();
                resolve(title_pre + " : " + title);
            } else {
                console.log('Failed to load the title for ', url);
                resolve(title_pre + " : a post");
            }
        });
    });
}

const handleFiles = function(doc) {
    if(isEmpty(doc.files) || isEmpty(doc.files.photo)){
        return Promise.resolve('');
    }
    let files = doc.files.photo;
    return Promise.all(
        (files || []).map(file => {
            let photoName = config.photo_path + file.filename;
            let photoURL = config.site_url + "/" + config.photo_uri + "/" +  file.filename;
            return new Promise((resolve,reject) => {
                dbx.filesUpload({ path: photoName, contents: file.buffer })
                .then(response => {
                    if (!response) { console.log('Failed to upload the photos'); resolve("");}
                    else{
                        console.log('Photo uploaded at ' + response.path_lower);
                        resolve(photoURL);
                    }
                })
                .catch(err => {
                    console.log('Failed to upload the photos\n' + err); 
                    resolve("");
                });
            });
        })
    ).then(result => "photo: " + result.filter(value => !!value).join(', '));

}

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

const syndicate = function(doc) {
    if(isEmpty(doc.properties['mp-syndicate-to'])){
        return Promise.resolve('\n');
    }

    let syndicate_to = [].concat(!isEmpty(doc.properties['mp-syndicate-to']) 
        ? doc.properties['mp-syndicate-to'] 
        : doc.mp['syndicate-to']);
    if(syndicate_to.indexOf(config.mastodon_instance) !== -1){
        getContent(doc).then(content => {
            let MASTO_API = config.mastodon_instance + "api/v1/statuses";
            content = content.replace("\'", "'");
            content = content.replace('\&quot;', '\"');
            content = encodeURIComponent(content);
            content = content.substr(0, 512);
            let options = {
                url : MASTO_API,
                body : 'status=' +  content,
                headers : {'Authorization': 'Bearer ' + config.mastodon_token}
            }
            return new Promise((resolve,reject) => {
                request.post(options, function(error, response, body){
                    if(error){
                        console.log("Failed to syndicate post. " + error);
                        return resolve("\n");
                    } else {
                        console.log("body : " + body)
                        console.log("Post syndicated to Mastodon instance " + body.url.toString());
                        return resolve("syndicated-to : " + body.url.toString() + "\n");
                    }
                });
            });            
        });
    } else {
        return Promise.resolve('\n');
    }
}

const getFileContent = function(doc){
    return Promise.all([
        getMetadata(doc),
        getTitle(doc),
        handleFiles(doc),
        syndicate(doc),
        getContent(doc)
      ])
        .then(result => result.filter(value => !!value).join('\n'));
};

//Micropub endpoint
app.use('/micropub', micropub({

    tokenReference: config.token,
    queryHandler: (q, req) => {
        if (q === 'config') {
            const config_res = {};
          /*if(config.media_endpoint) { config['media-endpoint'] = config.media_endpoint; }*/
            if(!isEmpty(config.syndicate_to)) { 
                config_res['syndicate-to'] = config.syndicate_to; 
            }
            return config_res;
        } else if (q === 'syndicate-to') {
            return config.syndicate_to ? { 'syndicate-to': config.syndicate_to } : undefined;
        }
    },  
    handler: function (micropubDocument, req) {
        console.log("Generated Micropub Document \n" + JSON.stringify(micropubDocument));

        return Promise.resolve().then(() => {
            return Promise.all([
                getFileName(micropubDocument),
                getFilePath(micropubDocument),
                getFileContent(micropubDocument)
            ]);
        })
        .then(result => {
            var file_name = result[0];
            var path = result[1];
            var content = result[2];

            return dbx.filesUpload({ path: path + file_name + ".md", contents: content })
            .then(function (response) {
                console.log('Post file uploaded at ' + response.path_lower);
                return { url: config.site_url + "/" + file_name };
            })
            .catch(function (err) {
                console.log(err);
            })
        });
    }
  
  }));

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server Started on port ${port}`);
});