const debug = require('debug')('defra.identity:methods:dynamics:webApi:create')

module.exports = (
  {
    server,
    cache,
    config,
    internals
  }) => {
  debug('Registering dynamics create methods...')

  const {
    requestPromise,
    buildHeaders,
    buildUrl,
    decodeResponse
  } = internals.dynamics

  /**
   * Creates an enrolment between a service and a contact, for the passed organisation and role
   *
   * @param {string} lobServiceRoleId dynamics line of business service role guid
   * @param {string} contactId dynamics contact guid
   * @param {string} organisationAccountId dynamics organisation account guid
   * @param {string} connectionDetailsId dynamics connection detail guid
   * @param {string} enrolmentStatus dynamics enrolment status id - mappings.enrolmentStatus
   * @param {string} enrolmentType dynamics enrolment type string - mappings.enrolmentType
   * @return {Promise<T | Object>}
   */
  const createEnrolment = async (lobServiceRoleId, contactId, organisationAccountId, connectionDetailsId, enrolmentStatus, enrolmentType) => {
    const payload = {
      ServiceRoleRef: {
        '@odata.type': 'Microsoft.Dynamics.CRM.defra_lobserivcerole', // @todo update typo when dynamics table name has been fixed
        defra_lobserivceroleid: lobServiceRoleId
      },
      ContactRef: {
        '@odata.type': 'Microsoft.Dynamics.CRM.contact',
        contactid: contactId
      },
      ConnectionDetailRef: {
        '@odata.type': 'Microsoft.Dynamics.CRM.defra_connectiondetails',
        defra_connectiondetailsid: connectionDetailsId
      },
      EnrolmentStatus: enrolmentStatus,
      EnrolmentType: enrolmentType
    }

    if (organisationAccountId) {
      payload.OrganisationRef = {
        '@odata.type': 'Microsoft.Dynamics.CRM.account',
        accountid: organisationAccountId
      }
    }

    const headers = await buildHeaders()
    const url = buildUrl('/defra_createenrolment')

    return requestPromise({
      method: 'POST',
      url,
      headers,
      body: payload,
      json: true
    }).then(decodeResponse)
  }

  return {
    createEnrolment
  }
}
