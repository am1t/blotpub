const env = process.env;
const config = {
    token: env['AUTH_TOKEN_ENDPOINT']
    ? {
      endpoint: env['AUTH_TOKEN_ENDPOINT'],
      me: env['SITE_URL']
    }
    : {},
    dropbox_token: env['DROPBOX_TOKEN'],
    post_path: env['POST_PATH'],
    micro_post_path: env['MICRO_POST_PATH'] !== undefined ? env['MICRO_POST_PATH'] : env['POST_PATH'],
    site_url: env['SITE_URL'],
    set_date: env['SET_DATE']
}

module.exports = config;