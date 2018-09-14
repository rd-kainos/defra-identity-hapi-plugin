const _ = require('lodash')
const debug = require('debug')('defra.identity:methods:dynamics')

// const customApi = require('./customApi')
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
    // ...customApi.apply(null, arguments),
    ...webApi({
      server,
      cache,
      config,
      internals
    })
  }

  /**
   *
   * @param {string} contactId dynamics contact guid
   * @param {string} organisationAccountId dynamics account guid
   * @param {string} connectionId dynamics connection guid of the employee>employer relationship between the contact and organisation
   * @return {Promise<T | Object>}
   */
  // const createServiceEnrolment = async (contactId, organisationAccountId, connectionId) => {
  //   const { administrator } = mappings.identityServiceRoles
  //   const { pending, completeApproved } = mappings.enrolmentStatus
  //   const dynamicsToken = await internals.dynamics.getToken()
  //
  //   const { _defra_connectiondetailsid_value: connectionDetailsId } = await dynamics.readConnectionDetails(dynamicsToken, connectionId)
  //
  //   const { defra_lobserviceuserlinkid: lobServiceUserLinkId } = await dynamics.createEnrolment(dynamicsToken, administrator, contactId, organisationAccountId, connectionDetailsId, pending, mappings.enrolmentType.other)
  //
  //   await dynamics.updateEnrolmentStatus(dynamicsToken, lobServiceUserLinkId, completeApproved)
  //
  //   return lobServiceUserLinkId
  // }

  server.method('idm.dynamics.getMappings', () => mappings)
  server.method('idm.dynamics.getToken', internals.dynamics.getToken)
  server.method('idm.dynamics.parseAuthzRoles', internals.dynamics.parseAuthzRoles)

  _.each(methods, (method, methodName) => server.method(`idm.dynamics.${methodName}`, method))
}
