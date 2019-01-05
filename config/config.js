'use strict';

const env = process.env;

let default_path = '/Apps/Blot/';

const validatePath = function (path) {
  path = path.startsWith('/') ? path : '/' + path;
  path += path.endsWith('/') ? '' : '/';

  return path;
};

const config = {
    token: env['AUTH_TOKEN_ENDPOINT']
    ? {
      endpoint: env['AUTH_TOKEN_ENDPOINT'],
      me: env['SITE_URL']
    }
    : {},
    dropbox_token: env['DROPBOX_TOKEN'],
    default_tag: env['DEFAULT_TAG'],
    post_path: validatePath(env['POST_PATH'] = env['POST_PATH'] !== undefined ? env['POST_PATH'] : default_path),
    micro_post_path: validatePath(env['MICRO_POST_PATH'] !== undefined ? env['MICRO_POST_PATH'] : default_path),
    photo_path: validatePath(env['PHOTO_PATH'] !== undefined ? env['PHOTO_PATH'] : default_path + 'img/'),
    photo_uri: env['PHOTO_RELATIVE_URI'] !== undefined ? env['PHOTO_RELATIVE_URI'] : '',
    site_url: env['SITE_URL'],
    set_date: JSON.parse(env['SET_DATE'] ? env['SET_DATE'] : false),
    syndicate_to: env['SYNDICATE_TO'] !== undefined ? [].concat(JSON.parse(env['SYNDICATE_TO'])) : [],
    mastodon_instance: env['MASTODON_INSTANCE'],
    mastodon_token: env['MASTODON_TOKEN'],
    media_endpoint: env['MEDIA_ENDPOINT']
};

module.exports = config;
