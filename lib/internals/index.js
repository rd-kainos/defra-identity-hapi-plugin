const debug = require('debug')('defra.identity:internals')

const constants = require('../constants')

module.exports = ({
                    server,
                    cache,
                    config
                  }) => {

  debug('Registering internals...')

  const internals = {
    constants,
    client: require('./client')({
      server,
      cache,
      config
    }),
    routes: require('./routes')({
      server,
      cache,
      config
    })
  }

  debug('Done registering internals')

  return internals
}