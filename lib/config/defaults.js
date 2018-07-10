module.exports = {
  cookieName: 'idm',
  cacheSegment: 'idm',
  cacheCookieTtlMs: 24 * 60 * 60 * 1000,
  loginOnDisallow: false,
  isSecure: true,
  outboundPath: '/login/out',
  returnUri: '/login/return',
  logoutPath: '/logout',
  onByDefault: false,
  defaultBackToPath: '/'
}
