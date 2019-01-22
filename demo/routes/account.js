module.exports = [
  {
    method: 'GET',
    path: '/account',
    options: {
      auth: false
    },
    handler: async function (request, h) {
      const { idm } = request.server.methods

      return h.view('account', {
        title: 'account',
        user: null,
        idm,
        claims: await idm.getClaims(request),
        credentials: await idm.getCredentials(request),
        trulyPrivate: false
      })
    }
  },
  {
    method: 'GET',
    path: '/account-private',
    options: {
      auth: 'idm'
    },
    handler: async function (request, h) {
      const { idm } = request.server.methods

      return h.view('account', {
        title: 'account-private',
        user: null,
        idm,
        claims: await idm.getClaims(request),
        credentials: await idm.getCredentials(request),
        trulyPrivate: true
      })
    }
  }
]
