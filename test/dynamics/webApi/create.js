const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', 'demo', '.env') })

const Lab = require('lab')
const Code = require('code')
const lab = exports.lab = Lab.script()

const { describe, it } = lab
const { expect } = Code

const Server = require('../../server')

describe('Dynamics - create', async () => {
  let server
  let idm
  let dynamicsRoot

  // Get instance of server before each test
  lab.before(async () => {
    server = await Server()

    idm = server.methods.idm

    const idmConfig = idm.getConfig()

    dynamicsRoot = idmConfig.dynamics.resourceUrl + idmConfig.dynamics.endpointBase
  })

  describe('Create enrolment', async () => {
    it('should build correct request using required parameters', async () => {
      const { createEnrolment, getToken, getMappings } = idm.dynamics

      const { enrolmentStatus, enrolmentType } = getMappings()
      const token = await getToken()

      const request = await createEnrolment.buildRequest('a20e6efe-9954-4c5b-a76c-83a5518a1385', 'b20e6efe-9954-4c5b-a76c-83a5518a1385', null, 'd20e6efe-9954-4c5b-a76c-83a5518a1385', enrolmentStatus.pending, enrolmentType.other)

      const expectedRequestObj = {
        'method': 'POST',
        'url': `${dynamicsRoot}/defra_createenrolment`,
        'headers': {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json; charset=utf-8',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Prefer': 'odata.maxpagesize=500, odata.include-annotations="*"'
        },
        'body': {
          'ServiceRoleRef': {
            '@odata.type': 'Microsoft.Dynamics.CRM.defra_lobserivcerole',
            'defra_lobserivceroleid': 'a20e6efe-9954-4c5b-a76c-83a5518a1385'
          },
          'ContactRef': {
            '@odata.type': 'Microsoft.Dynamics.CRM.contact',
            'contactid': 'b20e6efe-9954-4c5b-a76c-83a5518a1385'
          },
          'ConnectionDetailRef': {
            '@odata.type': 'Microsoft.Dynamics.CRM.defra_connectiondetails',
            'defra_connectiondetailsid': 'd20e6efe-9954-4c5b-a76c-83a5518a1385'
          },
          'EnrolmentStatus': 2,
          'EnrolmentType': 'OTHER'
        },
        'json': true
      }

      expect(request).to.equal(expectedRequestObj)
    })

    it('should build correct request using required parameters and organisation account id', async () => {
      const { createEnrolment, getToken, getMappings } = idm.dynamics

      const { enrolmentStatus, enrolmentType } = getMappings()
      const token = await getToken()

      const request = await createEnrolment.buildRequest('a20e6efe-9954-4c5b-a76c-83a5518a1385', 'b20e6efe-9954-4c5b-a76c-83a5518a1385', 'c20e6efe-9954-4c5b-a76c-83a5518a1385', 'd20e6efe-9954-4c5b-a76c-83a5518a1385', enrolmentStatus.pending, enrolmentType.other)

      const expectedRequestObj = {
        'method': 'POST',
        'url': `${dynamicsRoot}/defra_createenrolment`,
        'headers': {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json; charset=utf-8',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Prefer': 'odata.maxpagesize=500, odata.include-annotations="*"'
        },
        'body': {
          'ServiceRoleRef': {
            '@odata.type': 'Microsoft.Dynamics.CRM.defra_lobserivcerole',
            'defra_lobserivceroleid': 'a20e6efe-9954-4c5b-a76c-83a5518a1385'
          },
          'ContactRef': {
            '@odata.type': 'Microsoft.Dynamics.CRM.contact',
            'contactid': 'b20e6efe-9954-4c5b-a76c-83a5518a1385'
          },
          'ConnectionDetailRef': {
            '@odata.type': 'Microsoft.Dynamics.CRM.defra_connectiondetails',
            'defra_connectiondetailsid': 'd20e6efe-9954-4c5b-a76c-83a5518a1385'
          },
          'EnrolmentStatus': 2,
          'EnrolmentType': 'OTHER',
          'OrganisationRef': {
            '@odata.type': 'Microsoft.Dynamics.CRM.account',
            'accountid': 'c20e6efe-9954-4c5b-a76c-83a5518a1385'
          }
        },
        'json': true
      }

      expect(request).to.equal(expectedRequestObj)
    })
  })
})
