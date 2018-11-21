# Change log

All notable changes to this project will be documented in this file. 

## 2.5.0 - 21 Nov 2018
- Fix all npm audit vulnerabilities
- Associated test updates
- Added changelog.md

Packages updated to latest versions:
- openid-client
- gulp
- sonarqube-scanner

## 2.4.2 - 16 Nov 2018
Allow array of serviceIds in dynamics.readServiceRoles

## 2.4.1 - 16 Nov 2018
Only query active enrolments in dynamics.readEnrolment

## 2.4.0 - 16 Nov 2018
Hash the state stored when sending a user to identity provider - If our state is massively long, it could cause an error in cosmos db - hash it so we know it will be short enough

## 2.3.5 - 12 Nov 2018
Ensure backToPath is always a path on the app domain

## 2.3.3 - 9 Nov 2018
If request is needed for the cache, force get request on redirect uri - ensures the correct cookies will be available to the request

## 2.3.2 - 9 Nov 2018
Addition of dynamics.readContactsAgentCustomerLinks - Give service access to an 3rd party member service role - idm 671.3

## 2.3.1 - 7 Nov 2018
Migrate javascript redirect snippet to external javascript file

## 2.3.0 - 7 Nov 2018
Add option to pass request object to cache methods - makes it possible to use cookies for caching

## 2.2.9 - 16 Nov 2018
Read service roles function to work with multiple service ids

## 2.2.8 - 6 Nov 2018
Send more useful error message to error page in query string when error retrieving state on user's return

## 2.2.5 - 24 Oct 2018
Identity App integration
