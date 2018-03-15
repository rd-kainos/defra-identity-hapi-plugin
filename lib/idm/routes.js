// const Boom = require('boom')
const to = require('await-to-js').default
const uuidv4 = require('uuid/v4')
const debug = require('debug')('defra.identity:routes')

module.exports = ({
                    server,
                    client,
                    cache,
                    config,
                    internals
                  }) => {
  debug('Registering routes...')

  server.route({
    method: 'GET',
    path: config.outboundPath,
    config: {
      auth: {
        strategy: 'idm',
        mode: 'try'
      },
      plugins: {
        'hapi-auth-cookie': {
          redirectTo: false
        }
      }
    },
    handler: async (request, h) => {
      const stateUid = uuidv4()
      const {query = {}} = request
      const {backToPath} = query
      let {forceLogin} = query

      if (forceLogin === 'yes')
        forceLogin = true

      const stateCacheData = {
        forceLogin,
        backToPath
      }

      await cache.set(stateUid, stateCacheData)

      let url = client.authorizationUrl({
        redirect_uri: config.returnUriFqdn,
        scope: 'openid offline_access',
        response_mode: 'form_post',
        state: stateUid
      })

      if (forceLogin) {
        url = new URL(url)

        url.searchParams.append('prompt', 'login')

        url = url.toString()
      }

      return h.redirect(url)
    }
  })

  server.route({
    method: 'POST',
    path: config.returnUri,
    config: {
      auth: {
        strategy: 'idm',
        mode: 'try'
      },
      plugins: {
        'hapi-auth-cookie': {
          redirectTo: false
        }
      }
    },
    handler: async (request, h) => {
      const {payload} = request

      const {state: stateUid} = payload

      const [savedStateErr, savedState] = await to(cache.get(stateUid))

      if (!savedState || savedStateErr) {
        console.error(savedStateErr)

        return h.redirect(config.disallowedRedirectPath) // @todo attach error message to this
      }

      const [authorizationErr, tokenSet] = await to(client.authorizationCallback(config.returnUriFqdn, request.payload, {state: stateUid}))

      if (authorizationErr) {
        console.error(authorizationErr)

        return h.redirect(config.disallowedRedirectPath) // @todo attach error message to this
      }

      debug('received and validated tokens %j', tokenSet)
      debug('validated id_token claims %j', tokenSet.claims)

      await internals.storeTokenSetResponse(request, tokenSet)

      const backToPath = savedState.backToPath || config.defaultBackToPath

      await config.preReturnUriRedirectFunc(request, tokenSet)

      // Workaround for chrome bug whereby cookies won't get set when a 302 redirect is returned
      // https://github.com/hapijs/hapi-auth-cookie/issues/159
      // https://bugs.chromium.org/p/chromium/issues/detail?id=696204
      return h.response(
        `<script>setTimeout(function(){` +
        `window.location = "${backToPath}";` +
        `}, 1000)</script>` +
        `Please wait...`
      )
    },
  })

  server.route({
    method: 'GET',
    path: '/logout',
    config: {
      auth: {
        strategy: 'idm',
        mode: 'try'
      },
      plugins: {
        'hapi-auth-cookie': {
          redirectTo: false
        }
      }
    },
    handler: async (request, h) => {
      await server.methods.idm.logout(request)

      const {query} = request
      const redirPath = query.backToPath || '/'

      return h.redirect(redirPath)
    }
  })

  debug('Done registering routes')
}