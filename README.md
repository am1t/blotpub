# Micropub for [Blot](https://blot.im), with Dropbox

An endpoint that accepts [Micropub](http://micropub.net/) requests, creates a simple Blot posts and saves them to a configured Dropbox folder. This enables updating a Blot blog through a [Micropub client](https://indieweb.org/Micropub/Clients).

Currently, the endpoint supports the following.

* Creation of posts with titles ([articles](https://indieweb.org/article)) and without titles ([notes](https://indieweb.org/note))
* Metadata creation for tags, slugs and published date
* Support for [like](https://indieweb.org/like) and [reply](https://indieweb.org/reply) post types. Added as metadata `like-of` and `in-reply-to`.
* Uploading of image files as `multipart` data. Added as metadata `photo`

## TODO
* [ ] Implement repost, bookmark post types
* [ ] Add support for media endpoint
* [ ] Add support for updating and deleting the posts

## Requirements
Requires at least Node.js 6.0.0.

## Installation
This is a self-hosteable Micropub endpoint. Install it as a normal Node.js application. Add the required [configuration](#configuration) values via environment variables or similar mechanism. 

You can also deploy directly to Heroku.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/am1t/blotpub)

**Note**: This is an alpha release and there may be some edge cases that aren't handled. If you find one, please [report an issue](https://github.com/am1t/blotpub/issues/new).

## Endpoint discovery
Once you have deployed the application, your Micropub endpoint can be found at `/micropub` e.g. `https://example.com/micropub`.

To enable automatic discovery for your [Micropub endpoint](https://indieweb.org/micropub#Endpoint_Discovery) and [token endpoint](https://indieweb.org/obtaining-an-access-token#Discovery), you will need to add the following values to your Blot site's `<head>` - regularly in the `head.html` file in your theme.

```
<link rel="micropub" href="https://example.com/micropub">
<link rel="token_endpoint" href="https://tokens.indieauth.com/token">
```

## Configuration
### Required values
The following variables are required to enable a Micropub client to push content to your GitHub repository.

Variable | Description
-------- | -----------
`AUTH_TOKEN_ENDPOINT` | URL to verify Micropub token. Example: `https://tokens.indieauth.com/token`
`SITE_URL` | URL for your site. Example: `https://johndoe.example`
`DROPBOX_TOKEN` | [Dropbox access token](https://blogs.dropbox.com/developers/2014/05/generate-an-access-token-for-your-own-account/) to grant access to your Dropbox folder. Example: `12345abcde67890fghij09876klmno54321pqrst`
`POST_PATH` | Dropbox `path` where posts are to be stored
`PHOTO_PATH` | (Optional) Dropbox path where images are to be stored. Default to POST_PATH
`PHOTO_RELATIVE_URI` | (Optional) Relative public URI to uploaded images (ignoring Site URL). Default to blank
`MICRO_POST_PATH` | (Optional) Dropbox `path` where micro posts are to be stored. Default to `POST_PATH`
`SET_DATE` | (Optional) A `boolean` flag which if set to `true`, date of the post creation is explicitly added to post metadata
`TZ` | (Optional - only if `SET_DATE` set) By default, post creation date would be in `UTC`. This can be overridden by setting this to the preferred timezone using the [TZ Database Timezone format](http://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

## Modules used
* [micropub-express](https://github.com/voxpelli/node-micropub-express) – an [Express](http://expressjs.com/) Micropub endpoint that accepts and verifies Micropub requests and calls a callback with a parsed `micropubDocument`.

## Releases
Version | Date | Notes
-------:|:----:|:-----
0.3 | 2018-08-15 | Added support for photo uploads multipart
0.2 | 2018-08-08 | Added support for like/reply post types
0.1 | 2018-08-05 | Initial release with support for notes and articles 
