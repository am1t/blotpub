const express = require('express');
const micropub = require('micropub-express');
const request = require('request');

require('isomorphic-fetch');
const Dropbox = require('dropbox').Dropbox;
const kebabCase = require('lodash.kebabcase');
const cheerio = require('cheerio');
const dbxstream = require('dropbox-stream');

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

const getFileContent = function(doc){
    return Promise.all([
        getMetadata(doc),
        getTitle(doc),
        handleFiles(doc),
        getContent(doc)
      ])
        .then(result => result.filter(value => !!value).join('\n'));
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
    } else if(doc.properties["like-of"] && doc.properties["like-of"][0] !== ""){
        metadata += "like-of : " + doc.properties["like-of"][0] + "\n";
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

const tobase64 = function (text) {
    const data = text instanceof Buffer ? text : Buffer.from(text);
    return data.toString('base64');
};

const handleFiles = function(doc) {
    if(isEmpty(doc.files) || isEmpty(doc.files.photo)){
        return Promise.resolve("\n");
    }
    let files = doc.files.photo;
    return Promise.all(
        (files || []).map(file => {
            photoName = config.photo_path + file.filename;
            photoContent = tobase64(file.buffer);
            photoURL = config.site_url + "/" + config.photo_uri + "/" +  file.filename;
            return new Promise((resolve,reject) => {
                dbxstream.createDropboxUploadStream({
                    token: config.dropbox_token,
                    filepath: photoContent,
                    chunkSize: 1000 * 1024,
                    autorename: true
                  })
                  .on('error', err => {
                    console.log('Failed to upload the photos\n' + err); 
                    resolve("");                      
                  })
                  .on('progress', res => console.log(res))
                  .on('metadata', metadata => {
                    if (!metadata) { console.log('Failed to upload the photos'); resolve("");}
                    else{
                        console.log('Photo uploaded at ' + metadata);
                        resolve(photoURL);
                    }                      
                  });

                /*dbx.filesUpload({ path: photoName, contents: photoContent })
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
                });*/
            });
        })
    ).then(result => "photo: " + result.filter(value => !!value).join(', ') + '\n');

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

//Micropub endpoint
app.use('/micropub', micropub({

    tokenReference: config.token,
  
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