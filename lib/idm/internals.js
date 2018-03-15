const Issuer = require('openid-client').Issuer
const debug = require('debug')('defra.identity:internals')

const constants = require('./constants')

module.exports = ({
                    server,
                    // clients,
                    cache,
                    config
                  }) => {

  debug('Registering internals...')

  const e = {
    constants
  }

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

  const clients = {}

  e.getClient = async ({policyName}) => {
    const {
      clientId,
      clientSecret,
      tenantId,
      defaultPolicy
    } = config

    debug(`${policyName} policy requested`)

    if (!policyName && defaultPolicy)
      policyName = defaultPolicy

    if (!clients[policyName]) {
      debug(`${policyName} not found. Instantiating...`)

      debug('Instantiating issuer...')

      const endpointAppend = policyName ? `?p=${policyName}` : ''

      // Initialise b2c
      // https://login.microsoftonline.com/dcidmdev.onmicrosoft.com/v2.0/.well-known/openid-configuration?p=b2c_1_b2c-webapp-signup-signin

      const issuer = new Issuer({
        issuer: `https://login.microsoftonline.com/${tenantId}/v2.0/`,
        authorization_endpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize${endpointAppend}`,
        token_endpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token${endpointAppend}`,
        end_session_endpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout${endpointAppend}`,
        jwks_uri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys${endpointAppend}`,

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

      client.CLOCK_TOLERANCE = 5 // to allow a 5 second skew

      debug('Client instantiated')

      clients[policyName] = client

      debug(`${policyName} client registered. There are a currently a total of %d clients registered`, Object.keys(clients).length)
    }

    return clients[policyName]
  }

  // e.authorizationCallback = (redirectUri, parameters, checks) => {
  //   // const params = _.pick(parameters, CALLBACK_PROPERTIES);
  //   const params = parameters
  //   const toCheck = checks || {}
  //
  //   // if (this.default_max_age && !toCheck.max_age) toCheck.max_age = this.default_max_age;
  //
  //   // if (toCheck.state !== parameters.state) {
  //   //   return Promise.reject(new Error('state mismatch'));
  //   // }
  //   //
  //   // if (params.error) {
  //   //   return Promise.reject(new OpenIdConnectError(params));
  //   // }
  //
  //   let promise
  //
  //   // if (params.id_token) {
  //   //   promise = Promise.resolve(new TokenSet(params))
  //   //     .then(tokenset => this.decryptIdToken(tokenset))
  //   //     .then(tokenset => this.validateIdToken(tokenset, toCheck.nonce, 'authorization', toCheck.max_age, toCheck.state));
  //   // }
  //
  //   const grantCall = () => client.grant({
  //     grant_type: 'authorization_code',
  //     code: params.code,
  //     redirect_uri: redirectUri,
  //     code_verifier: toCheck.code_verifier,
  //     state: toCheck.state,
  //   })
  //     .then(tokenset => client.decryptIdToken(tokenset))
  //     .then(tokenset => client.validateIdToken(tokenset, toCheck.nonce, 'token', toCheck.max_age))
  //     .then((tokenset) => {
  //       if (params.session_state) tokenset.session_state = params.session_state
  //       return tokenset
  //     })
  //
  //   return grantCall()
  // }

  debug('Done registering internals')

  return e
}