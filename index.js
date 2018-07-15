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

const graphqlGot = (query, variables) =>
  got('https://api.github.com/graphql', {
    ...gotOpts,
    body: { query, variables }
  }).then(({ body: { data, errors } }) => {
    if (errors) {
      const err = new Error(errors[0].message)
      err.errors = JSON.stringify(errors)
      throw err
    }
    return data
  })

const where = 'kinshasa'
const query = readFileSync('query.graphql', 'utf-8')
const loc = `location:${where} sort:joined`

graphqlGot(query, { loc })
  .then(body => console.log(JSON.stringify(body, null, '  ')))
  .catch(console.error)
