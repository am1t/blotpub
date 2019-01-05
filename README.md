# Micropub for [Blot](https://blot.im), with Dropbox
[![Build Status](https://travis-ci.org/am1t/blotpub.svg?branch=master)](https://travis-ci.org/am1t/blotpub) [![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fam1t%2Fblotpub.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fam1t%2Fblotpub?ref=badge_shield)

An endpoint that accepts [Micropub](http://micropub.net/) requests, creates a simple Blot posts and saves them to a configured Dropbox folder. This enables updating a Blot blog through a [Micropub client](https://indieweb.org/Micropub/Clients).

Currently, the endpoint supports the following.

* Creation of posts with titles ([articles](https://indieweb.org/article)) and without titles ([notes](https://indieweb.org/note))
* Metadata creation for tags, slugs and published date
* Support for [like](https://indieweb.org/like) and [reply](https://indieweb.org/reply) post types. Added as metadata `like-of` and `in-reply-to`
* Uploading of image files as `multipart` data. Added as metadata `photo`
* Support for syndicating posts to Mastodon. Added as metadata `mastodon-link`
* In-built media endpoint available at `/micropub/media`

A step-by-step setup guide is available at [the introduction blog post](https://blog.amitgawande.com/micropub-endpoint-for-blot). [Full implementation report](https://micropub.rocks/implementation-reports/servers/265/WkpcEN4FhqpE4HN6La7E) is available on [micropub.rocks](https://micropub.rocks/)

## TODO
* [x] Add support for media endpoint
* [ ] Implement repost, bookmark post types
* [ ] Add support for updating and deleting the posts

## Requirements
Requires at least Node.js 6.0.0.

## Installation
This is a self-hosteable Micropub endpoint. Install it as a normal Node.js application. Add the required [configuration](#configuration) values via environment variables or similar mechanism. 

You can also deploy directly to Heroku.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/am1t/blotpub)

**Note**: This is an alpha release and there may be some edge cases that aren't handled. If you find one, please [report an issue](https://github.com/am1t/blotpub/issues/new).

## Endpoint discovery
Once you have deployed the application, your Micropub endpoint can be found at `/micropub` e.g. `https://deployed-blotpub-app.com/micropub`. Note that the endpoint url is different from your website url. It would be the url for the blotpub application that your installed in the 1st step. For Heroku deployment, it would be something like `https://*****. herokuapp.com/micropub` (exact url will be available at Heroku dashboard).

To enable automatic discovery for your [Micropub endpoint](https://indieweb.org/micropub#Endpoint_Discovery) and [token endpoint](https://indieweb.org/obtaining-an-access-token#Discovery), you will need to add the following values to your Blot site's `<head>` - regularly in the `head.html` file in your theme.

```
<link rel="micropub" href="https://deployed-blotpub-app.com/micropub">
<link rel="token_endpoint" href="https://tokens.indieauth.com/token">
```

## Configuration
### Required values
The following variables are required to enable a Micropub client to push content to your GitHub repository.

Variable | Description
-------- | -----------
`AUTH_TOKEN_ENDPOINT` | URL to verify Micropub token. Example: `https://tokens.indieauth.com/token`
`SITE_URL` | URL for your site. Example: `https://johndoe.example`
`DROPBOX_TOKEN` | [Dropbox access token](https://blogs.dropbox.com/developers/2014/05/generate-an-access-token-for-your-own-account/) to grant access to your Dropbox folder. "Permission type" in Dropbox should be "Full Dropbox". Example: `12345abcde67890fghij09876klmno54321pqrst`
`POST_PATH` | (Optional) Dropbox `path` where posts are to be stored. Defaults to `/Apps/Blot/`
`PHOTO_PATH` | (Optional) Dropbox path where images are to be stored. Defaults to `/Apps/Blot/img/`
`PHOTO_RELATIVE_URI` | (Optional) Relative public URI to uploaded images (ignoring Site URL). Default to blank
`MICRO_POST_PATH` | (Optional) Dropbox `path` where micro posts are to be stored. Defaults to `/Apps/Blot/`
`SET_DATE` | (Optional) A `boolean` flag which if set to `true`, date of the post creation is explicitly added to post metadata
`TZ` | (Optional - only if `SET_DATE` set) By default, post creation date would be in `UTC`. This can be overridden by setting this to the preferred timezone using the [TZ Database Timezone format](http://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
`DEFAULT_TAG` | (Optional) If this property is set and no category is provided, value would be set as the tag
`SYNDICATE_TO` | (Optional) Syndication target(s) provided as a JSON array. E.g. as defined at [spec](https://www.w3.org/TR/micropub/#syndication-targets): [{"uid":"https://social.example/johndoe","name":"@johndoe on Example Social Network"}]
`MASTODON_INSTANCE` | (Optional) Mastodon instance where posts need to be syndicated
`MASTODON_TOKEN` | (Optional) Access Token for Mastodon
`MEDIA_ENDPOINT` | (Optional) Media Endpoint to be used. Can also be configured to in-built endpoint available at `/micropub/media`

## Modules used
* [micropub-express](https://github.com/voxpelli/node-micropub-express) – an [Express](http://expressjs.com/) Micropub endpoint that accepts and verifies Micropub requests and calls a callback with a parsed `micropubDocument`.

## Releases
Version | Date | Notes
-------:|:----:|:-----
0.5.1 | 2019-01-05 | Fixes for Issue [#3](https://github.com/am1t/blotpub/issues/3) + few minor changes
0.5 | 2018-08-21 | Introduced an in-built Media endpoint
0.4 | 2018-08-19 | Added support for syndicating posts to Mastodon
0.3 | 2018-08-15 | Added support for photo uploads multipart
0.2 | 2018-08-08 | Added support for like/reply post types
0.1 | 2018-08-05 | Initial release with support for notes and articles 


## License
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fam1t%2Fblotpub.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fam1t%2Fblotpub?ref=badge_large)
