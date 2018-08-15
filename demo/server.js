const Hapi = require('hapi')
const path = require('path')
const Blipp = require('blipp')
const config = require('./config')

const serverCache = config.mongoCache.enabled ? [
  {
    name: 'mongoCache',
    engine: require('catbox-mongodb'),
    host: config.mongoCache.host,
    partition: 'cache'
  }
] : undefined

// Create a server with a host and port
const server = Hapi.server({
  host: config.app.host,
  port: config.app.port,
  cache: serverCache
})

// Start the server
async function start () {
  if (process.env.NODE_ENV === 'development') {
    await server.register({
      plugin: Blipp,
      options: {
        showAuth: true
      }
    })
  }

  /**
   *  Auth plugin registration
   **/
  const idmCache = config.mongoCache.enabled ? server.cache({
    cache: 'mongoCache',
    expiresIn: 10 * 60 * 1000,
    segment: 'customSegment'
  }) : undefined

  const {
    app: {
      domain: appDomain
    },
    identity: {
      identityAppUrl,
      tenantId,
      serviceId,
      cookiePassword,
      clientId,
      clientSecret,
      defaultPolicy,
      defaultJourney,
      disallowedRedirectPath
    }
  } = config

  await server.register({
    plugin: require('../'),
    options: {
      identityAppUrl,
      tenantId,
      serviceId,
      cookiePassword,
      appDomain,
      clientId,
      clientSecret,
      defaultPolicy,
      defaultJourney,
      disallowedRedirectPath,
      // loginOnDisallow: true,
      isSecure: false,
      cache: idmCache,
      callbacks: {
        preLogout: async () => {
          console.log('User is logging out')
        },
        onError: async (err, request, h) => {
          // Insert your own error logging

          if (err) {
            console.error(err)
          }

          return h.view('error', {
            title: 'Woops, an error occurred'
          })
        }
      }
    }
  })
  /** End auth plugin registration **/

  /** Everything below is for demonstration purposes **/
  server.ext('onPreAuth', async (request, h) => {
    const creds = await server.methods.idm.getCredentials(request)

    if (creds && creds.isExpired()) {
      await server.methods.idm.refreshToken(request, creds.tokenSet.refresh_token)
    }

    return h.continue
  })

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
    options: {
      auth: false
    },
    handler: {
      directory: {
        path: path.join(__dirname, 'public')
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/',
    options: {
      auth: false
    },
    handler: async function (request, h) {
      const creds = await server.methods.idm.getCredentials(request)

      if (creds && creds.isExpired()) {
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
      const { query } = request

      let title = 'Whoops...'
      let message = 'An unexpected error has occurred'
      let stack// = query.stack ? JSON.parse(query.stack) : undefined

      if (query.notLoggedInErr) {
        const { next } = query

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

  await server.start()

  console.log('Server running at:', server.info.uri)

  return server
}

module.exports = start
