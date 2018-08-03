# Micropub for [Blot](https://blot.im), with Dropbox

An endpoint that accepts [Micropub](http://micropub.net/) requests, creates a simple Blot posts and saves them to a configured Dropbox folder. This enables updating a Blot blog through a [Micropub client](https://indieweb.org/Micropub/Clients).

### _Early alpha release_
Supported:
* Creation of posts with or without titles
* Metadata creation for tags, slugs
* 
Unsupported:
* Media handling, image files
* Replacing an existing post with a new version
* Like and reply post types

## Requirements
Requires at least Node.js 6.0.0.

## Installation
This is a self-hosteable Micropub endpoint. Install it as a normal Node.js application. Add the required [configuration](#configuration) values via environment variables or similar mechanism. 

You can also deploy directly to Heroku.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/am1t/blotpub)

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
`DROPBOX_TOKEN` | [Dropbox access token](https://dropbox.github.io/dropbox-api-v2-explorer/#file_requests_create) to grant access to your Dropbox folder. Example: `12345abcde67890fghij09876klmno54321pqrst`
`POST_PATH` | Dropbox `path` where posts are to be stored
`MICRO_POST_PATH` | (Optional) Dropbox `path` where micro posts are to be stored. Default to `POST_PATH`

## Modules used
* [micropub-express](https://github.com/voxpelli/node-micropub-express) – an [Express](http://expressjs.com/) Micropub endpoint that accepts and verifies Micropub requests and calls a callback with a parsed `micropubDocument`.