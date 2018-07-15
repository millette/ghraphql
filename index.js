'use strict'

// core
const { readFileSync } = require('fs')

// npm
const got = require('got')

// self
const { name, version } = require('./package.json')

const gotOpts = {
  json: true,
  headers: {
    authorization: `bearer ${process.env.GITHUB_TOKEN}`,
    'User-Agent': `${name} ${version}`
  }
}

const query = readFileSync('query.graphql', 'utf-8')

const graphqlGot = where =>
  got('https://api.github.com/graphql', {
    ...gotOpts,
    body: { query, variables: { loc: `location:${where} sort:joined` } }
  }).then(({ body: { data, errors } }) => {
    if (errors) {
      const err = new Error(`GraphQL: ${errors[0].message}`)
      err.errors = JSON.stringify(errors)
      if (data) {
        err.data = JSON.stringify(data)
      }
      throw err
    }
    return data
  })

module.exports = graphqlGot
