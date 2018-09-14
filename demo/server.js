const Hapi = require('hapi')
const path = require('path')
const Blipp = require('blipp')
const config = require('./config')
const _ = require('lodash')

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
      defaultJourney
    }
  } = config

  await server.register({
    plugin: require('../'),
    options: {
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
      try {
        await server.methods.idm.refreshToken(request, creds.tokenSet.refresh_token)
      } catch (e) {
        console.error(e)
      }
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
      let contactId

      const { enrolmentStatus, enrolmentType } = server.methods.idm.dynamics.getMappings()
      const claims = await server.methods.idm.getClaims(request)
      const creds = await server.methods.idm.getCredentials(request)

      const { sub: b2cObjectId } = claims

      // claims.roles = {}
      // claims.roleMappings = {}

      const parsedAuthzRoles = server.methods.idm.dynamics.parseAuthzRoles(claims)

      // Get our contact id from our b2c object id
      const contactRecords = await server.methods.idm.dynamics.readContacts({
        b2cObjectId
      })

      // If we found a contact record for this b2cObjectId, we can use that dynamics contact id
      if (contactRecords) {
        contactId = contactRecords[0].dynamicsContactId
      } else {
        throw Error(`Contact record not found for b2cobjectid ${b2cObjectId}`)
      }

      const serviceRoles = {
        leManager: {
          id: 'bfe1c82a-e09b-e811-a94f-000d3a3a8543',
          name: 'LE Manager'
        },
        leUser: {
          id: 'dea3a347-e09b-e811-a94f-000d3a3a8543',
          name: 'LE User'
        }
      }

      // We have no roles associated - create enrolments
      if (!parsedAuthzRoles) {
        // Get the accounts this contact has with the type of employer
        const contactEmployerLinks = await server.methods.idm.dynamics.readContactsEmployerLinks(contactId)

        // If this contact has no links to any employers, then stop. There is a problem
        if (!contactEmployerLinks) {
          throw new Error(`Contact record not linked to any accounts - b2cObjectId ${b2cObjectId}`)
        }

        // Enrol this user as a manager with the status of incomplete for all of this user's organisations
        const createEnrolmentPromiseArr = contactEmployerLinks.map(link => server.methods.idm.dynamics.createEnrolment(serviceRoles.leManager.id, contactId, link.accountId, link.connectionDetailsId, enrolmentStatus.incomplete, enrolmentType.other))

        await Promise.all(createEnrolmentPromiseArr)

        // Refresh our token with new roles
        await server.methods.idm.refreshToken(request, creds.tokenSet.refresh_token)
      } else {
        const { rolesByStatus } = parsedAuthzRoles

        const { [enrolmentStatus.pending]: pendingRoles } = rolesByStatus

        // If we have pending roles, update them to completeApproved
        if (pendingRoles) {
          // Need lobServiceUserLinkIds from current enrolments to update enrolments
          // Get all the ids of the roles with which we have a pending enrolment
          const pendingRoleIds = _.flatMap(pendingRoles, org => _.map(org.roles, role => role.id))

          // Get all our org ids with which we have a pending enrolment
          const pendingRoleOrgIds = _.map(pendingRoles, org => org.organisation.id)

          // Get details of our pending enrolments matching the above role ids and org ids
          const currentEnrolments = await server.methods.idm.dynamics.readEnrolment(contactId, pendingRoleIds, pendingRoleOrgIds)

          // Create an array of our enrolment
          const updateEnrolmentPromiseArr = currentEnrolments.value
            .map(currentEnrolment => server.methods.idm.dynamics.updateEnrolmentStatus(currentEnrolment.defra_lobserviceuserlinkid, enrolmentStatus.completeApproved))

          await Promise.all(updateEnrolmentPromiseArr)

          // Refresh our token with new roles
          await server.methods.idm.refreshToken(request, creds.tokenSet.refresh_token)
        }
      }

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
        message = `You need to be logged in to do that. <a href='${server.methods.idm.generateAuthenticationUrl(next)}'>Click here to log in or create an account</a>`
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
