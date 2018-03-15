const {URL} = require('url')
const authCookie = require('hapi-auth-cookie')
const Issuer = require('openid-client').Issuer
const Hoek = require('hoek')
const _ = require('lodash')
const to = require('await-to-js').default
const debug = require('debug')('defra.identity:index')
const qs = require('querystring')

const routes = require('./routes')
const methods = require('./methods')
const Internals = require('./internals')
const configDefaults = require('./configDefaults')

// const Boom = require('boom')

const setConfig = options => {
  debug('Setting config')

  const {
    tenantId,
    cookiePassword,
    clientId,
    clientSecret,
    appDomain,
    disallowedRedirectPath,
    loginOnDisallow,
    defaultPolicy,
    preReturnUriRedirectFunc
  } = options

  Hoek.assert(!!cookiePassword && cookiePassword.length === 32, 'cookiePassword must be supplied as a 32 character string')
  Hoek.assert(!!tenantId, 'tenantId must be supplied')
  Hoek.assert(!!clientId, 'clientId must be supplied')
  Hoek.assert(!!clientSecret, 'clientSecret must be supplied')
  Hoek.assert(!!appDomain, 'appDomain must be supplied')
  Hoek.assert(typeof disallowedRedirectPath === 'string' || !disallowedRedirectPath, 'disallowedRedirectPath must be a path of string type or falsey')
  Hoek.assert(!loginOnDisallow || (loginOnDisallow && defaultPolicy), 'defaultPolicy must be specified when passing true for loginOnDisallow')
  Hoek.assert(!preReturnUriRedirectFunc || (preReturnUriRedirectFunc && typeof preReturnUriRedirectFunc !== 'function'), 'preReturnUriRedirectFunc must be falsey or an async function')

  const config = Hoek.applyToDefaults(configDefaults, options)

  const redirectUri = new URL(appDomain)

  redirectUri.pathname = config.returnUri

  config.returnUriFqdn = redirectUri.toString()

  debug('Config set')

  return config
}

module.exports = {
  name: 'idm',
  version: '0.0.1',
  register: async function (server, options) {
    debug('Auth plugin register called')

    const config = setConfig(options)

    const {
      tenantId,
      clientId,
      clientSecret,
      cacheSegment,
      cacheTtlMs,
      cookiePassword,
      cookieName,
      disallowedRedirectPath,
      loginOnDisallow,
      isSecure,
      defaultPolicy,
      onByDefault
    } = config

    const endpointAppend = defaultPolicy ? `?p=${defaultPolicy}` : ''
    debug('Instantiating issuer...')


    // Initialise b2c
    // https://login.microsoftonline.com/dcidmdev.onmicrosoft.com/v2.0/.well-known/openid-configuration?p=b2c_1_sign_in
    const issuer = new Issuer({
      issuer: `https://login.microsoftonline.com/${b2cTenantGuid}/v2.0/`,
      authorization_endpoint: `https://login.microsoftonline.com/${b2cTenantGuid}/oauth2/v2.0/authorize${endpointAppend}`,
      token_endpoint: `https://login.microsoftonline.com/${b2cTenantGuid}/oauth2/v2.0/token${endpointAppend}`,
      end_session_endpoint: `https://login.microsoftonline.com/${b2cTenantGuid}/oauth2/v2.0/logout${endpointAppend}`,
      jwks_uri: `https://login.microsoftonline.com/${b2cTenantGuid}/discovery/v2.0/keys${endpointAppend}`,

      // userinfo_endpoint: undefined, // Microsoft does not provide this - need to use graph api instead afaik
    })

    debug('Issuer instantiated')
    debug('Instantiating client...')

    const client = new issuer.Client({
      client_id: clientId,
      client_secret: clientSecret,
      token_endpoint_auth_method: 'client_secret_post',
      token_endpoint_auth_signing_alg: 'RS256',
    })

    debug('Client instantiated')

    // Initialise cache
    let cache

    if (options.cache) {
      debug('Cache object passed in, using that')

      cache = options.cache
    } else {
      debug('No cache object specified, using in memory cache with segment %s', cacheSegment)

      cache = server.cache(
        {
          segment: cacheSegment,
          expiresIn: cacheTtlMs
        }
      )
    }

    //Register internal methods
    const internals = Internals({
      server,
      client,
      cache,
      config
    })

    //Register server methods
    methods({
      server,
      client,
      cache,
      config,
      internals
    })

    debug('Registering hapi-auth-cookie...')

    // Register cookie plugin
    await server.register(authCookie)

    server.auth.strategy('idm', 'cookie', {
      password: cookiePassword,
      cookie: cookieName,
      redirectOnTry: false,
      appendNext: true,
      isSecure,
      redirectTo: (request) => {
        const {path} = request

        let redirectTo

        if (loginOnDisallow) {
          redirectTo = server.methods.idm.generateAuthenticationUrl(path)
        } else {
          redirectTo = disallowedRedirectPath

          redirectTo += '?' + qs.stringify({
            notLoggedInErr: 'yes'
          })
        }

        return redirectTo
      },
      validateFunc: async (request, session) => {
        // Retrieve from session store
        const credentials = await server.methods.idm.getCredentials(request)

        return {
          valid: !!credentials,
          credentials
        }
      }
    })

    debug('Done egistering hapi-auth-cookie')

    if (onByDefault) {
      debug('onByDefault is true - setting default auth method')

      server.auth.default('idm')
    } else {
      debug('onByDefault is false - not setting default auth method')
    }

    // Register routes
    routes({
      server,
      client,
      cache,
      config,
      internals
    })

    debug('Auth plugin successfully registered')
  }
}
