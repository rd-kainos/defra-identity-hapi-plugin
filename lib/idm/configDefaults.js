module.exports = {
  // B2C tenant guid - must be guid (not tenant domain) in order to match with oidc token issuer
  b2cTenantGuid: null,
  // Password to encode cookie - should be 32 characters
  cookiePassword: null,
  // Might need to segment cookieName and cacheSegment by app name
  // Name of cookie containing cache record identifier
  cookieName: 'idm',
  cacheSegment: 'idm',
  // Specify caching mechanism
  // Must follow api detailed below
  cache: null,
  // cache: {
  //   get: async (key) => {},
  //   set: async (key, value, ttl) => {}
  //   drop: async (key) => {}
  // }
  // Cache ttl in ms - irrelevant if custom cache is specified above
  cacheCookieTtlMs: 10 * 60 * 1000, // Ten minutes
  // @todo Do we need an error specific path?
  // Where to send users who are disallowed
  disallowedRedirectPath: null,
  // Automatically redirect to B2C when disallowed
  loginOnDisallow: false,
  // Is app being served securely - if true, only secure cookies will be set
  isSecure: true,
  // Path of outbound redirect page
  outboundPath: '/login/out',
  // Path of return redirect page
  returnUri: '/login/return',
  // Path of logout page - false if no log out page required
  logoutPath: '/logout',
  // Root domain the service can be found at - used for oidc return uri
  appDomain: null,
  // B2C application id
  clientId: null,
  // B2C application secret
  clientSecret: null,
  // Default B2C policy
  defaultPolicy: null,
  // Turn on authentication requirement for all pages by default
  onByDefault: false,
  // Default path to send users to when they are disallowed
  defaultBackToPath: '/',
  // Function called user is returned back from IdP - before user is redirected
  callbacks: {
    // @todo Determine whether this needs to be able to interrupt redirect or something - If returns truey - return truey value? Could be a redirect or response?
    preReturnUriRedirect: async (request, tokenSet) => {},
    onError: async (err) => {},
    // resetPasswordConfirmation: async (request, h, originalPolicyOutboundUrl) => {}
  }
}