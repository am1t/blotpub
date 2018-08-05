const express = require('express');
var micropub = require('micropub-express');

require('isomorphic-fetch');
var Dropbox = require('dropbox').Dropbox;
var kebabCase = require('lodash.kebabcase');

const config = require('./config/config');

const app = express();

app.disable('x-powered-by');

var dbx = new Dropbox({ accessToken: config.dropbox_token });

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
        getContent(doc)
      ])
        .then(result => result.join('\n'));
};

const getMetadata = function (doc) {
    var metadata = "" + "title : " + (doc.properties.name ? doc.properties.name.join('') : '') + "\n";
    
    if(doc.properties.published){
        metadata += "date : " + doc.properties.published[0] + "\n";
    } else {
        var today = new Date();
        metadata += "date : " + today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate()
            + " " + today.getHours() + ":" + today.getMinutes() + "\n"
    }

    if(doc.properties.category){
        metadata += "tags : " + doc.properties.category.join(', ') + "\n";
    }

    if(doc.properties["in-reply-to"] && doc.properties["in-reply-to"][0] !== ""){
        metadata += "in-reply-to : " + doc.properties["in-reply-to"][0] + "\n";
    } else if(doc.properties["like-of"] && doc.properties["like-of"][0] !== ""){
        metadata += "like-of : " + doc.properties["like-of"][0] + "\n";
    }

    return metadata;
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
        /*
        1. [DONE] Path from config - post and micro
        2. [DONE] Create File name based on title/title-less post or slug property
        3. [DONE] Content without title
        4. [TESTING] Content with title and no additional properties
        5. Like and Reply
        */
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

            console.log(content + '\n'+ path + '\n' + file_name);

            return dbx.filesUpload({ path: path + file_name + ".md", contents: content })
            .then(function (response) {
                console.log(response);
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