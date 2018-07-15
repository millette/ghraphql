'use strict'

// core
const { readFileSync } = require('fs')

// npm
const got = require('got')
const deburr = require('lodash.deburr')
const uniq = require('lodash.uniq')

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

const deburred = where => {
  const g = []
  where.map(x => x.trim().toLowerCase()).forEach(x => g.push(x, deburr(x)))
  return uniq(g)
}

const makeSearch = where => {
  if (typeof where === 'string') {
    where = [where]
  }
  const g = deburred(where).map(x => `location:${JSON.stringify(x)}`)
  return `${g.join(' ')} sort:joined`
}

const graphqlGot = where =>
  got('https://api.github.com/graphql', {
    ...gotOpts,
    body: { query, variables: { loc: makeSearch(where) } }
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

module.exports.deburred = deburred
