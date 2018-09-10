// const request = require('request')
// const requestPromise = util.promisify(request)

// const _buildBaseRequestConfig = (method, endpoint, token, payload) => {
//   // API requires that the payload objects are sent as stringified
//   // JSON embedded in another JSON object
//   const wrappedPayload = {
//     'request': JSON.stringify(payload)
//   }
//   const url = config.dynamics.resourceUrl +
//     config.dynamics.endpointBase +
//     endpoint
//   return {
//     method,
//     url,
//     auth: {
//       bearer: token
//     },
//     headers: {
//       'Accept': 'application/json',
//       'Content-Length': JSON.stringify(wrappedPayload).length
//     },
//     json: true,
//     body: wrappedPayload
//   }
// }
//
// const _decodeResponse = (res) => {
//   // First check the HTTP response
//   if (!_.inRange(res.statusCode, 200, 300)) {
//     throw error.UnexpectedResponse(res.statusMessage)
//       .withStatusCode(res.statusCode)
//   }
//   // Then check the API response, first unwrap the JSON
//   const decodedPayload = JSON.parse(res.body.response)
//   if (!_.inRange(decodedPayload.code, 200, 300)) {
//     const msg = _.get(decodedPayload, 'data.error.detail', false) || decodedPayload.message
//     if (decodedPayload.statusCode === 412) {
//       throw new error.AlreadyExists(msg)
//     } else {
//       // Throw a more general error
//       throw new error.UnexpectedResponse(msg)
//         .withStatusCode(decodedPayload.statusCode)
//     }
//   }
//   return decodedPayload.data
// }

module.exports = (
  {
    server,
    cache,
    config,
    internals
  }) => {
  // debug('Registering server methods...')

}
