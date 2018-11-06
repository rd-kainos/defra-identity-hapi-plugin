const to = require('await-to-js').default
const debug = require('debug')('defra.identity:routes')

module.exports = (
  {
    server,
    cache,
    config,
    internals
  }) => {
  debug('Registering routes...')

  server.route({
    method: 'GET',
    path: config.outboundPath,
    config: {
      auth: false
    },
    handler: async (request, h) => {
      try {
        const outboundUrl = await server.methods.idm.generateOutboundRedirectUrl(request.query)

        return h.redirect(outboundUrl)
      } catch (e) {
        debug({ e })

        return config.callbacks.onError(e, request, h)
      }
    }
  })

  server.route({
    method: 'POST',
    path: config.redirectUri,
    config: {
      auth: false
    },
    handler: async (request, h) => {
      try {
        const { payload } = request

        /** Get our saved state **/
        const { state } = payload

        const [savedStateErr, savedState] = await to(cache.get(state))

        if (!savedState || savedStateErr) {
          const savedStateErrObj = savedStateErr || {}
          const savedStateObj = savedState || {}

          if (!savedStateErr && !savedState) {
            savedStateErrObj.message = 'No saved state found'
          }

          return internals.routes.handleAuthorisationError(request, h, savedStateObj, savedStateErrObj)
        }

        const { policyName } = savedState

        const client = await internals.client.getClient({ policyName })

        const authRedirectUriFqdn = config.authRedirectUriFqdn || config.redirectUriFqdn

        /** Exchange code for token and validate token **/
        debug('About to fetch token')
        const [authorizationErr, tokenSet] = await to(client.authorizationCallback(authRedirectUriFqdn, request.payload, { state }))
        debug('Finished fetching token')

        /** Handle authorisation error **/
        if (authorizationErr) {
          debug({ authorizationErr })

          return internals.routes.handleAuthorisationError(request, h, savedState, authorizationErr)
        }

        return internals.routes.handleValidatedToken(request, h, state, savedState, tokenSet)
      } catch (e) {
        debug({ e })

        return config.callbacks.onError(e, request, h)
      }
    }
  })

  if (config.logoutPath) {
    server.route({
      method: 'GET',
      path: config.logoutPath,
      config: {
        auth: false
      },
      handler: async (request, h) => {
        try {
          if (config.callbacks.preLogout) {
            // Execute the callback passed into this plugin before continuing
            const preLogoutOutcome = await config.callbacks.preLogout(request, h)

            // If callback returned anything other than undefined return this instead of redirecting
            if (preLogoutOutcome !== undefined) {
              return preLogoutOutcome
            }
          }

          await server.methods.idm.logout(request)

          const { query } = request
          const redirPath = query.backToPath || '/'

          return h.redirect(redirPath)
        } catch (e) {
          debug({ e })

          return config.callbacks.onError(e, request, h)
        }
      }
    })
  }

  debug('Done registering routes')
}
