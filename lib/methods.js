const Hoek = require('hoek')
const to = require('await-to-js').default
const _ = require('lodash')
const url = require('url')
const qs = require('querystring')
const debug = require('debug')('defra.identity:methods')
const uuidv4 = require('uuid/v4')

module.exports = ({
                    server,
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

    const cacheData = await cache.get(cacheKey)

    if (typeof cacheData === 'object')
      cacheData.__proto__.isExpired = function () {
        const nowTimestamp = ((new Date()).getTime()) / 1000

        return this.claims.exp < nowTimestamp
      }

    return cacheData
  })

  server.method('idm.getClaims', async (request) => {
    Hoek.assert(typeof request === 'object', 'request object must be passed to idm.getClaims')

    const credentials = await server.methods.idm.getCredentials(request)

    if (credentials)
      return credentials.claims

    return null
  })

  server.method('idm.generateAuthenticationUrl', (backToPath, {policyName, forceLogin = false, returnUrlObject = false} = {}) => {
    backToPath = backToPath || config.defaultBackToPath

    const outboundUrl = url.parse(config.appDomain)

    outboundUrl.pathname = config.outboundPath

    outboundUrl.query = {
      backToPath,
      policyName,
      forceLogin: forceLogin ? 'yes' : undefined
    }

    if (returnUrlObject)
      return outboundUrl

    return outboundUrl.format()
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

  server.method('idm.refreshToken', async (request, refreshToken, policyName) => {
    const client = await internals.client.getClient({policyName})

    const [authorizationErr, tokenSet] = await to(client.refresh(refreshToken))

    if (authorizationErr) {
      // @todo handle error
      console.error(authorizationErr)

      return false
    }

    internals.routes.storeTokenSetResponse(request, tokenSet)

    debug('refreshed and validated tokens %j', tokenSet)
    debug('refreshed id_token claims %j', tokenSet.claims)

    authorizationErr
  })

  server.method('idm.generateFinalOutboundRedirectUrl', async ({backToPath, policyName, forceLogin}, {stateUid = null, stateCacheData = {}} = {}) => {
    policyName = policyName || config.defaultPolicy
    stateUid = stateUid || uuidv4()

    if (forceLogin === 'yes')
      forceLogin = true

    stateCacheData = Hoek.applyToDefaults({
      policyName,
      forceLogin,
      backToPath
    }, stateCacheData)

    await cache.set(stateUid, stateCacheData)

    const client = await internals.client.getClient({policyName})

    let authorizationUrl = client.authorizationUrl({
      redirect_uri: config.returnUriFqdn,
      scope: 'openid offline_access',
      response_mode: 'form_post',
      state: stateUid
    })

    if (forceLogin) {
      const parsedAuthorizationUrl = url.parse(authorizationUrl)

      if (typeof parsedAuthorizationUrl.query === 'string')
        parsedAuthorizationUrl.query = qs.parse(parsedAuthorizationUrl.query)

      parsedAuthorizationUrl.query.prompt = 'login'

      delete parsedAuthorizationUrl.search

      authorizationUrl = parsedAuthorizationUrl.format()
    }

    return authorizationUrl
  })

  server.method('idm.getConfig', () => config)

  debug('Done registering server methods')
}