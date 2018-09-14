const debug = require('debug')('defra.identity:methods:dynamics:webApi')
const _ = require('lodash')

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
   * Returns an array of organisations in databucket format
   * @param {object} query
   */
  const readOrganisations = async (query) => {
    const headers = await buildHeaders()
    let params = {}
    let url
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
      url = buildUrl('/accounts', params)
    } else if (query.id) {
      url = buildUrl(`/accounts(${query.id})`)
    }
    let res = await requestPromise({
      method: 'GET',
      url,
      headers
    })
    let json = decodeResponse(res)
    // Always return an array of results
    const data = Array.isArray(json.value) ? json.value : [json]

    // Put into databuckets
    const databuckets = data.map(async d => {
      const organisationId = d.accountid
      // Need to retrieve company number which is in a separate table
      const companyNumbers = await readCompanyNumbers({ organisationId })
      const companyNumber = companyNumbers.length > 0 ? companyNumbers[0].value : undefined
      debug('readOrganisation response')
      debug('%O', d)
      return {
        // Strictly this is not a databucket value but we need to get the organisation ID
        dynamicsOrganisationId: organisationId,
        companyName: d.name,
        businessType: parseOptionalInteger(d.defra_type),
        companyEmailAddress: d.emailaddress1, // @fixme Does this actually get put into a separate adressdetails entity?
        companyTelephoneNumber: d.telephone1, // @fixme Does this actually get put into a separate adressdetails entity?
        companyNumber
        // @todo: Subsidiary/hierarchylevel conversion data.defra_hierarchylevel
      }
    })
    return Promise.all(databuckets)
  }

  /**
   * Get an array of data structures containing the id, type and relationships of other parties linked to a contact
   * Builds data into this form ...
   *
   * [
   *   {
   *     'type': 'organisation'
   *     'id': '',
   *     'relationships': [
   *       employeeEmployer,
   *       sro
   *     ]
   *   },
   *   ...
   * ]
   *
   * @param {string} contactId GUID that identifies the main contact from which the links are associated
   */
  const readContactOrganisationLinks = async (contactId) => {
    const params = {}
    // We don't know until we look at the data, if the contact is record 1
    // or record2, so query for both posibilities
    params['$filter'] = `_record1id_value eq ${contactId} or  _record2id_value eq ${contactId}`
    params['$expand'] = `record1roleid($select=name),record2roleid($select=name)`
    const url = buildUrl('/connections', params)
    const headers = await buildHeaders()
    const res = await requestPromise({
      method: 'GET',
      url,
      headers
    })
    const data = decodeResponse(res)
    if (!Array.isArray(data.value)) {
      throw new Error('readRelationship response has unrecognised JSON')
    }

    const outputData = data.value.reduce((prev, json) => {
      // Gather some data into manageable structures ...
      const record1 = {
        connectionid: json.connectionid,
        name: json.name,
        type: mappings.resolveRecordType(json['_record1id_value@Microsoft.Dynamics.CRM.lookuplogicalname']),
        id: json._record1id_value,
        roleName: json.record1roleid ? json.record1roleid.name : undefined
      }
      const record2 = {
        connectionid: json.connectionid,
        name: json.name,
        type: mappings.resolveRecordType(json['_record2id_value@Microsoft.Dynamics.CRM.lookuplogicalname']),
        id: json._record2id_value,
        roleName: json.record2roleid ? json.record2roleid.name : undefined
      }
      // Need to determine which record (1 or 2) is the contact that was passed in (mainContact).
      // Note that some relationships are contact <-> contact so we cannot use recordX.type === 'contact'
      const [mainContactRecord, otherRecord] = (record1.id === contactId) ? [record1, record2] : [record2, record1]
      const relationship = mappings.resolveRelationship(mainContactRecord.roleName, otherRecord.roleName)
      // ... we are only interested if we have a defined relationship
      if (relationship) {
        // Check if the other record already has an entry in the structure,
        const existingOtherRecord = prev.filter(d => d.id === otherRecord.id)[0]
        if (existingOtherRecord) {
          // ... push if there is not entry for this registration already
          if (!_.includes(existingOtherRecord.relationships, relationship)) {
            existingOtherRecord.relationships.push(relationship)
          }
        } else {
          // ... otherwise create a new entry
          prev.push({
            id: otherRecord.id,
            type: otherRecord.type,
            relationships: [relationship]
          })
        }
      }
      return prev
    }, [])

    return outputData
  }

  const readContactsEmployerLinks = async (contactId) => {
    const params = {
      '$filter': `(_record1id_value eq ${contactId} and _record1roleid_value eq ${mappings.roleId.employee}) or (_record2id_value eq ${contactId} and _record2roleid_value eq ${mappings.roleId.employee})`
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
        // accountId: link[`_record${oneOrTwo}roleid_value`],
        accountId
      }
    })

    return links
  }

  const readConnectionDetails = async (connectionId) => {
    const headers = await buildHeaders()
    const url = buildUrl(`/connections(${connectionId})`)

    return requestPromise({
      method: 'GET',
      url,
      headers
    }).then(decodeResponse)
  }

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
   *
   * @param {string} contactId
   * @param {Array|null} serviceRoleIds
   * @param {Array|null} accountIds
   * @return {Promise<Array>}
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

  /**
   *
   * @param {string} serviceId
   * @param {string} b2cObjectId
   * @return {Promise<{roles: Array, mappings: Array}>}
   */
  const readServiceEnrolment = async (serviceId, b2cObjectId) => {
    const response = {
      roles: [],
      mappings: []
    }

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
    readOrganisations,
    readCompanyNumbers,
    readContactOrganisationLinks,
    readContactsEmployerLinks,
    readConnectionDetails,
    readServiceRoles,
    readEnrolment,
    readServiceEnrolment
  }
}
