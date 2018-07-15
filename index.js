'use strict'

// core
const { readFileSync } = require('fs')

// npm
const got = require('got')

// self
const { name, version } = require('./package.json')

/*
const z2 = { _: 1 }
const emptyFalsy = (z) => !(z && Object.keys(typeof z === 'object' ? z : z2).length)

const slim = (object) => transform(object, (result, value, key) => {
  if (Array.isArray(value) || isObject(value)) { value = slim(value) }
  if (emptyFalsy(value)) { return }
  if (Array.isArray(result)) { return result.push(value) }
  result[key] = value
})
*/

const slim = o => o

const gotOpts = {
  json: true,
  headers: {
    authorization: `bearer ${process.env.GITHUB_TOKEN}`,
    'User-Agent': `${name} ${version}`
  }
}

// body is an object with required query and optional variables
const graphqlGot = body =>
  got('https://api.github.com/graphql', { ...gotOpts, body }).then(({ body }) =>
    slim(body)
  )

const query = readFileSync('query.graphql', 'utf-8')

graphqlGot({ query })
  .then(body => console.log(JSON.stringify(body, null, '  ')))
  .catch(console.error)
