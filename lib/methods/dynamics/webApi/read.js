const debug = require('debug')('defra.identity:methods:dynamics:webApi')

/**
 * Anonymous factory method to create and return methods to access Dynamics
 * @param  {Object} server     [description]
 * @param  {Object} cache      [description]
 * @param  {Object} config     [description]
 * @param  {Object} internals  [description]
 * @return {Object<Function>}  An object of functions
 */
module.exports = (
  {
    server,
    cache,
    config,
    internals
  }) => {
  debug('Registering dynamics read methods...')

  const {
    decodeResponse,
    requestPromise,
    buildHeaders,
    buildUrl,
    parseOptionalInteger,
    mappings
  } = internals.dynamics

  /**
   * Queries dynamics for contacts matching the passed parameters
   *
   * @param {Object<{email: string|null, b2cObjectId: string|null}>} query
   * @return {Promise<{sub: *, dynamicsContactId: (string|string), firstName: (*|string), lastName: (*|string), email: (string), telephoneNumber: (string), mobileNumber: (string), termsAcceptedVersion: *, termsAcceptedOn}[]>}
   */
  const readContacts = async function (query) {
    const request = await readContacts.buildRequest(query)

    const res = await requestPromise(request)

    return readContacts.parseResponse(res)
  }

  readContacts.buildRequest = async function (query) {
    const headers = await buildHeaders()
    const params = {}

    if (query.email) {
      // If plain string, then do a match
      if (typeof query.email === 'string') {
        params['$filter'] = `emailaddress1 eq '${query.email}'`
      } else if (typeof query.email === 'object') {
        // A more complex query using e.g. endswith
        const { type, value } = query.email
        if (type === 'endswith') {
          params['$filter'] = `endswith(emailaddress1,'${value}')`
        }
      } else {
        throw Error('Unrecognised parameter used for email when reading an organisation')
      }
    } else if (query.b2cObjectId) {
      params['$filter'] = `defra_b2cobjectid eq '${query.b2cObjectId}'`
    }

    return {
      method: 'GET',
      url: buildUrl('/contacts', params),
      headers
    }
  }

  readContacts.parseResponse = function (res) {
    let data = decodeResponse(res)
    data = Array.isArray(data.value) ? data.value : [data]
    // Put into databuckets
    const databuckets = data.map(d => {
      debug('readContact response')
      debug('%O', d)
      return {
        sub: d.defra_b2cobjectid,
        dynamicsContactId: d.contactid,
        firstName: d.firstname,
        lastName: d.lastname,
        email: d.emailaddress1,
        telephoneNumber: d.telephone1, // @fixme This may be the mobile number if this is the only number supplied
        mobileNumber: d.telephone1,
        termsAcceptedVersion: parseOptionalInteger(d.defra_tacsacceptedversion),
        termsAcceptedOn: mappings.dateTimeStringToDate(d.defra_tacsacceptedon)
      }
    })

    return databuckets
  }

  /**
   * Fetches all citizen links of the passed contact
   *
   * @param {string} contactId
   * @param {string|Array|undefined} [accountIds]
   * @param {string|Array|undefined} [roleIds]
   * @return {Promise<Array>}
   */
  const readContactsAccountLinks = async (contactId, accountIds = undefined, roleIds = undefined) => {
    const request = await readContactsAccountLinks.buildRequest(contactId, accountIds, roleIds)

    const res = await requestPromise(request)

    return readContactsAccountLinks.parseResponse(res)
  }

  readContactsAccountLinks.buildRequest = async (contactId, accountIds, roleIds) => {
    const params = {
      '$filter': `_record1id_value eq ${contactId}`
    }

    if (roleIds) {
      roleIds = [].concat(roleIds)
    } else {
      roleIds = [
        mappings.roleId.citizen,
        mappings.roleId.employee,
        mappings.roleId.agentCustomer
      ]
    }

    params.$filter += ` and ( ${roleIds.map(roleId => `_record1roleid_value eq ${roleId}`).join(' or ')} ) `

    if (accountIds) {
      accountIds = [].concat(accountIds)

      params.$filter += ` and ( ${accountIds.map(accountId => `_record2id_value eq ${accountId}`).join(' or ')} ) `
    }

    const url = buildUrl('/connections', params)
    const headers = await buildHeaders()

    return {
      method: 'GET',
      url,
      headers
    }
  }

  readContactsAccountLinks.parseResponse = (res) => {
    const data = decodeResponse(res)

    if (!Array.isArray(data.value)) {
      throw new Error('readContactsAccountLinks response has unrecognised JSON')
    }

    if (!data || !data.value) {
      return
    }

    const links = data.value.map(link => {
      return {
        connectionId: link.connectionid,
        connectionDetailsId: link._defra_connectiondetailsid_value,
        accountId: link._record2id_value,
        roleId: link._record1roleid_value
      }
    })

    return links
  }

  /**
   * Fetches all roles that can be assigned to a user for the passed servie
   *
   * @param {string} serviceId
   * @return {Promise<Object>}
   */
  const readServiceRoles = async (serviceId) => {
    const request = await readServiceRoles.buildRequest(serviceId)

    return requestPromise(request).then(decodeResponse)
  }

  /**
   * Build request object for /defra_lobserivceroles API endpoint
   * @param  {Array<String>|String}  serviceId A service ID or array of service IDs
   * @return {Promise}               A Promise to call the endpoint
   */
  readServiceRoles.buildRequest = async (serviceId) => {
    const params = {}
    const paramParts = [].concat(serviceId)

    params['$filter'] = paramParts.map(x => `_defra_lobservice_value eq ${x}`).join(' or ')

    const headers = await buildHeaders()
    const url = buildUrl(`/defra_lobserivceroles`, params)

    return {
      method: 'GET',
      url,
      headers
    }
  }

  /**
   * Fetches all enrolment records for the passed contact. Takes optional parameters for defining the roles and accountIds to filter by
   *
   * @param {Array|String} contactIds
   * @param {Array|null} serviceRoleIds
   * @param {Array|null} accountIds
   * @param {Array|null} serviceUserLinkIds
   * @return {Promise<Object>}
   */
  const readEnrolment = async (contactIds, serviceRoleIds = null, accountIds = null, serviceUserLinkIds = null) => {
    const request = await readEnrolment.buildRequest(contactIds, serviceRoleIds, accountIds, serviceUserLinkIds)

    return requestPromise(request).then(decodeResponse)
  }

  readEnrolment.buildRequest = async (contactIds, serviceRoleIds = null, accountIds = null, serviceUserLinkIds = null) => {
    if (typeof contactIds === 'string') {
      contactIds = [contactIds]
    }

    if (typeof serviceRoleIds === 'string') {
      serviceRoleIds = [serviceRoleIds]
    }

    if (typeof accountIds === 'string') {
      accountIds = [accountIds]
    }

    if (typeof serviceUserLinkIds === 'string') {
      serviceUserLinkIds = [serviceUserLinkIds]
    }

    const filterArr = [
      `( ${contactIds.map(id => `_defra_serviceuser_value eq ${id}`).join(' or ')} )`,
      `statuscode eq ${mappings.serviceUserLinkStatusCode.active}`
    ]

    if (serviceRoleIds) {
      filterArr.push(`( ${serviceRoleIds.map(id => `_defra_servicerole_value eq ${id}`).join(' or ')} )`)
    }

    if (accountIds) {
      filterArr.push(`( ${accountIds.map(id => `_defra_organisation_value eq ${id}`).join(' or ')} )`)
    }

    if (serviceUserLinkIds) {
      filterArr.push(`( ${serviceUserLinkIds.map(id => `defra_lobserviceuserlinkid eq ${id}`).join(' or ')} )`)
    }

    const params = {
      $filter: filterArr.join(' and '),
      $expand: 'defra_ServiceRole'
    }

    const headers = await buildHeaders()
    const url = buildUrl(`/defra_lobserviceuserlinks`, params)

    return {
      method: 'GET',
      url,
      headers
    }
  }

  /**
   *
   * @param {string} serviceId
   * @param {string} contactId
   * @return {Promise<{roles: Array, mappings: Array}>}
   */
  const readServiceEnrolment = async (serviceId, contactId) => {
    const serviceRoles = await readServiceRoles(serviceId)

    if (!serviceRoles || !Array.isArray(serviceRoles.value)) {
      return readServiceEnrolment.parseResponse(null)
    }

    const enrolment = await readEnrolment(contactId, serviceRoles.value.map(role => role.defra_lobserivceroleid))

    return readServiceEnrolment.parseResponse(enrolment)
  }

  readServiceEnrolment.parseResponse = (enrolment) => {
    const response = {
      roles: [],
      mappings: []
    }

    if (enrolment && Array.isArray(enrolment.value)) {
      enrolment.value.forEach(enrol => {
        const orgId = enrol._defra_organisation_value || ''
        const orgName = enrol['_defra_organisation_value@OData.Community.Display.V1.FormattedValue'] || ''

        const serviceRoleId = enrol._defra_servicerole_value
        const serviceRoleName = enrol['_defra_servicerole_value@OData.Community.Display.V1.FormattedValue']

        const enrolmentStatusId = enrol.defra_enrolmentstatus
        const enrolmentStatusName = enrol['defra_enrolmentstatus@OData.Community.Display.V1.FormattedValue']

        response.roles.push(`${orgId}:${serviceRoleId}:${enrolmentStatusId}`)

        response.mappings.push(`${orgId}:${orgName}`)
        response.mappings.push(`${serviceRoleId}:${serviceRoleName}`)
        response.mappings.push(`${enrolmentStatusId}:${enrolmentStatusName}`)
      })
    }

    return response
  }

  return {
    readContacts,
    readContactsAccountLinks,
    readServiceRoles,
    readEnrolment,
    readServiceEnrolment
  }
}
