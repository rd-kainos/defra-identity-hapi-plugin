const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', 'demo', '.env') })

const Lab = require('lab')
const Code = require('code')
const lab = exports.lab = Lab.script()

const { describe, it } = lab
const { expect } = Code

const Server = require('../../server')

describe('Dynamics - read', async () => {
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

  describe('Read contact', async () => {
    it('should build correct read contact request using email', async () => {
      const { readContacts, getToken } = idm.dynamics

      const token = await getToken()

      const request = await readContacts.buildRequest({
        email: 'cheese@biscuits',
        b2cObjectId: 'c20e6efe-9954-4c5b-a76c-83a5518a1385'
      })

      const expectedRequestObj = {
        'method': 'GET',
        'url': `${dynamicsRoot}/contacts?%24filter=emailaddress1%20eq%20'cheese%40biscuits'`,
        'headers': {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json; charset=utf-8',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Prefer': 'odata.maxpagesize=500, odata.include-annotations="*"'
        }
      }

      expect(request).to.equal(expectedRequestObj)
    })

    it('should build correct read contact request using b2cobjectid', async () => {
      const { readContacts, getToken } = idm.dynamics

      const token = await getToken()

      const request = await readContacts.buildRequest({
        b2cObjectId: 'c20e6efe-9954-4c5b-a76c-83a5518a1385'
      })

      const expectedRequestObj = {
        'method': 'GET',
        'url': `${dynamicsRoot}/contacts?%24filter=defra_b2cobjectid%20eq%20'c20e6efe-9954-4c5b-a76c-83a5518a1385'`,
        'headers': {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json; charset=utf-8',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Prefer': 'odata.maxpagesize=500, odata.include-annotations="*"'
        }
      }

      expect(request).to.equal(expectedRequestObj)
    })

    it('should parse response correctly', async () => {
      const { readContacts } = idm.dynamics

      const apiResponse = {
        'statusCode': 200,
        'body': JSON.stringify({
          '@odata.context': 'https://defra-custmstr-idev.api.crm4.dynamics.com/api/data/v9.0/$metadata#contacts',
          '@Microsoft.Dynamics.CRM.totalrecordcount': -1,
          '@Microsoft.Dynamics.CRM.totalrecordcountlimitexceeded': false,
          'value': [
            {
              '@odata.etag': 'W/"1072301"',
              'customertypecode@OData.Community.Display.V1.FormattedValue': 'Default Value',
              'customertypecode': 1,
              'address2_addresstypecode@OData.Community.Display.V1.FormattedValue': 'Default Value',
              'address2_addresstypecode': 1,
              'merged@OData.Community.Display.V1.FormattedValue': 'No',
              'merged': false,
              'territorycode@OData.Community.Display.V1.FormattedValue': 'Default Value',
              'territorycode': 1,
              'emailaddress1': 'test@test.com',
              'haschildrencode@OData.Community.Display.V1.FormattedValue': 'Default Value',
              'haschildrencode': 1,
              'preferredappointmenttimecode@OData.Community.Display.V1.FormattedValue': 'Morning',
              'preferredappointmenttimecode': 1,
              'isbackofficecustomer@OData.Community.Display.V1.FormattedValue': 'No',
              'isbackofficecustomer': false,
              'modifiedon@OData.Community.Display.V1.FormattedValue': '17/09/2018 10:35',
              'modifiedon': '2018-09-17T10:35:11Z',
              'lastname': '123',
              'donotpostalmail@OData.Community.Display.V1.FormattedValue': 'Allow',
              'donotpostalmail': false,
              'marketingonly@OData.Community.Display.V1.FormattedValue': 'No',
              'marketingonly': false,
              'donotphone@OData.Community.Display.V1.FormattedValue': 'Allow',
              'donotphone': false,
              'preferredcontactmethodcode@OData.Community.Display.V1.FormattedValue': 'Any',
              'preferredcontactmethodcode': 1,
              'educationcode@OData.Community.Display.V1.FormattedValue': 'Default Value',
              'educationcode': 1,
              '_ownerid_value@OData.Community.Display.V1.FormattedValue': 'Customer-Master-CM-OWNER',
              '_ownerid_value@Microsoft.Dynamics.CRM.associatednavigationproperty': 'ownerid',
              '_ownerid_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'team',
              '_ownerid_value': '7d14cfc9-92a8-e811-a953-000d3a39c345',
              'customersizecode@OData.Community.Display.V1.FormattedValue': 'Default Value',
              'customersizecode': 1,
              'firstname': '123',
              'yomifullname': '123 123',
              'donotemail@OData.Community.Display.V1.FormattedValue': 'Allow',
              'donotemail': false,
              'address2_shippingmethodcode@OData.Community.Display.V1.FormattedValue': 'Default Value',
              'address2_shippingmethodcode': 1,
              'fullname': '123 123',
              'timezoneruleversionnumber@OData.Community.Display.V1.FormattedValue': '4',
              'timezoneruleversionnumber': 4,
              'address1_addressid': '9de8bfe5-540b-496d-a46c-205af0bb88a7',
              'msdyn_gdproptout@OData.Community.Display.V1.FormattedValue': 'No',
              'msdyn_gdproptout': false,
              'address2_freighttermscode@OData.Community.Display.V1.FormattedValue': 'Default Value',
              'address2_freighttermscode': 1,
              'statuscode@OData.Community.Display.V1.FormattedValue': 'Active',
              'statuscode': 1,
              'createdon@OData.Community.Display.V1.FormattedValue': '17/09/2018 10:35',
              'createdon': '2018-09-17T10:35:11Z',
              'donotsendmm@OData.Community.Display.V1.FormattedValue': 'Send',
              'donotsendmm': false,
              'donotfax@OData.Community.Display.V1.FormattedValue': 'Allow',
              'donotfax': false,
              'defra_b2cobjectid': 'c20e6efe-9954-4c5b-a76c-83a5518a1385',
              'leadsourcecode@OData.Community.Display.V1.FormattedValue': 'Default Value',
              'leadsourcecode': 1,
              'versionnumber@OData.Community.Display.V1.FormattedValue': '1,072,301',
              'versionnumber': 1072301,
              'followemail@OData.Community.Display.V1.FormattedValue': 'Allow',
              'followemail': true,
              'creditonhold@OData.Community.Display.V1.FormattedValue': 'No',
              'creditonhold': false,
              'telephone1': '123',
              'address3_addressid': 'f04ec4cd-7bef-4954-8ef9-14145eb650ea',
              'donotbulkemail@OData.Community.Display.V1.FormattedValue': 'Allow',
              'donotbulkemail': false,
              '_modifiedby_value@OData.Community.Display.V1.FormattedValue': '',
              '_modifiedby_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'systemuser',
              '_modifiedby_value': '33e7f90e-8c0a-48cd-a280-9794362c3fae',
              'shippingmethodcode@OData.Community.Display.V1.FormattedValue': 'Default Value',
              'shippingmethodcode': 1,
              '_createdby_value@OData.Community.Display.V1.FormattedValue': 'SA-DEFRA-CM-DEV ID-APP-REG-S2S',
              '_createdby_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'systemuser',
              '_createdby_value': 'f47bfb22-eaa9-e811-a951-000d3a29ba60',
              'donotbulkpostalmail@OData.Community.Display.V1.FormattedValue': 'No',
              'donotbulkpostalmail': false,
              'defra_tacsacceptedversion': '12',
              'defra_tacsacceptedon@OData.Community.Display.V1.FormattedValue': '17/09/2018 10:34',
              'defra_tacsacceptedon': '2018-09-17T10:34:00Z',
              'contactid': '830e8f56-65ba-e811-a954-000d3a29be4a',
              '_modifiedonbehalfby_value@OData.Community.Display.V1.FormattedValue': 'SA-DEFRA-CM-DEV ID-APP-REG-S2S',
              '_modifiedonbehalfby_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'systemuser',
              '_modifiedonbehalfby_value': 'f47bfb22-eaa9-e811-a951-000d3a29ba60',
              'defra_uniquereference': 'CID-000000001993',
              '_owningteam_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'team',
              '_owningteam_value': '7d14cfc9-92a8-e811-a953-000d3a39c345',
              'participatesinworkflow@OData.Community.Display.V1.FormattedValue': 'No',
              'participatesinworkflow': false,
              'statecode@OData.Community.Display.V1.FormattedValue': 'Active',
              'statecode': 0,
              '_owningbusinessunit_value@Microsoft.Dynamics.CRM.associatednavigationproperty': 'owningbusinessunit',
              '_owningbusinessunit_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'businessunit',
              '_owningbusinessunit_value': '3b9007e4-9e9d-e811-a877-000d3ab17f9f',
              'address2_addressid': 'fb8f71bb-adba-410d-9e83-bd9fd0db0be1',
              'spousesname': null,
              'emailaddress3': null,
              'address3_telephone3': null,
              'mobilephone': null,
              'utcconversiontimezonecode': null,
              '_preferredserviceid_value': null,
              'address3_shippingmethodcode': null,
              'address3_postalcode': null,
              'annualincome': null,
              'fax': null,
              'telephone3': null,
              'address1_primarycontactname': null,
              'address3_city': null,
              'lastonholdtime': null,
              'address2_stateorprovince': null,
              'address2_line1': null,
              'assistantphone': null,
              'lastusedincampaign': null,
              'address3_freighttermscode': null,
              'pager': null,
              'employeeid': null,
              'address1_latitude': null,
              '_parentcustomerid_value': null,
              'managername': null,
              'birthdate': null,
              'address1_name': null,
              'department': null,
              'address3_country': null,
              'address2_telephone1': null,
              'address2_primarycontactname': null,
              'address2_latitude': null,
              'address2_postalcode': null,
              'entityimage_timestamp': null,
              '_originatingleadid_value': null,
              '_owninguser_value': null,
              '_masterid_value': null,
              '_createdonbehalfby_value': null,
              'address3_postofficebox': null,
              'subscriptionid': null,
              'business2': null,
              'address3_county': null,
              'address1_freighttermscode': null,
              'address3_addresstypecode': null,
              'address1_longitude': null,
              'address1_addresstypecode': null,
              'aging90_base': null,
              'address3_primarycontactname': null,
              'familystatuscode': null,
              'home2': null,
              'address2_utcoffset': null,
              'aging60': null,
              'defra_title': null,
              'address1_composite': null,
              'yomimiddlename': null,
              'jobtitle': null,
              'address3_utcoffset': null,
              'address1_telephone3': null,
              'importsequencenumber': null,
              'gendercode': null,
              'address2_line2': null,
              'creditlimit_base': null,
              'address3_line1': null,
              'address1_county': null,
              '_createdbyexternalparty_value': null,
              'entityimageid': null,
              'processid': null,
              'address1_telephone2': null,
              'description': null,
              'address1_fax': null,
              'address3_line2': null,
              'externaluseridentifier': null,
              'aging30_base': null,
              'callback': null,
              'emailaddress2': null,
              'address2_line3': null,
              'managerphone': null,
              'preferredappointmentdaycode': null,
              'websiteurl': null,
              'exchangerate': null,
              'address1_telephone1': null,
              'address3_composite': null,
              'address3_fax': null,
              'childrensnames': null,
              'numberofchildren': null,
              'address2_postofficebox': null,
              'aging90': null,
              'address1_city': null,
              'address3_latitude': null,
              'aging60_base': null,
              '_transactioncurrencyid_value': null,
              'entityimage': null,
              '_modifiedbyexternalparty_value': null,
              'paymenttermscode': null,
              'address3_name': null,
              'ftpsiteurl': null,
              'address1_shippingmethodcode': null,
              '_preferredsystemuserid_value': null,
              'address2_telephone2': null,
              '_slainvokedid_value': null,
              'address3_telephone1': null,
              'nickname': null,
              'address1_postofficebox': null,
              '_preferredequipmentid_value': null,
              'assistantname': null,
              'address2_country': null,
              '_accountid_value': null,
              'address2_name': null,
              'stageid': null,
              'address3_longitude': null,
              'onholdtime': null,
              'address2_telephone3': null,
              'address3_upszone': null,
              'telephone2': null,
              'aging30': null,
              'address2_upszone': null,
              'address1_upszone': null,
              'creditlimit': null,
              'accountrolecode': null,
              'salutation': null,
              'suffix': null,
              'traversedpath': null,
              'address1_utcoffset': null,
              'governmentid': null,
              'address1_stateorprovince': null,
              'annualincome_base': null,
              'address1_country': null,
              'address3_stateorprovince': null,
              'address2_city': null,
              'company': null,
              'address1_line2': null,
              'address2_longitude': null,
              'address3_telephone2': null,
              'yomifirstname': null,
              'address1_line1': null,
              'address2_composite': null,
              'address2_county': null,
              'anniversary': null,
              '_parentcontactid_value': null,
              'address2_fax': null,
              'yomilastname': null,
              'entityimage_url': null,
              'address1_line3': null,
              'defra_dateofdeath': null,
              '_defaultpricelevelid_value': null,
              '_slaid_value': null,
              'middlename': null,
              'address1_postalcode': null,
              'address3_line3': null,
              'overriddencreatedon': null,
              'timespentbymeonemailandmeetings': null
            }
          ]
        }),
        'headers': {
          'cache-control': 'no-cache',
          'pragma': 'no-cache',
          'content-type': 'application/json; odata.metadata=minimal',
          'expires': '-1',
          'server': '',
          'x-ms-service-request-id': '40f73420-b622-4309-9cfb-999a05c014af',
          'req_id': '40f73420-b622-4309-9cfb-999a05c014af',
          'x-ms-ratelimit-burst-remaining-xrm-requests': '59996',
          'x-ms-ratelimit-time-remaining-xrm-requests': '1,799.80',
          'odata-version': '4.0',
          'preference-applied': 'odata.include-annotations="*", odata.maxpagesize=500',
          'date': 'Mon, 17 Sep 2018 15:59:35 GMT',
          'connection': 'close',
          'content-length': '8899'
        }
      }

      const expectedParsedResponse = [
        {
          'sub': 'c20e6efe-9954-4c5b-a76c-83a5518a1385',
          'dynamicsContactId': '830e8f56-65ba-e811-a954-000d3a29be4a',
          'firstName': '123',
          'lastName': '123',
          'email': 'test@test.com',
          'telephoneNumber': '123',
          'mobileNumber': '123',
          'termsAcceptedVersion': 12,
          'termsAcceptedOn': new Date('2018-09-17T10:34:00.000Z')
        }
      ]

      const parsedResponse = readContacts.parseResponse(apiResponse)

      expect(parsedResponse).to.equal(expectedParsedResponse)
    })
  })

  describe('Read Contacts Employer Links', async () => {
    it('should build correct request using contact id', async () => {
      const { readContactsEmployerLinks, getToken } = idm.dynamics

      const token = await getToken()

      const request = await readContactsEmployerLinks.buildRequest('c20e6efe-9954-4c5b-a76c-83a5518a1385')

      const expectedRequest = {
        'method': 'GET',
        'url': `${dynamicsRoot}/connections?%24filter=_record1id_value%20eq%20c20e6efe-9954-4c5b-a76c-83a5518a1385%20and%20_record1roleid_value%20eq%201eb54ab1-58b7-4d14-bf39-4f3e402616e8`,
        'headers': {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json; charset=utf-8',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Prefer': 'odata.maxpagesize=500, odata.include-annotations="*"'
        }
      }

      expect(request).to.equal(expectedRequest)
    })

    it('should parse response correctly', async () => {
      const { readContactsEmployerLinks } = idm.dynamics

      const apiResponse = {
        'statusCode': 200,
        'body': JSON.stringify({
          '@odata.context': `${dynamicsRoot}/$metadata#connections`,
          '@Microsoft.Dynamics.CRM.totalrecordcount': -1,
          '@Microsoft.Dynamics.CRM.totalrecordcountlimitexceeded': false,
          'value': [{
            '@odata.etag': 'W/"1072264"',
            'statecode@OData.Community.Display.V1.FormattedValue': 'Active',
            'statecode': 0,
            'statuscode@OData.Community.Display.V1.FormattedValue': 'Active',
            'statuscode': 1,
            'createdon@OData.Community.Display.V1.FormattedValue': '17/09/2018 10:18',
            'createdon': '2018-09-17T10:18:10Z',
            'ismaster@OData.Community.Display.V1.FormattedValue': 'Yes',
            'ismaster': true,
            '_owningteam_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'team',
            '_owningteam_value': '7d14cfc9-92a8-e811-a953-000d3a39c345',
            '_relatedconnectionid_value@Microsoft.Dynamics.CRM.associatednavigationproperty': 'relatedconnectionid',
            '_relatedconnectionid_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'connection',
            '_relatedconnectionid_value': 'f8935cf4-62ba-e811-a954-000d3a29ba60',
            '_ownerid_value@OData.Community.Display.V1.FormattedValue': 'Customer-Master-CM-OWNER',
            '_ownerid_value@Microsoft.Dynamics.CRM.associatednavigationproperty': 'ownerid',
            '_ownerid_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'team',
            '_ownerid_value': '7d14cfc9-92a8-e811-a953-000d3a39c345',
            'name': 'CHRIFT LIMITED',
            '_record1roleid_value@OData.Community.Display.V1.FormattedValue': 'Employer',
            '_record1roleid_value@Microsoft.Dynamics.CRM.associatednavigationproperty': 'record1roleid',
            '_record1roleid_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'connectionrole',
            '_record1roleid_value': '1eb54ab1-58b7-4d14-bf39-4f3e402616e8',
            'versionnumber@OData.Community.Display.V1.FormattedValue': '1,072,264',
            'versionnumber': 1072264,
            'connectionid': 'f7935cf4-62ba-e811-a954-000d3a29ba60',
            '_defra_connectiondetailsid_value@OData.Community.Display.V1.FormattedValue': 'CID-0000000002971-17201809-T9X-101810',
            '_defra_connectiondetailsid_value@Microsoft.Dynamics.CRM.associatednavigationproperty': 'defra_ConnectionDetailsId',
            '_defra_connectiondetailsid_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'defra_connectiondetails',
            '_defra_connectiondetailsid_value': '1d945cf4-62ba-e811-a954-000d3a29ba60',
            '_record2id_value@OData.Community.Display.V1.FormattedValue': 'CHRIFT LIMITED',
            '_record2id_value@Microsoft.Dynamics.CRM.associatednavigationproperty': 'record2id_account',
            '_record2id_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'account',
            '_record2id_value': 'cf8962ee-62ba-e811-a954-000d3a29ba60',
            'record2objecttypecode@OData.Community.Display.V1.FormattedValue': 'Organisation',
            'record2objecttypecode': 1,
            '_modifiedby_value@OData.Community.Display.V1.FormattedValue': 'SA-DEFRA-CM-DEV ID-APP-REG-S2S',
            '_modifiedby_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'systemuser',
            '_modifiedby_value': 'f47bfb22-eaa9-e811-a951-000d3a29ba60',
            'modifiedon@OData.Community.Display.V1.FormattedValue': '17/09/2018 10:18',
            'modifiedon': '2018-09-17T10:18:11Z',
            'record1objecttypecode@OData.Community.Display.V1.FormattedValue': 'Contact',
            'record1objecttypecode': 2,
            '_createdby_value@OData.Community.Display.V1.FormattedValue': 'SA-DEFRA-CM-DEV ID-APP-REG-S2S',
            '_createdby_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'systemuser',
            '_createdby_value': 'f47bfb22-eaa9-e811-a951-000d3a29ba60',
            '_owningbusinessunit_value@Microsoft.Dynamics.CRM.associatednavigationproperty': 'owningbusinessunit',
            '_owningbusinessunit_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'businessunit',
            '_owningbusinessunit_value': '3b9007e4-9e9d-e811-a877-000d3ab17f9f',
            '_record1id_value@OData.Community.Display.V1.FormattedValue': '123 123',
            '_record1id_value@Microsoft.Dynamics.CRM.associatednavigationproperty': 'record1id_contact',
            '_record1id_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'contact',
            '_record1id_value': '0a0a62f0-62ba-e811-a955-000d3a28d1a0',
            '_record2roleid_value@OData.Community.Display.V1.FormattedValue': 'Employee',
            '_record2roleid_value@Microsoft.Dynamics.CRM.associatednavigationproperty': 'record2roleid',
            '_record2roleid_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'connectionrole',
            '_record2roleid_value': '35a23b91-ec62-41ea-b5e5-c59b689ff0b4',
            '_modifiedonbehalfby_value': null,
            'effectiveend': null,
            'entityimage_url': null,
            'importsequencenumber': null,
            '_createdonbehalfby_value': null,
            '_owninguser_value': null,
            'effectivestart': null,
            'exchangerate': null,
            'description': null,
            'entityimageid': null,
            'entityimage_timestamp': null,
            'overriddencreatedon': null,
            'entityimage': null,
            '_transactioncurrencyid_value': null
          }]
        }),
        'headers': {
          'cache-control': 'no-cache',
          'pragma': 'no-cache',
          'content-type': 'application/json; odata.metadata=minimal',
          'expires': '-1',
          'server': '',
          'x-ms-service-request-id': '070d0aa7-f63d-41ac-9ae5-8e570643c6be',
          'req_id': '070d0aa7-f63d-41ac-9ae5-8e570643c6be',
          'x-ms-ratelimit-burst-remaining-xrm-requests': '59997',
          'x-ms-ratelimit-time-remaining-xrm-requests': '1,797.57',
          'odata-version': '4.0',
          'preference-applied': 'odata.include-annotations="*", odata.maxpagesize=500',
          'date': 'Mon, 17 Sep 2018 16:28:33 GMT',
          'connection': 'close',
          'content-length': '4427'
        }
      }

      const expectedParsedResponse = [
        {
          'connectionId': 'f7935cf4-62ba-e811-a954-000d3a29ba60',
          'connectionDetailsId': '1d945cf4-62ba-e811-a954-000d3a29ba60',
          'accountId': '0a0a62f0-62ba-e811-a955-000d3a28d1a0'
        }
      ]

      const parsedResponse = readContactsEmployerLinks.parseResponse(apiResponse)

      expect(parsedResponse).to.equal(expectedParsedResponse)
    })
  })

  describe('Read Service Roles', async () => {
    it('should build correct request using service id', async () => {
      const { readServiceRoles, getToken } = idm.dynamics

      const token = await getToken()

      const request = await readServiceRoles.buildRequest('c20e6efe-9954-4c5b-a76c-83a5518a1385')

      const expectedRequest = {
        'method': 'GET',
        'url': `${dynamicsRoot}/defra_lobserivceroles?%24filter=_defra_lobservice_value%20eq%20c20e6efe-9954-4c5b-a76c-83a5518a1385`,
        'headers': {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json; charset=utf-8',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Prefer': 'odata.maxpagesize=500, odata.include-annotations="*"'
        }
      }

      expect(request).to.equal(expectedRequest)
    })
  })

  describe('Read Enrolment', async () => {
    it('should build correct request using service role ids', async () => {
      const { readEnrolment, getToken } = idm.dynamics

      const token = await getToken()

      const request = await readEnrolment.buildRequest('c20e6efe-9954-4c5b-a76c-83a5518a1385', ['c20e6efe-9954-4c5b-a76c-83a5518a1385', 'c20e6efe-9954-4c5b-a76c-83a5518a1385'])

      const expectedRequest = {
        'method': 'GET',
        'url': `${dynamicsRoot}/defra_lobserviceuserlinks?%24filter=(%20_defra_serviceuser_value%20eq%20c20e6efe-9954-4c5b-a76c-83a5518a1385%20)%20and%20statuscode%20eq%201%20and%20(%20_defra_servicerole_value%20eq%20c20e6efe-9954-4c5b-a76c-83a5518a1385%20or%20_defra_servicerole_value%20eq%20c20e6efe-9954-4c5b-a76c-83a5518a1385%20)&%24expand=defra_ServiceRole`,
        'headers': {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json; charset=utf-8',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Prefer': 'odata.maxpagesize=500, odata.include-annotations="*"'
        }
      }

      expect(request).to.equal(expectedRequest)
    })

    it('should build correct request using account ids', async () => {
      const { readEnrolment, getToken } = idm.dynamics

      const token = await getToken()

      const request = await readEnrolment.buildRequest('c20e6efe-9954-4c5b-a76c-83a5518a1385', null, ['c20e6efe-9954-4c5b-a76c-83a5518a1385', 'c20e6efe-9954-4c5b-a76c-83a5518a1385'])

      const expectedRequest = {
        'method': 'GET',
        'url': `${dynamicsRoot}/defra_lobserviceuserlinks?%24filter=(%20_defra_serviceuser_value%20eq%20c20e6efe-9954-4c5b-a76c-83a5518a1385%20)%20and%20statuscode%20eq%201%20and%20(%20_defra_organisation_value%20eq%20c20e6efe-9954-4c5b-a76c-83a5518a1385%20or%20_defra_organisation_value%20eq%20c20e6efe-9954-4c5b-a76c-83a5518a1385%20)&%24expand=defra_ServiceRole`,
        'headers': {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json; charset=utf-8',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Prefer': 'odata.maxpagesize=500, odata.include-annotations="*"'
        }
      }

      expect(request).to.equal(expectedRequest)
    })
  })

  describe('Read Service Enrolment', async () => {
    it('should return parse correct parsed response', async () => {
      const { readServiceEnrolment } = idm.dynamics

      const apiResponse = {
        '@odata.context': `${dynamicsRoot}/$metadata#defra_lobserviceuserlinks`,
        '@Microsoft.Dynamics.CRM.totalrecordcount': -1,
        '@Microsoft.Dynamics.CRM.totalrecordcountlimitexceeded': false,
        'value': [
          {
            '@odata.etag': 'W/"1072284"',
            'defra_lobserviceuserlinkid': 'a6e976a5-64ba-e811-a955-000d3a28d1a0',
            '_owningbusinessunit_value@Microsoft.Dynamics.CRM.associatednavigationproperty': 'owningbusinessunit',
            '_owningbusinessunit_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'businessunit',
            '_owningbusinessunit_value': 'd03575f5-50a2-e811-a83e-000d3ab4f534',
            'statuscode@OData.Community.Display.V1.FormattedValue': 'Active',
            'statuscode': 1,
            '_defra_connectiondetail_value@OData.Community.Display.V1.FormattedValue': 'CID-0000000002971-17201809-T9X-101810',
            '_defra_connectiondetail_value@Microsoft.Dynamics.CRM.associatednavigationproperty': 'defra_connectiondetail',
            '_defra_connectiondetail_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'defra_connectiondetails',
            '_defra_connectiondetail_value': '1d945cf4-62ba-e811-a954-000d3a29ba60',
            'createdon@OData.Community.Display.V1.FormattedValue': '17/09/2018 10:30',
            'createdon': '2018-09-17T10:30:13Z',
            'defra_name': 'EID-0000000001113-17201809-T8H-103012',
            'statecode@OData.Community.Display.V1.FormattedValue': 'Active',
            'statecode': 0,
            '_ownerid_value@OData.Community.Display.V1.FormattedValue': 'CHEMS-UK-REACH-IT-CM-OWNER',
            '_ownerid_value@Microsoft.Dynamics.CRM.associatednavigationproperty': 'ownerid',
            '_ownerid_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'team',
            '_ownerid_value': 'e28e740d-92a8-e811-a953-000d3a39c345',
            'modifiedon@OData.Community.Display.V1.FormattedValue': '17/09/2018 10:31',
            'modifiedon': '2018-09-17T10:31:14Z',
            'defra_validfrom@OData.Community.Display.V1.FormattedValue': '17/09/2018 10:30',
            'defra_validfrom': '2018-09-17T10:30:12Z',
            '_defra_organisation_value@OData.Community.Display.V1.FormattedValue': 'CHRIFT LIMITED',
            '_defra_organisation_value@Microsoft.Dynamics.CRM.associatednavigationproperty': 'defra_Organisation',
            '_defra_organisation_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'account',
            '_defra_organisation_value': 'cf8962ee-62ba-e811-a954-000d3a29ba60',
            'versionnumber@OData.Community.Display.V1.FormattedValue': '1,072,284',
            'versionnumber': 1072284,
            'timezoneruleversionnumber@OData.Community.Display.V1.FormattedValue': '4',
            'timezoneruleversionnumber': 4,
            '_modifiedby_value@OData.Community.Display.V1.FormattedValue': '',
            '_modifiedby_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'systemuser',
            '_modifiedby_value': '33e7f90e-8c0a-48cd-a280-9794362c3fae',
            '_defra_servicerole_value@OData.Community.Display.V1.FormattedValue': 'LE Manager',
            '_defra_servicerole_value@Microsoft.Dynamics.CRM.associatednavigationproperty': 'defra_ServiceRole',
            '_defra_servicerole_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'defra_lobserivcerole',
            '_defra_servicerole_value': 'bfe1c82a-e09b-e811-a94f-000d3a3a8543',
            '_owningteam_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'team',
            '_owningteam_value': 'e28e740d-92a8-e811-a953-000d3a39c345',
            'defra_enrolmentstatus@OData.Community.Display.V1.FormattedValue': 'Incomplete',
            'defra_enrolmentstatus': 1,
            '_createdby_value@OData.Community.Display.V1.FormattedValue': 'SA-DEFRA-CM-DEV ID-APP-REG-S2S',
            '_createdby_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'systemuser',
            '_createdby_value': 'f47bfb22-eaa9-e811-a951-000d3a29ba60',
            'defra_uniquereference': 'EID-0000000001113-17201809-T8H-103012',
            '_defra_serviceuser_value@OData.Community.Display.V1.FormattedValue': '123 123',
            '_defra_serviceuser_value@Microsoft.Dynamics.CRM.associatednavigationproperty': 'defra_ServiceUser',
            '_defra_serviceuser_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'contact',
            '_defra_serviceuser_value': '0a0a62f0-62ba-e811-a955-000d3a28d1a0',
            '_modifiedonbehalfby_value': null,
            'utcconversiontimezonecode': null,
            '_owninguser_value': null,
            'defra_validto': null,
            'importsequencenumber': null,
            'overriddencreatedon': null,
            '_createdonbehalfby_value': null
          }
        ]
      }

      const expectedParsedResponse = {
        'roles': [
          'cf8962ee-62ba-e811-a954-000d3a29ba60:bfe1c82a-e09b-e811-a94f-000d3a3a8543:1'
        ],
        'mappings': [
          'cf8962ee-62ba-e811-a954-000d3a29ba60:CHRIFT LIMITED',
          'bfe1c82a-e09b-e811-a94f-000d3a3a8543:LE Manager',
          '1:Incomplete'
        ]
      }

      const parsedResponse = await readServiceEnrolment.parseResponse(apiResponse)

      expect(parsedResponse).to.equal(expectedParsedResponse)
    })
  })
})
