const path = require('path')

require('dotenv').config({path: path.join(__dirname, '.env')})

module.exports = {
  env: process.env,

  identity: {
    defaultPolicy: '',
    resetPasswordPolicy: '',
    disallowedRedirectPath: '/error',
  },

  mongoCache: {
    enabled: false,
    host: '127.0.0.1'
  }
}