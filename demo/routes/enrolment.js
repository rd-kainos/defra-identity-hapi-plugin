const config = require('../config')

module.exports = [
  {
    method: 'GET',
    path: '/enrolment',
    options: {
      auth: 'idm'
    },
    handler: async function (request, h) {
      const { idm } = request.server.methods

      const claims = await idm.getClaims(request)
      const parsedAuthzRoles = idm.dynamics.parseAuthzRoles(claims)

      return h.view('enrolment', {
        title: 'enrolment',
        idm,
        claims,
        parsedAuthzRoles,
        credentials: await idm.getCredentials(request)
      })
    }
  },
  {
    method: 'POST',
    path: '/enrolment',
    options: {
      auth: 'idm'
    },
    handler: async function (request) {
      const { idm } = request.server.methods
      const { enrolmentStatusId } = request.payload
      const claims = await idm.getClaims(request)
      let parsedAuthzRoles = idm.dynamics.parseAuthzRoles(claims)

      const newEnrolmentStatusId = Number(enrolmentStatusId)
      const { contactId } = claims

      // Get the accounts this contact is linked with
      const contactAccountLinks = await idm.dynamics.readContactsAccountLinks(contactId)

      try {
        // If this contact has no links to any accounts, then stop. There is a problem
        if (!contactAccountLinks || !contactAccountLinks.length) {
          throw new Error(`Contact record not linked to any accounts - contactId ${contactId}`)
        }

        const { serviceRoleId } = config

        if (!parsedAuthzRoles.flat.length) {
          // Create enrolments
          await Promise.all(
            contactAccountLinks.map(
              link => idm.dynamics.createEnrolment(contactId, link.connectionDetailsId, newEnrolmentStatusId, link.accountId, undefined, serviceRoleId)
            )
          )
        } else {
          // Need lobServiceUserLinkIds from current enrolments to update enrolments
          // Get all the ids of the roles with which we have an existing enrolment
          const existingRoleIds = parsedAuthzRoles.flat.map(role => role.roleId)

          // Get all our org ids with which we have a pending enrolment
          const existingRoleOrgIds = parsedAuthzRoles.flat.map(role => role.orgId || null)

          // Get details of our existing enrolments matching the above role ids and org ids
          const currentEnrolments = await idm.dynamics.readEnrolment(contactId, existingRoleIds, existingRoleOrgIds)

          // Create an array of our enrolment
          const updateEnrolmentPromiseArr = currentEnrolments.value
            .map(currentEnrolment => idm.dynamics.updateEnrolmentStatus(currentEnrolment.defra_lobserviceuserlinkid, newEnrolmentStatusId))

          await Promise.all(updateEnrolmentPromiseArr)
        }

        // Refresh our token with new roles
        await idm.refreshToken(request)

        return 'Enrolment successfully updated. <a href="/enrolment">Click here to return</a>'
      } catch (e) {
        console.error(e)

        return `Uh oh. Error: ${e}`
      }
    }
  }
]
