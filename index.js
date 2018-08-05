'use strict'

// FIXME: check rate limits before retrying
// see error.headers

// core
const { readFileSync } = require('fs')
const { join } = require('path')

// self
const { name, version } = require('./package.json')
const processor = require('./processor')

// npm
const got = require('got')
const deburr = require('lodash.deburr')
const uniq = require('lodash.uniq')
const uniqBy = require('lodash.uniqby')
const delay = require('delay')
const debug = require('debug')(name)
const bestContrast = require('get-best-contrast-color').default

// const MIN_WAIT = 50

const GOT_OPTS = {
  // default: throwHttpErrors: true, // current run: false (by mistake I believe)
  retry: {
    retries: 5,
    methods: ['POST'],
    statusCodes: [403, 408, 413, 429, 502, 503, 504]
  },
  json: true,
  headers: {
    authorization: `bearer ${process.env.GITHUB_TOKEN}`,
    'User-Agent': `${name} ${version}`
  }
}

const WHERE_ERROR = '"where" argument should be a string or an array.'

const localFile = path => readFileSync(join(__dirname, path), 'utf-8')

const githubColors = (foregrounds = ['#000', '#fff']) =>
  // see https://github.com/github/linguist/blob/master/lib/linguist/languages.yml
  got(
    'https://raw.githubusercontent.com/jaebradley/github-languages-client/master/src/languages.json',
    { json: true }
  ).then(({ body }) =>
    body
      .map(({ name, color }) => ({ name, color }))
      .filter(({ color }) => color)
      .map(({ name, color }) => ({
        name,
        bg: color.toLowerCase(),
        fg: bestContrast(color, foregrounds)
      }))
  )

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

const makeSearch = (where, created) =>
  `${deburred(where)
    .map(x => `location:${JSON.stringify(x)}`)
    .join(' ')} type:user sort:joined${created ? ` created:<=${created}` : ''}`

const defaultQuery = localFile('query.graphql')

const gotRetry = (query, variables) =>
  got('https://api.github.com/graphql', {
    ...GOT_OPTS,
    body: { query, variables }
  }).then(ret => {
    debug(ret.headers)
    debug(Object.keys(ret.body))
    return ret
  })

const graphqlGotImp = async (where, query, variables = {}) => {
  try {
    let created
    if (variables.created) {
      created = variables.created
    }
    delete variables.created

    variables.loc = makeSearch(where, created)

    if (!variables.lastStargazers) {
      variables.lastStargazers = 50
    }

    if (!variables.lastStarred) {
      variables.lastStarred = 50
    }

    if (!variables.lastRepos) {
      variables.lastRepos = 50
    }

    if (!variables.after) {
      delete variables.after
    }

    if (!query) {
      query = defaultQuery
    }

    debug('variables:', variables)

    const { headers, body: { data, errors } } = await gotRetry(query, variables)
    const fetchedAt = new Date(headers.date).toISOString()

    if (errors) {
      const err = new Error(`GraphQL: ${errors[0].message}`)
      err.errors = JSON.stringify(errors)
      err.headers = headers
      if (data) {
        err.data = JSON.stringify(data)
      }
      throw err
    }
    if (!data || !data.search) {
      throw new Error('No data or data.search found.')
    }

    data.search.edges =
      data.search && data.search.edges && data.search.edges.length
        ? data.search.edges.map(x => {
          return {
            node: {
              ...x.node,
              fetchedAt
            }
          }
        })
        : []

    data._headers = headers
    return data
  } catch (e) {
    throw e
  }
}

