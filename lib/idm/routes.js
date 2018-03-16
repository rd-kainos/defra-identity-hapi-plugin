const to = require('await-to-js').default
const debug = require('debug')('defra.identity:routes')
const _ = require('lodash')

module.exports = ({
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
      const outboundUrl = await server.methods.idm.generateFinalOutboundRedirectUrl(request.query)

      return h.redirect(outboundUrl)
    }
  })

  server.route({
    method: 'POST',
    path: config.returnUri,
    config: {
      auth: false
    },
    handler: async (request, h) => {
      const {payload} = request

      const {state: stateUid} = payload

      const [savedStateErr, savedState] = await to(cache.get(stateUid))

      if (!savedState || savedStateErr) {
        console.error(savedStateErr)

        return h.redirect(config.disallowedRedirectPath) // @todo attach error message to this
      }

      const {
        policyName,
        forceLogin,
        backToPath = config.defaultBackToPath,
        policyPrePasswordReset
      } = savedState

      const {resetPasswordPolicy} = config

      const client = await internals.getClient({policyName})

      const [authorizationErr, tokenSet] = await to(client.authorizationCallback(config.returnUriFqdn, request.payload, {state: stateUid}))

      if (authorizationErr) {
        const {error_description} = authorizationErr
        const resetPasswordErrorId = internals.constants.B2C_RESET_PASSWORD_ERROR_ID

        if (error_description && error_description.substring(0, resetPasswordErrorId.length) === resetPasswordErrorId) {
          debug('User has forgotten their password. Redirecting them to reset password policy...')

          const resetPasswordAuthenticationUrlObj = server.methods.idm.generateAuthenticationUrl(backToPath, {
            policyName: resetPasswordPolicy,
            returnUrlObject: true
          })

          const resetPasswordOutboundUrl = await server.methods.idm.generateFinalOutboundRedirectUrl(resetPasswordAuthenticationUrlObj.query, {
            stateUid,
            stateCacheData: {
              policyPrePasswordReset: policyName
            }
          })

          return h.redirect(resetPasswordOutboundUrl)
        }

        console.error(authorizationErr)

        return h.redirect(config.disallowedRedirectPath) // @todo attach error message to this
      }

      const {claims} = tokenSet
      const trustFrameworkPolicy = claims.tfp.toLowerCase()

      // If this user has just come back to us after going through the password reset policy, and we have a previous policy
      // store against them, then send them back to their original policy
      if (trustFrameworkPolicy === resetPasswordPolicy && policyPrePasswordReset) {
        debug('User has completed their password reset - send them back to their original policy')

        const originalPolicyAuthenticationUrlObj = server.methods.idm.generateAuthenticationUrl(backToPath, {
          forceLogin,
          policyName: policyPrePasswordReset,
          returnUrlObject: true
        })

        const originalPolicyOutboundUrl = await server.methods.idm.generateFinalOutboundRedirectUrl(originalPolicyAuthenticationUrlObj.query, {
          stateUid,
          stateCacheData: {
            policyPrePasswordReset: null
          }
        })

        // @todo decide how we're going to handle this page
        // Without it or an equivalent the user just gets redirected back to their original policy with no confirmation
        return h.response(`
        Your password has been successfully reset.<br/>
        <a href="${originalPolicyOutboundUrl}">Click here to log in</a>
        `)
      }

      debug('received and validated tokens %j', tokenSet)
      debug('validated id_token claims %j', tokenSet.claims)

      // Get rid of the cache entry containing our state details
      // We don't need it anymore now that authentication has been fulfilled
      await cache.drop(stateUid)

      // Store our token set response in our cache, with a reference to it in a cookie
      // @todo use the state uid to maybe reference this cache entry - exposes sub id in it's current guise
      await internals.storeTokenSetResponse(request, tokenSet)

      // Execute the callback passed into this plugin before redirecting
      // @todo Is this actually necessary?
      const [preReturnUriRedirectError, preReturnUriRedirectOutcome] = await to(config.callbacks.preReturnUriRedirect(request, tokenSet))

      // If callback returned truey, it could be a redirect or response - return this instead of redirecting
      if (preReturnUriRedirectOutcome)
        return preReturnUriRedirectOutcome

      // Workaround for chrome bug whereby cookies won't get set when a 302 redirect is returned
      // https://github.com/hapijs/hapi-auth-cookie/issues/159
      // https://bugs.chromium.org/p/chromium/issues/detail?id=696204
      return h.response(
        `<script>setTimeout(function(){` +
        `window.location = "${backToPath}";` +
        `}, 1000)</script>` +
        `Please wait...`
      )
    },
  })

  server.route({
    method: 'GET',
    path: '/logout',
    config: {
      auth: false
    },
    handler: async (request, h) => {
      await server.methods.idm.logout(request)

      const {query} = request
      const redirPath = query.backToPath || '/'

      return h.redirect(redirPath)
    }
  })

  debug('Done registering routes')
}