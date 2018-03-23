const debug = require('debug')('defra.identity:internals:routes')

module.exports = ({
                    server,
                    cache,
                    config
                  }) => {
  const e = {}

  e.storeTokenSetResponse = async (request, tokenSet) => {
    // @todo cache customisation
    try {
      await cache.set(tokenSet.claims.sub, {
        tokenSet,
        claims: tokenSet.claims
      })
    } catch (e) {
      console.error(e)
    }

    request.cookieAuth.set({
      sub: tokenSet.claims.sub
    })
  }

  e.handleAuthorisationError = async (request, h, authorisationErr, stateUid, savedState) => {
    const {error_description} = authorisationErr
    const resetPasswordErrorId = e.constants.B2C_RESET_PASSWORD_ERROR_ID
    const {resetPasswordPolicy} = config
    const {
      policyName,
      backToPath = config.defaultBackToPath,
    } = savedState

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

    return h.redirect(config.disallowedRedirectPath) // @todo attach error message to this
  }

  e.handleResetPasswordCompletion = async (request, h, stateUid, savedState) => {
    debug('User has completed their password reset - send them back to their original policy')

    const {
      forceLogin,
      backToPath = config.defaultBackToPath,
      policyPrePasswordReset
    } = savedState

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

    // We need to show a page confirming the user has changed their password
    // Without it or an equivalent the user just gets redirected back to their original policy with no confirmation

    // If we've been passed a custom callback to show a nice page after the user has reset their password, just return the outcome of that
    if (config.resetPasswordConfirmation) {
      const resetPasswordConfirmationCbOutcome = config.resetPasswordConfirmation(request, h, originalPolicyOutboundUrl)

      if (resetPasswordConfirmationCbOutcome)
        return resetPasswordConfirmationCbOutcome
    }

    // Otherwise just display a simple page
    return h.response(`
        Your password has been successfully reset.<br/>
        <a href="${originalPolicyOutboundUrl}">Click here to log in</a>
        `)
  }

  e.handleValidatedToken = async (request, h, stateUid, savedState, tokenSet) => {
    const {
      backToPath = config.defaultBackToPath,
      policyPrePasswordReset
    } = savedState

    const {resetPasswordPolicy} = config

    const {claims} = tokenSet
    const trustFrameworkPolicy = claims.tfp.toLowerCase()

    /** Handle reset password completion **/
    // If this user has just come back to us after going through the password reset policy, and we have a previous policy
    // store against them, then send them back to their original policy
    if (trustFrameworkPolicy === resetPasswordPolicy && policyPrePasswordReset) {
      return internals.routes.handleResetPasswordCompletion(request, h)
    }

    debug('received and validated tokens %j', tokenSet)
    debug('validated id_token claims %j', tokenSet.claims)

    // Get rid of the cache entry containing our state details
    // We don't need it anymore now that authentication has been fulfilled
    await cache.drop(stateUid)

    // Store our token set response in our cache, with a reference to it in a cookie
    // @todo use the state uid to reference this cache entry - exposes sub id in its current guise
    await e.storeTokenSetResponse(request, tokenSet)

    if (config.preReturnUriRedirectOutcome) {
      // Execute the callback passed into this plugin before redirecting
      const preReturnUriRedirectCbOutcome = await config.callbacks.preReturnUriRedirect(request, h, tokenSet, backToPath)

      // If callback returned truey, it could be a redirect or response - return this instead of redirecting
      if (preReturnUriRedirectCbOutcome)
        return preReturnUriRedirectCbOutcome
    }

    // Workaround for chrome bug whereby cookies won't get set when a 302 redirect is returned
    // https://github.com/hapijs/hapi-auth-cookie/issues/159
    // https://bugs.chromium.org/p/chromium/issues/detail?id=696204
    return h.response(
      `<script>setTimeout(function(){` +
      `window.location = "${backToPath}";` +
      `}, 1000)</script>` +
      `Please wait...`
    )
  }

  return e
}