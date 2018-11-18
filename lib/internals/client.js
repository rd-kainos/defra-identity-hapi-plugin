const debug = require('debug')('defra.identity:internals:client')
const { Issuer } = require('openid-client')

Issuer.defaultHttpOptions = {
  timeout: 5000,
  retries: 2
}

module.exports = (
  {
    server,
    cache,
    config
  }) => {
  const e = {}
  const clients = {}

  e.getClient = async ({ policyName } = {}) => {
    const {
      clientId,
      clientSecret,
      defaultPolicy
    } = config

    if (!policyName && defaultPolicy) { policyName = defaultPolicy }

    debug(`client for ${policyName} requested`)

    if (!clients[policyName]) {
      debug(`${policyName} not found. Instantiating...`)

      debug('Instantiating issuer...')

      const issuerConfigAppend = policyName ? `?p=${policyName}` : ''

      const issuer = await Issuer.discover(`${config.identityAppUrl}/.well-known/openid-configuration${issuerConfigAppend}`)

      debug('Issuer instantiated')
      debug('Instantiating client...')

      const client = new issuer.Client({
        client_id: clientId,
        client_secret: clientSecret
      })

      client.CLOCK_TOLERANCE = 300

      debug('Client instantiated')

      clients[policyName] = client

      debug(`${policyName} client registered. There are a currently a total of %d clients registered`, Object.keys(clients).length)
    }

    return clients[policyName]
  }

  return e
}
