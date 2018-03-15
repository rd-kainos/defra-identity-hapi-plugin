const Hoek = require('hoek')
const to = require('await-to-js').default
const _ = require('lodash')
const {URL} = require('url')
const debug = require('debug')('defra.identity:methods')

module.exports = ({
                    server,
                    client,
                    cache,
                    config,
                    internals
                  }) => {
  debug('Registering server methods...')

  server.method('idm.getCredentials', async (request) => {
    Hoek.assert(typeof request === 'object', 'request object must be passed to idm.getCredentials')

    const cacheKey = _.get(request, ['state', config.cookieName, 'sub'])

    if (!cacheKey)
      return false

    const [credentialsErr, credentials] = await to(cache.get(cacheKey))

    if (credentialsErr) {
      // @todo handle error
      console.error(credentialsErr)

      return false
    }

    return credentials
  })

  server.method('idm.getClaims', async (request) => {
    Hoek.assert(typeof request === 'object', 'request object must be passed to idm.getClaims')

    const credentials = await server.methods.idm.getCredentials(request)

    if (credentials)
      return credentials.claims

    return null
  })

  server.method('idm.generateAuthenticationUrl', (backToPath, {policy, forceLogin = false} = {}) => {
    // @todo what to do if a new policy is supplied
    backToPath = backToPath || config.defaultBackToPath

    const outboundUrl = new URL(config.appDomain)

    outboundUrl.pathname = config.outboundPath

    outboundUrl.searchParams.append('backToPath', backToPath)

    if (forceLogin)
      outboundUrl.searchParams.append('forceLogin', 'yes')

    return outboundUrl.toString()
  })

  server.method('idm.logout', async (request) => {
    Hoek.assert(typeof request === 'object', 'request object must be passed to idm.logout')

    // @todo make sure this works
    // @todo Is cache drop async?
    const cacheKey = _.get(request, ['state', config.cookieName, 'sub'])

    if (cacheKey)
      await cache.drop(cacheKey)

    request.cookieAuth.clear()
  })

  server.method('idm.refreshToken', async (request, refreshToken) => {
    const [authorizationErr, tokenSet] = await to(client.refresh(refreshToken))

    if (authorizationErr) {
      // @todo handle error
      console.error(authorizationErr)

      return false
    }

    internals.storeTokenSetResponse(request, tokenSet)

    debug('refreshed and validated tokens %j', tokenSet)
    debug('refreshed id_token claims %j', tokenSet.claims)

    authorizationErr
  })

  debug('Done registering server methods')
}