require('dotenv').config()

const gulp = require('gulp')
const sonarqubeScanner = require('sonarqube-scanner')

gulp.task('analyse', function (callback) {
  sonarqubeScanner({
    serverUrl: process.env.SONARQUBE_URL,
    options: {
      'sonar.projectKey': 'defra:identity:hapi-plugin',
      'sonar.sources': '.',
      'sonar.projectName': 'Defra Identity Hapi plugin',
      'sonar.projectVersion': '1.0',
      'sonar.javascript.lcov.reportPaths': 'coverage.lcov',
      'sonar.exclusions': [
        'node_modules/**',
        'coverage.html',
        'logs/**',
        'config/server.json',
        'GulpFile.js',
        'test/**',
        'demo/public/stylesheets/**'
      ].join(','),
      'sonar.test.exclusions': [
        'test/**'
      ].join(',')
    }
  }, callback)
})
