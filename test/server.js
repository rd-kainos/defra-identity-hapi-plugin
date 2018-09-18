const Server = require('../demo/server')

let server

module.exports = async () => {
  if (server) {
    return server
  }

  server = await Server()

  return server
}
