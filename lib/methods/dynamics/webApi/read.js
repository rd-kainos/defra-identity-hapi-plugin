const debug = require('debug')('defra.identity:methods:dynamics:webApi')

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
   * Fetches a user's contact id from their b2cObjectId
   *
   * @param {string} b2cObjectId
   * @return {Promise<String>}
   */
  const readContactIdFromB2cObjectId = async (b2cObjectId) => {
    const contactRecords = await readContacts({
      b2cObjectId
    })

    if (contactRecords) {
      return contactRecords[0].dynamicsContactId
    } else {
      return null
    }
  }

  /**
   * Fetches all employers of the passed contact
   *
   * @param {string} contactId
   * @return {Promise<Array>}
   */
  const readContactsEmployerLinks = async (contactId) => {
    const request = await readContactsEmployerLinks.buildRequest(contactId)

    const res = await requestPromise(request)

    return readContactsEmployerLinks.parseResponse(res, contactId)
  }

  readContactsEmployerLinks.buildRequest = async (contactId) => {
    const params = {
      '$filter': `_record1id_value eq ${contactId} and _record1roleid_value eq ${mappings.roleId.employee}`
    }

    const url = buildUrl('/connections', params)
    const headers = await buildHeaders()

    return {
      method: 'GET',
      url,
      headers
    }
  }

  readContactsEmployerLinks.parseResponse = (res, contactId) => {
    const data = decodeResponse(res)

    if (!Array.isArray(data.value)) {
      throw new Error('readContactsEmployerLinks response has unrecognised JSON')
    }

    if (!data || !data.value) {
      return
    }

    const links = data.value.map(link => {
      const accountId = link._record1id_value === contactId ? link._record2id_value : link._record1id_value

      return {
        connectionDetailsId: link._defra_connectiondetailsid_value,
        accountId
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

  readServiceRoles.buildRequest = async (serviceId) => {
    const params = {}

    params['$filter'] = `_defra_lobservice_value eq ${serviceId}`

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
   * @param {string} contactId
   * @param {Array|null} serviceRoleIds
   * @param {Array|null} accountIds
   * @return {Promise<Object>}
   */
  const readEnrolment = async (contactId, serviceRoleIds = null, accountIds = null) => {
    const request = await readEnrolment.buildRequest(contactId, serviceRoleIds, accountIds)

    return requestPromise(request).then(decodeResponse)
  }

  readEnrolment.buildRequest = async (contactId, serviceRoleIds = null, accountIds = null) => {
    const params = {}

    params['$filter'] = `_defra_serviceuser_value eq ${contactId}`

    if (serviceRoleIds) {
      params['$filter'] += ` and (`
      params['$filter'] += serviceRoleIds.map(id => `_defra_servicerole_value eq ${id}`).join(' or ')
      params['$filter'] += ')'
    }

    if (accountIds) {
      params['$filter'] += ` and (`
      params['$filter'] += accountIds.map(id => `_defra_organisation_value eq ${id}`).join(' or ')
      params['$filter'] += ')'
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
   * @param {string} b2cObjectId
   * @return {Promise<{roles: Array, mappings: Array}>}
   */
  const readServiceEnrolment = async (serviceId, b2cObjectId) => {
    const [
      { value: serviceRoles } = {},
      contact
    ] = await Promise.all([
      readServiceRoles(serviceId),
      readContacts({ b2cObjectId })
    ])

    const { dynamicsContactId: contactId } = contact[0]

    if (!contact || !contact.length) {
      throw Error(`Contact record not found for b2cobjectid ${b2cObjectId}`)
    }

    const enrolment = await readEnrolment(contactId, serviceRoles.map(role => role.defra_lobserivceroleid))

    return readServiceEnrolment.parseResponse(enrolment)
  }

  readServiceEnrolment.parseResponse = (enrolment) => {
    const response = {
      roles: [],
      mappings: []
    }

    enrolment.value.forEach(enrol => {
      response.roles.push(`${enrol._defra_organisation_value}:${enrol._defra_servicerole_value}:${enrol.defra_enrolmentstatus}`)

      response.mappings.push(`${enrol._defra_organisation_value}:${enrol['_defra_organisation_value@OData.Community.Display.V1.FormattedValue']}`)
      response.mappings.push(`${enrol._defra_servicerole_value}:${enrol['_defra_servicerole_value@OData.Community.Display.V1.FormattedValue']}`)
      response.mappings.push(`${enrol.defra_enrolmentstatus}:${enrol['defra_enrolmentstatus@OData.Community.Display.V1.FormattedValue']}`)
    })

    return response
  }

  return {
    readContacts,
    readContactIdFromB2cObjectId,
    readContactsEmployerLinks,
    readServiceRoles,
    readEnrolment,
    readServiceEnrolment
  }
}
