const AdalNode = require('adal-node')
const config = require('../../config/server')
const { error } = require('../errors')

module.exports = {
  getToken: () => {
    return new Promise((resolve, reject) => {
      // Build URL scoping to the AAD tenant
      const authUrl = config.aad.authHost + '/' + config.aad.tenantName
      // Following credentials are for the AAD used to authenticate the B2C Dynamics
      const clientId = config.dynamics.clientId
      const clientSecret = config.dynamics.clientSecret
      const resourceUrl = config.dynamics.resourceUrl
      const context = new AdalNode.AuthenticationContext(authUrl)
      context.acquireTokenWithClientCredentials(resourceUrl, clientId, clientSecret, (err, response) => {
        if (err) {
          reject(err)
          return
        }
        if (response.accessToken) {
          resolve(response.accessToken)
        } else {
          reject(new error.UnexpectedResponse('Could not access Active Directory auth token'))
        }
      })
    })
  }
}
