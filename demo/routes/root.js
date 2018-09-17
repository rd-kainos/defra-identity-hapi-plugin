module.exports = [
  {
    method: 'GET',
    path: '/',
    options: {
      auth: false
    },
    handler: async function (request, h) {
      const { idm } = request.server.methods

      const creds = await idm.getCredentials(request)

      if (creds && creds.isExpired()) {
        await idm.refreshToken(request)
      }

      return h.view('index', {
        user: null,
        idm,
        claims: await idm.getClaims(request)
      })
    }
  }]
