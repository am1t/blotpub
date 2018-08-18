const env = process.env;
const config = {
    token: env['AUTH_TOKEN_ENDPOINT']
    ? {
      endpoint: env['AUTH_TOKEN_ENDPOINT'],
      me: env['SITE_URL']
    }
    : {},
    dropbox_token: env['DROPBOX_TOKEN'],
    default_tag : env['DEFAULT_TAG'],
    post_path: env['POST_PATH'],
    micro_post_path: env['MICRO_POST_PATH'] !== undefined ? env['MICRO_POST_PATH'] : env['POST_PATH'],
    photo_path: env['PHOTO_PATH'] !== undefined ? env['PHOTO_PATH'] : env['POST_PATH'],
    photo_uri: env['PHOTO_RELATIVE_URI'] !== undefined ? env['PHOTO_RELATIVE_URI'] : '',
    site_url: env['SITE_URL'],
    set_date: JSON.parse(env['SET_DATE'] ? env['SET_DATE'] : false)
}

module.exports = config;