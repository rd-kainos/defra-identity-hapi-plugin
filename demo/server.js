const Hapi = require('hapi')
const path = require('path')
const Blipp = require('blipp')
const config = require('./config')

const serverCache = config.mongoCache.enabled ? [
  {
    name: 'mongoCache',
    engine: require('catbox-mongodb'),
    host: config.mongoCache.host,
    partition: 'idm-cache'
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
    expiresIn: 24 * 60 * 60 * 1000,
    segment: 'tokens'
  }) : undefined

  const {
    app: {
      domain: appDomain
    },
    identity: {
      identityAppUrl,
      serviceId,
      cookiePassword,
      clientId,
      clientSecret,
      defaultPolicy,
      defaultJourney,
      aad,
      dynamics
    }
  } = config

  await server.register({
    plugin: require('../'),
    options: {
      aad,
      dynamics,
      identityAppUrl,
      serviceId,
      cookiePassword,
      appDomain,
      clientId,
      clientSecret,
      defaultPolicy,
      defaultJourney,
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
            title: 'Woops, an error occurred',
            message: err.message
          })
        }
      }
    }
  })
  /** End auth plugin registration **/

  const staticFilePath = '/{param*}'

  // Refresh our token if it has expired
  server.ext('onPreAuth', async (request, h) => {
    // Don't check our credentials for requests for static files
    if (request.route.path !== staticFilePath) {
      const { idm } = request.server.methods

      const creds = await idm.getCredentials(request)

      if (creds && creds.isExpired()) {
        try {
          await idm.refreshToken(request)
        } catch (e) {
          console.error(e)
        }
      }
    }

    return h.continue
  })

  // Static assets
  await server.register(require('inert'))

  server.route(
    {
      method: 'GET',
      path: staticFilePath,
      options: {
        auth: false
      },
      handler: {
        directory: {
          path: path.join(__dirname, 'public')
        }
      }
    })

  // All other routes
  server.route([
    ...require('./routes/root'),
    ...require('./routes/account'),
    ...require('./routes/enrolment'),
    ...require('./routes/error')
  ])

  // Views
  await server.register(require('vision'))

  server.views({
    engines: {
      ejs: require('ejs')
    },
    relativeTo: __dirname,
    path: 'views'
  })
  await server.start()

  console.log('Server running at:', server.info.uri)

  return server
}

module.exports = start
