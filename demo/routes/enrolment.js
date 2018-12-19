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
      const mappings = idm.dynamics.getMappings()
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

        if (!parsedAuthzRoles) {
          // Create

          let initialEnrolmentStatus

          // If we want a complete status, we have to set it as incomplete or pending first
          switch (newEnrolmentStatusId) {
            case mappings.enrolmentStatus.incomplete:
            case mappings.enrolmentStatus.pending:
              initialEnrolmentStatus = newEnrolmentStatusId
              break
            case mappings.enrolmentStatus.completeApproved:
            case mappings.enrolmentStatus.completeRejected:
              initialEnrolmentStatus = mappings.enrolmentStatus.incomplete
              break
          }

          const createEnrolmentPromiseArr = contactAccountLinks.map(link => {
            const enrolmentType = link.roleId === mappings.roleId.citizen ? mappings.enrolmentType.citizen : mappings.enrolmentType.other

            return idm.dynamics.createEnrolment(serviceRoleId, contactId, link.accountId, link.connectionDetailsId, initialEnrolmentStatus, enrolmentType)
          })

          await Promise.all(createEnrolmentPromiseArr)

          // Refresh our token with new roles
          await idm.refreshToken(request)

          // Refresh our parsedAuthzRoles so our next stage can use them
          const claims = await idm.getClaims(request)

          parsedAuthzRoles = idm.dynamics.parseAuthzRoles(claims)
        }

        const completeEnrolmentStatuses = [mappings.enrolmentStatus.completeApproved, mappings.enrolmentStatus.completeRejected]

        // Update
        // If we already had roles - so didn't need to create
        // or we didn't have roles but our new status should be complete
        if (parsedAuthzRoles || completeEnrolmentStatuses.indexOf(newEnrolmentStatusId) !== -1) {
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
