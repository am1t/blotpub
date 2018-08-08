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

    if(doc.properties["in-reply-to"] && doc.properties["in-reply-to"][0] !== ""){
        metadata += "in-reply-to : " + doc.properties["in-reply-to"][0] + "\n";
    } else if(doc.properties["like-of"] && doc.properties["like-of"][0] !== ""){
        metadata += "like-of : " + doc.properties["like-of"][0] + "\n";
    }

    Promise.resolve(metadata.replace(/\n$/, ""));
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
        Promise.resolve(url);
    }

    request(url, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            var $ = cheerio.load(body);
            var title = $("head > title").text().trim();
            Promise.resolve(title_pre + " : " + title + "\n");
        } else {
            console.log('Failed to load the title for ', url);
            Promise.resolve(title_pre + " : a post\n");
        }
    });
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