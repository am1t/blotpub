const express = require('express');
var micropub = require('micropub-express');

require('isomorphic-fetch');
var Dropbox = require('dropbox').Dropbox;

const config = require('./config/config');

const app = express();

app.disable('x-powered-by');

var dbx = new Dropbox({ accessToken: config.dropbox_token });

const getFileName = function (doc) {
    return "post-" + Date.now();
};

const getPath = function (doc) {
    if(doc.properties.name !== undefined && doc.properties.name !== ""){
        return config.post_path;
    } else {
        return config.micro_post_path;
    }
};

const getContent = function (doc) {
    return doc.properties.content[0];;
};

//Micropub endpoint
app.use('/micropub', micropub({

    tokenReference: config.token,
  
    handler: function (micropubDocument, req) {
        /*
        1. Path from config - post and micro
        2. Create File name based on title/title-less post or slug property
        3. Content without title
        4. Content with title and no additional properties
        5. Like and Reply
        */
        console.log("Generated Micropub Document \n" + micropubDocument);
        console.log(content + '\n'+ path + '\n' + file_name);

        return Promise.resolve().then(() => {
            return Promise.all([
                getFileName(micropubDocument),
                getPath(micropubDocument),
                getContent(micropubDocument)
            ]);
        })
        .then(result => {
            var file_name = result[0];
            var path = result[1];
            var content = result[2];

            return dbx.filesUpload({ path: path + file_name + ".md", contents: content })
            .then(function (response) {
                console.log(response);
                return { url: 'https://lab.amitgawande.com/theme-refresh' };
            })
            .catch(function (err) {
                console.log(err);
                return { url: 'https://lab.amitgawande.com/404.html' };
            })
        });

        /*dbx.filesUpload({ path: file_name, contents: content })
            .then(function (response) {
                console.log(response);
                return Promise.resolve().then(function () {
                    return { url: 'https://lab.amitgawande.com/theme-refresh' };
                });
        })
            .catch(function (err) {
            console.log(err);
            return Promise.resolve().then(function () {
                return {  url: 'https://lab.amitgawande.com/404.html' };
            });
        });*/
    }
  
  }));

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server Started on port ${port}`);
});