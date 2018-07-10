const Joi = require('joi')

/**
 * @property {string} tenantId B2C tenant guid - must be guid (not tenant domain) in order to match with oidc token issuer
 * @property {string} cookiePassword Password to encode cookie - should be 32 characters
 * @property {string} cookieName Name of cookie containing cache record identifier
 * @property {string} cacheSegment
 * @property {object|undefined} cache Specify caching mechanism or leave blank to use memory cache
 * @property {number} cacheCookieTtlMs Cache ttl in ms - irrelevant if custom cache is specified above
 * @property {string|undefined} disallowedRedirectPath Where to send users who are disallowed
 * @property {boolean} loginOnDisallow Automatically redirect to B2C when disallowed
 * @property {boolean} isSecure Is app being served securely - if true, only secure cookies will be set
 * @property {string} outboundPath Path of outbound redirect page
 * @property {string} returnUri Path of return redirect page
 * @property {string} logoutPath Path of logout page - false if no log out page required
 * @property {string} appDomain Root domain the service can be found at - used for oidc return uri
 * @property {string} clientId B2C application id
 * @property {string} clientSecret B2C application secret
 * @property {string} defaultPolicy Default B2C policy
 * @property {string} resetPasswordPolicy B2C password policy
 * @property {boolean} onByDefault Turn on authentication requirement for all pages by default
 * @property {string} defaultBackToPath Default path to send users to when they are disallowed
 * @property {object|undefined} callbacks Object of optional callbacks
 * @property {func} callbacks.preReturnUriDirect Called when user is returned back from IdP - before user is redirected - if a truey value is returned, that will be returned to the client instead of the standard JS redirect
 * @property {func} callbacks.resetPasswordConfirmation Called when reset password is complete - should return view confirming password reset and link to continue - if falsey value is returned then the standard, unstyled page will be returned to the user
 * @property {func} callbacks.onError Called on uncaught error in routes exposed by plugin - if request & h are passed, the response of this function will be returned to the client
 */
module.exports = {
  tenantId: Joi.string().guid(),
  cookiePassword: Joi.string().min(32),
  cookieName: Joi.string(),
  cacheSegment: Joi.string(),
  cache: Joi.object().keys({
    get: Joi.func().arity(1),
    set: Joi.func().arity(3),
    drop: Joi.func().arity(1)
  }).optional(),
  cacheCookieTtlMs: Joi.number().optional(),
  disallowedRedirectPath: Joi.string().optional(),
  loginOnDisallow: Joi.boolean(),
  isSecure: Joi.boolean(),
  outboundPath: Joi.string(),
  returnUri: Joi.string(),
  logoutPath: Joi.string(),
  appDomain: Joi.string(),
  clientId: Joi.string().guid(),
  clientSecret: Joi.string(),

  defaultPolicy: Joi.string().optional(),
  resetPasswordPolicy: Joi.string().optional(),
  onByDefault: Joi.boolean(),
  defaultBackToPath: Joi.string(),
  callbacks: Joi.object().keys({
    preReturnUriDirect: Joi.func().arity(4).optional(),
    resetPasswordConfirmation: Joi.func().arity(3).optional(),
    onError: Joi.func().arity(3).optional()
  }).optional()
}
