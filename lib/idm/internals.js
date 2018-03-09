module.exports = ({
                    server,
                    client,
                    cache,
                    config
                  }) => {

  const e = {}

  e.storeTokenSetResponse = async (request, tokenSet) => {
    // @todo cache customisation
    await cache.set(tokenSet.claims.oid, {
      tokenSet,
      claims: tokenSet.claims
    })

    request.cookieAuth.set({
      oid: tokenSet.claims.oid
    })
  }

  return e
}