const throttle = async (then, userCount, nPerQuery, rateLimit) => {
  const now = Date.now()
  const remaining = rateLimit.remaining // || rateLimit.limit
  const elapsed = now - then
  debug('elapsed, rateLimit:', elapsed, rateLimit)
  const timeUntilReset = Math.max(0, rateLimit.resetAt - now)
  const nQueries = Math.round(userCount / nPerQuery)
  const costNeeded = rateLimit.cost * nQueries

  debug('nQueries:', nQueries)
  debug('timeUntilReset:', timeUntilReset)
  debug('costNeeded:', costNeeded)

  let ms

  if (!remaining || rateLimit.cost > remaining) {
    // ms = timeUntilReset + 20 * MIN_WAIT
    ms = timeUntilReset + 30 * 1000
  } else {
    const ttt = Math.round(
      timeUntilReset / Math.round(remaining / rateLimit.cost)
    )

    const timeNeeded = Math.round(nQueries * ttt)
    debug('timeNeeded:', timeNeeded)

    if (timeNeeded > timeUntilReset && costNeeded > remaining) {
      ms = Math.max(0, Math.round(ttt - Math.round(elapsed)))
    }
  }

  /*
  } else if (timeNeeded > timeUntilReset && costNeeded > remaining) {
    // ms = Math.max(MIN_WAIT, Math.round(1.25 * (ttt - Math.round(elapsed))))
    // ms = Math.max(1000, Math.round(1.25 * (ttt - Math.round(elapsed))))
    // ms = Math.max(1000, ttt)
    // ms = ttt
    ms = Math.max(0, Math.round(ttt - Math.round(elapsed)))
  }
  */
  debug('ms:', ms)

  if (process.env.DEBUG === name || process.env.DEBUG === '*') {
    console.error()
  }
  if (ms) {
    await delay(ms)
  }
}

// FIXME: search before specified date
const graphqlGot = async (where, query, variables = {}, tick = false) => {
  let r2
  let first = true
  let data
  let result = []
  let lastCreated
  let prev
  try {
    let after = false
    let created
    if (variables.created) {
      created = variables.created
    }
    let userCount
    do {
      const then = Date.now()
      data = await graphqlGotImp(where, query, { ...variables, after, created })

      r2 = result.length
      result = uniqBy(result.concat(data.search.edges), 'node.databaseId')

      if (!userCount) {
        userCount = data.search.userCount
      }

      if (tick) {
        if (first) {
          tick(result.length - r2, { total: userCount })
          first = false
        } else {
          tick(result.length - r2)
        }
      }

      debug('result.length, userCount:', result.length, userCount)
      after = data.search.pageInfo.hasNextPage && data.search.pageInfo.endCursor
      if (!after) {
        prev = lastCreated
        debug('lastCreated (old)', prev)
        lastCreated = result[result.length - 1].node.createdAt
        debug('result.length', result.length)
        debug('result[last]', result[result.length - 1])
        debug('userCount', userCount)
        created =
          lastCreated !== prev && result.length < userCount && lastCreated
        debug('lastCreated (new)', lastCreated)
        debug('created', created)
      }
      await throttle(
        then,
        userCount - result.length,
        data.search.edges.length,
        {
          cost: data.rateLimit.cost,
          limit: parseInt(data._headers['x-ratelimit-limit'], 10),
          remaining: parseInt(data._headers['x-ratelimit-remaining'], 10),
          resetAt: 1000 * parseInt(data._headers['x-ratelimit-reset'], 10)
        }
        // data.rateLimit
      )
    } while (after || created)

    if (result.length) {
      data.search.edges = result
    }

    data.meta = { name, version }
    return processor(data)
  } catch (e) {
    // FIXME: Get stuck on 502 errors
    debug('FIXME (statusCode) ?', e.statusCode)
    debug('lastCreated:', lastCreated)
    debug(e)

    /*
    if (
      result &&
      result.length
    ) {
      if (
        data &&
        data.search &&
        data.search.edges &&
        data.search.edges.length
      ) {
        debug(Object.keys(data))
        data.search.edges = result
        return data
      }
      // return []
    }
    */
    /*
    if (
      result &&
      result.length &&
      data &&
      data.search &&
      data.search.edges &&
      data.search.edges.length
    ) {
      debug(Object.keys(data))
      data.search.edges = result
      return data
    }
    */
    throw e
  }
}

module.exports = graphqlGot
module.exports.deburred = deburred
module.exports.localFile = localFile
module.exports.githubColors = githubColors
