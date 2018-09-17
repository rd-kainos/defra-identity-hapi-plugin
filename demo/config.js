const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '.env') })

const { env } = process

module.exports = {
  app: {
    host: env.HOST || undefined, // Make sure it's undefined if not truey - heroku only wants to bind port
    port: env.PORT || 8000,
    domain: env.DOMAIN || `http://${env.HOST}:${env.PORT}`
  },

  identity: {
    identityAppUrl: env.IDENTITY_APP_URL,
    serviceId: env.IDENTITY_SERVICEID,
    cookiePassword: env.IDENTITY_COOKIEPASSWORD,
    clientId: env.IDENTITY_CLIENTID,
    clientSecret: env.IDENTITY_CLIENTSECRET,
    defaultPolicy: env.IDENTITY_DEFAULT_POLICY,
    defaultJourney: env.IDENTITY_DEFAULT_JOURNEY,
    aad: {
      authHost: env.AAD_AUTHHOST,
      tenantName: env.AAD_TENANTNAME
    },
    dynamics: {
      clientId: env.DYNAMICS_AADCLIENTID,
      clientSecret: env.DYNAMICS_AADCLIENTSECRET,
      resourceUrl: env.DYNAMICS_RESOURCEURL,
      endpointBase: env.DYNAMICS_ENDPOINTBASE
    }
  },

  serviceRoleId: env.IDENTITY_SERVICEROLEID,

  mongoCache: {
    enabled: env.USE_MONGODB === 'true',
    host: '127.0.0.1'
  }
}
