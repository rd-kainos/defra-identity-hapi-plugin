const {expect} = require('code')
const Lab = require('lab')
const lab = exports.lab = Lab.script()

const url = require('url')
const qs = require('querystring')

const jwt = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6Ilg1ZVhrNHh5b2pORnVtMWtsMll0djhkbE5QNC1jNTdkTzZRR1RWQndhTmsifQ.eyJleHAiOjE1MjE3MzQ5NTMsIm5iZiI6MTUyMTczMTM1MywidmVyIjoiMS4wIiwiaXNzIjoiaHR0cHM6Ly9sb2dpbi5taWNyb3NvZnRvbmxpbmUuY29tL2NiMDk2NzVhLWFmMjEtNGRkZS05Y2Y4LWY2MzIzNWEyMTlhMC92Mi4wLyIsInN1YiI6IjZlODdjNmU1LTljMDktNDdlMC1hMWNmLTkyYTYxZDI2MTI1ZiIsImF1ZCI6IjY1MmY0NmQwLTI2NzAtNGEzNC05ZmJjLTAxY2Q1ZmFjZmEzNCIsIm5vbmNlIjoiZGVmYXVsdE5vbmNlIiwiaWF0IjoxNTIxNzMxMzUzLCJhdXRoX3RpbWUiOjE1MjE3MzEzNTMsIm9pZCI6IjZlODdjNmU1LTljMDktNDdlMC1hMWNmLTkyYTYxZDI2MTI1ZiIsImdpdmVuX25hbWUiOiJDaGVzaGlyZSIsImZhbWlseV9uYW1lIjoiQ2hlc2hpcmUiLCJlbWFpbHMiOlsiZGVmcmFAaWFtY2hyaXNjaGVzaGlyZS5jby51ayJdLCJ0ZnAiOiJCMkNfMV9iMmMtd2ViYXBwLXNpZ251cC1zaWduaW4ifQ.kFNwgCFuYmR0T1Y0fkggMd2OjrNOaDFRJe1wfX3qAtEl49OP3lfAhLQIyAdlpT3Yotp4oanhUoDMlgMXsP1z1JhRUT_Bsb892tF8-ZRxOHggO3Jciy1RmTnEFJDJH_FMLvExBgliuo8qhYu0g_gqUZVC1f5FogpMtzAe63d2HXVheicw3OsrBHBBaHMLRYnCH0PvoA-UqU0-DAHkgxcg7ldAqxvVCULT9GxQc6_FpZWP9O6lx0ECCRoAir5Lnr7nRGD5gkFhJlAa3szJQmC7ETh8eIJbeTHwxWpNeun-YxDkiqMrbgo9khqRGiViA0lnIzqq899LBhdtRUoY7gu0gw'

const server = require('../demo')

lab.experiment('OIDC authorisation code flow', () => {
  lab.test('Should return an outbound redirect url', async () => {
    const idmConfig = server.methods.idm.getConfig()

    const {
      defaultPolicy,
      outboundPath
    } = idmConfig

    const url = server.methods.idm.generateAuthenticationUrl('/', {
      returnUrlObject: true,
      policyName: defaultPolicy,
      forceLogin: false
    })

    const {
      query,
      pathname
    } = url

    expect(query).to.equal({
      backToPath: '/',
      policyName: defaultPolicy,
      forceLogin: undefined
    })

    expect(pathname).to.equal(outboundPath)
  })

  lab.test('The plugin should redirect the request to the identity provider with the appropriate parameters', async () => {
    const idmConfig = server.methods.idm.getConfig()
    const injectionUrl = server.methods.idm.generateAuthenticationUrl('/')

    const res = await server.inject({
      method: 'GET',
      url: injectionUrl,
    })

    // Make sure we've been redirected
    expect(res.statusCode).to.equal(302)

    // Make sure we've been redirected to the appropriate identity provider
    const parsedHeaderLocation = url.parse(res.headers.location)

    expect(parsedHeaderLocation.protocol).to.equal('https:')
    expect(parsedHeaderLocation.host).to.equal('login.microsoftonline.com')
    expect(parsedHeaderLocation.pathname).to.equal(`/${idmConfig.tenantId}/oauth2/v2.0/authorize`)

    // Make sure we've been redirect with the appropriate parameters
    const parsedQuerystring = qs.parse(parsedHeaderLocation.query)

    expect(parsedQuerystring.p).to.equal(idmConfig.defaultPolicy)
    expect(parsedQuerystring.redirect_uri).to.equal(idmConfig.appDomain + idmConfig.returnUri)
    expect(parsedQuerystring.scope).to.equal('openid offline_access')
    expect(parsedQuerystring.response_mode).to.equal('form_post')
    expect(parsedQuerystring.client_id).to.equal(idmConfig.clientId)
    expect(parsedQuerystring.response_type).to.equal('code')
  })

  // lab.test('The plugin should validate and handle the responding jwt from the identity provider', async () => {
  //   const idmConfig = server.methods.idm.getConfig()
  //
  //   const res = await server.inject({
  //     method: 'POST',
  //     url: idmConfig.returnUri,
  //     payload: {
  //
  //     }
  //   })
  // })
})
