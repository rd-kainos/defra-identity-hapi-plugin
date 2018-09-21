const _ = require('lodash')

const relationships = {
  employeeToEmployer: ['Employee', 'Employer'], // Contact -> Organisation
  agentToAgentCustomer: ['Agent', 'Agent Customer'], // Contact -> Organisation, Contact -> Contact or Organisation -> Organisation
  primaryUser: ['Primary User'], // Contact -> Organisation
  sro: ['SRO'], // Contact -> Organisation
  partnership: ['Partnership'] // Organisation -> Organisation
}

const resolveRelationship = (contactRelationship, organisationRelationship) => {
  // Note that the records are actually stored reverse to what you might expect (e.g. SRO is stored
  // on organisation not the contact)
  return _.find(_.values(relationships), (rel) => rel[0] === organisationRelationship)
}

const resolveRecordType = (input) => {
  input = input.toLowerCase()
  switch (input) {
    case 'organisation':
    case 'account':
      return recordType.organisation
    case 'contact':
      return recordType.contact
    default:
      return undefined
  }
}

const recordType = {
  contact: 'contact',
  organisation: 'organisation'
}

const enrolmentStatus = {
  incomplete: 1,
  pending: 2,
  completeApproved: 3,
  completeRejected: 4
}

const enrolmentType = {
  citizen: 'CITIZEN',
  other: 'OTHER'
}

const roleId = {
  employee: '1eb54ab1-58b7-4d14-bf39-4f3e402616e8',
  employer: '35a23b91-ec62-41ea-b5e5-c59b689ff0b4'
}

/**
 * Parse a string in the format expected from Dynamics into a Javascript Date object
 * @param {string} input String in the expected format for a Dynamics datetime
 */
const dateTimeStringToDate = (input) => {
  // @fixme API actually returns date in ISO8601 rather than specified format so use native date parsing
  return new Date(input)
  // const matches = new RegExp(dateTimeRegex).exec(input)
  // if (!matches) {
  //   return undefined
  // }
  // const [day, month, year, hour, minute] = matches
  //   .filter((x, i) => i !== 0)
  //   .map(x => Number.parseInt(x))
  // return new Date(year, month - 1, day, hour, minute, 0, 0)
}

module.exports = {
  resolveRelationship,
  resolveRecordType,
  recordType,
  enrolmentStatus,
  enrolmentType,
  dateTimeStringToDate,
  roleId
}
