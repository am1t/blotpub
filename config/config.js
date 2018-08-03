const env = process.env;
const config = {
    token: env['AUTH_TOKEN_ENDPOINT']
    ? {
      endpoint: env['AUTH_TOKEN_ENDPOINT'],
      me: env['SITE_URL']
    }
    : {},
    dropbox_token: env['DROPBOX_TOKEN']
}

module.exports = config;