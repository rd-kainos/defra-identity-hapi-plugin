const _ = require('lodash')
const debug = require('debug')('defra.identity:methods:dynamics')

const webApi = require('./webApi')
const mappings = require('../../internals/mappings')

module.exports = (
  {
    server,
    cache,
    config,
    internals
  }) => {
  debug('Registering dynamics server methods...')

  const methods = {
    ...webApi({
      server,
      cache,
      config,
      internals
    })
  }

  server.method('idm.dynamics.getMappings', () => mappings)
  server.method('idm.dynamics.getToken', internals.dynamics.getToken)
  server.method('idm.dynamics.parseAuthzRoles', internals.dynamics.parseAuthzRoles)

  _.each(methods, (method, methodName) => server.method(`idm.dynamics.${methodName}`, method))
}
