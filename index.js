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

const deburred = where => {
  const g = []
  where.map(x => x.trim().toLowerCase()).forEach(x => g.push(x, deburr(x)))
  return uniq(g)
}

const makeSearch = where => {
  if (typeof where === 'string') {
    where = [where]
  } else if (!Array.isArray(where)) {
    throw new Error('"where" argument should be a string or an array.')
  }

  const g = deburred(where).map(x => `location:${JSON.stringify(x)}`)
  return `${g.join(' ')} sort:joined`
}

const graphqlGot = async (where, query) => {
  try {
    if (!query) {
      query = readFileSync('query.graphql', 'utf-8')
    }
    const loc = makeSearch(where)
    const { body: { data, errors } } = await got(
      'https://api.github.com/graphql',
      {
        ...gotOpts,
        body: { query, variables: { loc } }
      }
    )

    if (errors) {
      const err = new Error(`GraphQL: ${errors[0].message}`)
      err.errors = JSON.stringify(errors)
      if (data) {
        err.data = JSON.stringify(data)
      }
      throw err
    }
    return data
  } catch (e) {
    throw e
  }
}

module.exports = graphqlGot

module.exports.deburred = deburred
