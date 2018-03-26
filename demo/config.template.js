const path = require('path')

require('dotenv').config({path: path.join(__dirname, '.env')})

module.exports = {
  env: process.env,

  identity: {
    defaultPolicy: 'b2c_DEFAULT_SIGNUPSIGNIN_POLICY_NAME',
    resetPasswordPolicy: 'b2c_RESET_PASSWORD_POLICY_NAME',
    disallowedRedirectPath: '/error',
  }
}