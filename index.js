'use strict'

// core
const { readFileSync } = require('fs')
const { join } = require('path')

// npm
const got = require('got')
const deburr = require('lodash.deburr')
const uniq = require('lodash.uniq')

// self
const { name, version } = require('./package.json')

const GOT_OPTS = {
  json: true,
  headers: {
    authorization: `bearer ${process.env.GITHUB_TOKEN}`,
    'User-Agent': `${name} ${version}`
  }
}

const WHERE_ERROR = '"where" argument should be a string or an array.'

const deburred = where => {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('Missing: GITHUB_TOKEN environment variable. See README.')
  }

  if (typeof where === 'string') {
    where = [where]
  } else if (!Array.isArray(where) || !where.length) {
    throw new Error(WHERE_ERROR)
  }

  const withDeburred = []
  where
    .map(x => x.trim().toLowerCase())
    .forEach(x => withDeburred.push(x, deburr(x)))
  const result = uniq(withDeburred).filter(Boolean)

  if (result.length) {
    return result
  }
  throw new Error(WHERE_ERROR)
}

const makeSearch = where =>
  `${deburred(where)
    .map(x => `location:${JSON.stringify(x)}`)
    .join(' ')} sort:joined`

const defaultQuery = readFileSync(join(__dirname, 'query.graphql'), 'utf-8')

const graphqlGot = async (where, query) => {
  try {
    if (!query) {
      query = defaultQuery
    }
    const loc = makeSearch(where)
    const { body: { data, errors } } = await got(
      'https://api.github.com/graphql',
      {
        ...GOT_OPTS,
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
    if (!data.search.edges.length) {
      throw new Error('No results found.')
    }
    return data
  } catch (e) {
    throw e
  }
}

module.exports = graphqlGot

module.exports.deburred = deburred
