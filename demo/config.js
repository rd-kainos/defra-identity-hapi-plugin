const path = require('path')

require('dotenv').config({path: path.join(__dirname, '.env')})

module.exports = {
  env: process.env,

  identity: {
    defaultPolicy: 'b2c_1_b2c-webapp-signup-signin',
    resetPasswordPolicy: 'b2c_1_resetpassword',
    disallowedRedirectPath: '/error',
  }
}