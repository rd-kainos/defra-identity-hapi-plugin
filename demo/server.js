'use strict'

const Hapi = require('hapi')
const Blipp = require('blipp')
const _ = require('lodash')
const config = require('./config')

// Create a server with a host and port
const server = Hapi.server({
  host: config.env.HOST,
  port: config.env.PORT,
  cache: [
    {
      name: 'mongoCache',
      engine: require('catbox-mongodb'),
      host: '127.0.0.1',
      partition: 'cache'
    }
  ]
})

// Start the server
async function start () {
  await server.register({
    plugin: Blipp,
    options: {
      showAuth: true
    }
  })

  /** Auth plugin registration **/
  const idmCache = server.cache({
    cache: 'mongoCache',
    expiresIn: 10 * 60 * 1000,
    segment: 'customSegment',
  })

  const {
    env: {
    IDENTITY_TENANTID,
    IDENTITY_COOKIEPASSWORD,
    IDENTITY_CLIENTID,
    IDENTITY_CLIENTSECRET,
      HOST,
      PORT
    },
    identity: {
      defaultPolicy,
      resetPasswordPolicy,
      disallowedRedirectPath
    }
  } = config



  await server.register({
    plugin: require('../'),
    options: {
      tenantId: IDENTITY_TENANTID,
      cookiePassword: IDENTITY_COOKIEPASSWORD,
      appDomain: `http://${HOST}:${PORT}`,
      clientId: IDENTITY_CLIENTID,
      clientSecret: IDENTITY_CLIENTSECRET,
      defaultPolicy,
      resetPasswordPolicy,
      disallowedRedirectPath,
      // loginOnDisallow: true,
      isSecure: false,
      cache: idmCache,
      callbacks: {
        onError: async function (err) {
          err
        }
      }
    }
  })
  /** End auth plugin registration **/

  /** Everything below is for demonstration purposes **/
  await server.register(require('vision'))
  await server.register(require('inert'))

  server.views({
    engines: {
      ejs: require('ejs')
    },
    relativeTo: __dirname,
    path: 'views'
  })

  // Static assets
  server.route({
    method: 'GET',
    path: '/{param*}',
    config: {
      auth: false
    },
    handler: {
      directory: {
        path: 'public'
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/',
    config: {
      auth: false
    },
    handler: async function (request, h) {
      const creds = await server.methods.idm.getCredentials(request)

      if (creds && creds.expired()) {
        await server.methods.idm.refreshToken(request, creds.tokenSet.refresh_token)
      }

      return h.view('index', {
        user: null,
        idm: server.methods.idm,
        claims: await server.methods.idm.getClaims(request)
      })
    }
  })

  server.route({
    method: 'GET',
    path: '/account',
    options: {
      auth: false
    },
    handler: async function (request, h) {
      return h.view('account', {
        user: null,
        idm: server.methods.idm,
        claims: await server.methods.idm.getClaims(request),
        credentials: await server.methods.idm.getCredentials(request),
        trulyPrivate: false
      })
    }
  })

  server.route({
    method: 'GET',
    path: '/account-private',
    options: {
      auth: 'idm'
    },
    handler: async function (request, h) {
      return h.view('account', {
        user: null,
        idm: server.methods.idm,
        claims: await server.methods.idm.getClaims(request),
        credentials: await server.methods.idm.getCredentials(request),
        trulyPrivate: true
      })
    }
  })

  server.route({
    method: 'GET',
    path: '/error',
    options: {
      auth: false
    },
    handler: function (request, h) {
      const {query} = request

      let title = 'Whoops...'
      let message = 'An unexpected error has occurred'
      let stack// = query.stack ? JSON.parse(query.stack) : undefined

      if (query.notLoggedInErr) {
        const {next} = query

        title = 'Whoops...'
        message = `You need to be logged in to do that. <a href="${server.methods.idm.generateAuthenticationUrl(next)}">Click here to log in or create an account</a>`
      }

      return h.view('error', {
        title,
        message,
        stack
      })
    }
  })

  try {
    await server.start()
  }
  catch (err) {
    console.log(err)
    process.exit(1)
  }

  console.log('Server running at:', server.info.uri)
}

start()

module.exports = server