const debug = require('debug')('defra.identity:internals:routes')
const url = require('url')

module.exports = (
  {
    server,
    cache,
    config,
    constants
  }) => {
  const e = {}

  e.storeTokenSetResponse = async (request, tokenSet) => {
    await cache.set(tokenSet.claims.sub, {
      tokenSet,
      claims: tokenSet.claims
    }, undefined, request)

    request.cookieAuth.set({
      sub: tokenSet.claims.sub
    })
  }

  e.handleAuthorisationError = async (request, h, savedState, authorisationErr) => {
    const { message: errorMessage, error_description: errorDescription } = authorisationErr

    let {
      disallowedRedirectPath
    } = savedState

    if (!disallowedRedirectPath) {
      disallowedRedirectPath = config.disallowedRedirectPath
    }

    const errorRedirectPath = url.parse(disallowedRedirectPath)

    errorRedirectPath.query = {
      errorMessage,
      errorDescription
    }

    debug({ authorisationErr })

    return h.redirect(errorRedirectPath.format())
  }

  e.handleValidatedToken = async (request, h, state, savedState, tokenSet) => {
    const {
      defaultBackToPath,
      appDomain
    } = config

    const {
      backToPath = defaultBackToPath
    } = savedState

    debug('received and validated tokens %j', tokenSet)
    debug('validated id_token claims %j', tokenSet.claims)

    // Get rid of the cache entry containing our state details
    // We don't need it anymore now that authentication has been fulfilled
    await cache.drop(state, request)

    // Store our token set response in our cache, with a reference to it in a cookie
    // @todo use the state uid to reference this cache entry - exposes sub id in its current guise
    await e.storeTokenSetResponse(request, tokenSet)

    if (config.callbacks.preReturnPathRedirect) {
      // Execute the callback passed into this plugin before redirecting
      const preReturnPathRedirectCbOutcome = await config.callbacks.preReturnPathRedirect(request, h, tokenSet, backToPath)

      // If callback returned truey, it could be a redirect or response - return this instead of redirecting
      if (preReturnPathRedirectCbOutcome) { return preReturnPathRedirectCbOutcome }
    }

    const parsedBackToPath = backToPath.startsWith('http') ? url.parse(backToPath).pathname : backToPath

    const fqBackToPathUrlObj = url.parse(appDomain)

    fqBackToPathUrlObj.pathname = parsedBackToPath

    const fqBackToPathString = url.format(fqBackToPathUrlObj)

    // Workaround for chrome bug whereby cookies won't set a cookie when a 302 redirect is returned
    // https://github.com/hapijs/hapi-auth-cookie/issues/159
    // https://bugs.chromium.org/p/chromium/issues/detail?id=696204
    return h.response(
      `<input id="backToPath" type="hidden" value="${fqBackToPathString}" />
      <script type="application/javascript" src="${config.postAuthenticationRedirectJsPath}"></script>
      <noscript>
        <a href="${fqBackToPathString}">Please click here to continue</a>
      </noscript>`
    )
  }

  return e
}
