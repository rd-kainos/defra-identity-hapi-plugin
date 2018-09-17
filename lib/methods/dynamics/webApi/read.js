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
  const readContacts = async (query) => {
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
    const url = buildUrl('/contacts', params)

    const res = await requestPromise({
      method: 'GET',
      url,
      headers
    })
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
   * Fetches the company house ids for the passed organisation
   *
   * @param {Object<{organisationId: string|null}>} query
   * @return {Promise<Array>}
   */
  const readCompanyNumbers = async (query) => {
    const headers = await buildHeaders()
    let url
    if (query.organisationId) {
      url = buildUrl(`/defra_ids`, {
        '$filter': `_defra_customer_value eq ${query.organisationId} and defra_name eq 'Company Number'`
      })
    }
    const res = await requestPromise({
      method: 'GET',
      url,
      headers
    })
    const data = decodeResponse(res)
    if (!Array.isArray(data.value)) {
      throw Error('Read company number JSON is unrecognised')
    }
    // Return a custom data structure with key details
    return data.value.map(json => {
      return {
        id: json.defra_idid,
        value: json.defra_idvalue,
        organisationId: json._defra_customer_value
      }
    })
  }

  /**
   * Fetches all employers of the passed contact
   *
   * @param {string} contactId
   * @return {Promise<Array>}
   */
  const readContactsEmployerLinks = async (contactId) => {
    const params = {
      '$filter': `_record1id_value eq ${contactId} and _record1roleid_value eq ${mappings.roleId.employee}`
    }

    const url = buildUrl('/connections', params)
    const headers = await buildHeaders()

    const res = await requestPromise({
      method: 'GET',
      url,
      headers
    })

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
    const params = {}

    params['$filter'] = `_defra_lobservice_value eq ${serviceId}`

    const headers = await buildHeaders()
    const url = buildUrl(`/defra_lobserivceroles`, params)

    return requestPromise({
      method: 'GET',
      url,
      headers
    }).then(decodeResponse)
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

    return requestPromise({
      method: 'GET',
      url,
      headers
    }).then(decodeResponse)
  }

  return {
    readContacts,
    readContactIdFromB2cObjectId,
    readCompanyNumbers,
    readContactsEmployerLinks,
    readServiceRoles,
    readEnrolment
  }
}
