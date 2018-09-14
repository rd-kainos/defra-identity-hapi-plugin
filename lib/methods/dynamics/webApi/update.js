const debug = require('debug')('defra.identity:methods:dynamics:webApi:update')

module.exports = (
  {
    server,
    cache,
    config,
    internals
  }) => {
  debug('Registering dynamics update methods...')

  const {
    decodeResponse,
    requestPromise,
    buildHeaders,
    buildUrl
  } = internals.dynamics

  const updateEnrolmentStatus = async (lobServiceUserLinkId, newEnrolmentStatus) => {
    const payload = {
      UpdateEnrolmentStatus: newEnrolmentStatus
    }

    const headers = await buildHeaders()
    const url = buildUrl(`/defra_lobserviceuserlinks(${lobServiceUserLinkId})/Microsoft.Dynamics.CRM.defra_updateenrolment`)

    return requestPromise({
      method: 'POST',
      url,
      headers,
      body: payload,
      json: true
    }).then(decodeResponse)
  }

  return {
    updateEnrolmentStatus
  }
}
