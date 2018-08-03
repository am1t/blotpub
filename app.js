const express = require('express');
var micropub = require('micropub-express');

require('isomorphic-fetch');
var Dropbox = require('dropbox').Dropbox;

const config = require('./config/config');

const app = express();

app.disable('x-powered-by');

var dbx = new Dropbox({ accessToken: config.dropbox_token });

//Micropub endpoint
app.use('/micropub', micropub({

    tokenReference: config.token,
  
    handler: function (micropubDocument, req) {
        content = micropubDocument.properties.content[0];
        file_name = '/test-posts/post.md';
        console.log(content + '\n'+ file_name);

        return Promise.resolve().then(function () {
            return dbx.filesUpload({ path: file_name, contents: content })
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