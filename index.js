'use strict'

// core
const { readFileSync } = require('fs')
const { join } = require('path')

// self
const { name, version } = require('./package.json')

// npm
const got = require('got')
const pRetry = require('p-retry')
const deburr = require('lodash.deburr')
const uniq = require('lodash.uniq')
const uniqBy = require('lodash.uniqby')
const delay = require('delay')
const debug = require('debug')(name)

const MIN_WAIT = 1000

const GOT_OPTS = {
  retries: 0,
  json: true,
  headers: {
    authorization: `bearer ${process.env.GITHUB_TOKEN}`,
    'User-Agent': `${name} ${version}`
  }
}

const WHERE_ERROR = '"where" argument should be a string or an array.'

let tickerWarn = () => false

const RETRY_OPTS = {
  retries: 10,
  factor: 4,
  minTimeout: 4 * MIN_WAIT,
  maxTimeout: 30 * 60 * 1000,
  randomize: true,
  onFailedAttempt: error => {
    tickerWarn(`${new Date().toISOString()} ${error.toString()}`)
    tickerWarn(
      `${new Date().toISOString()} Attempt ${
        error.attemptNumber
      } failed. There are ${error.attemptsLeft} attempts left.`
    )

    debug(error.toString())
    debug(
      `Attempt ${error.attemptNumber} failed. There are ${
        error.attemptsLeft
      } attempts left.`
    )
  }
}

const localFile = path => readFileSync(join(__dirname, path), 'utf-8')

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

const gotRetry = (query, variables) => {
  const gotRun = () =>
    got('https://api.github.com/graphql', {
      ...GOT_OPTS,
      body: { query, variables }
    })
      .then(ret => {
        debug(ret.headers)
        debug(Object.keys(ret.body))
        return ret
      })
      .catch(error => {
        debug('ERROR', error)
        throw error.statusCode === 401 ? new pRetry.AbortError(error) : error
        /*
        if (error.statusCode === 401) {
          throw new pRetry.AbortError(error)
        }
        throw error
        */
      })

  return pRetry(gotRun, RETRY_OPTS)
}

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

    const { body: { data, errors } } = await gotRetry(query, variables)

    if (errors) {
      const err = new Error(`GraphQL: ${errors[0].message}`)
      err.errors = JSON.stringify(errors)
      if (data) {
        err.data = JSON.stringify(data)
      }
      throw err
    }
    if (!data || !data.search) {
      throw new Error('No data or data.search found.')
    }

    if (!data.search.edges || !data.search.edges.length) {
      data.search.edges = []
      return data
    }

    return data
  } catch (e) {
    throw e
  }
}

const throttle = async (then, userCount, nPerQuery, rateLimit) => {
  const now = Date.now()
  const remaining = rateLimit.remaining || rateLimit.limit
  const elapsed = now - then
  debug('elapsed, rateLimit:', elapsed, rateLimit)
  const ttt = Math.round(
    (Date.parse(rateLimit.resetAt) - now) /
      Math.round(remaining / rateLimit.cost)
  )

  const nQueries = Math.round(userCount / nPerQuery)
  const timeNeeded = Math.round(nQueries * ttt)
  const timeUntilReset = Date.parse(rateLimit.resetAt) - now
  const costNeeded = rateLimit.cost * nQueries

  let ms

  if (rateLimit.cost > remaining) {
    ms = timeUntilReset + 2 * MIN_WAIT
  } else if (timeNeeded > timeUntilReset && costNeeded > remaining) {
    ms = Math.max(MIN_WAIT, Math.round(0.75 * (ttt - Math.round(elapsed))))
  } else {
    ms = MIN_WAIT
  }

  debug('nQueries:', nQueries)
  debug('timeNeeded:', timeNeeded)
  debug('timeUntilReset:', timeUntilReset)
  debug('costNeeded:', costNeeded)
  debug('ms:', ms)

  await delay(ms)

  if (process.env.DEBUG === name) {
    console.error()
  }
}

const graphqlGot = async (where, query, variables = {}, tick = false) => {
  let r2
  let first = true
  let data
  let result = []
  let lastCreated
  try {
    let after = false
    let created
    let userCount
    do {
      const then = Date.now()
      data = await graphqlGotImp(where, query, { ...variables, after, created })

      if (data.search.edges.length) {
        lastCreated =
          data.search.edges[data.search.edges.length - 1].node.createdAt
      }

      debug('lastCreated:', lastCreated)

      r2 = result.length
      result = uniqBy(result.concat(data.search.edges), 'node.databaseId')

      if (!userCount) {
        userCount = data.search.userCount
      }

      if (tick) {
        if (first) {
          tickerWarn = warn => tick(0, { warn })
          tick(result.length - r2, { total: userCount })
          first = false
        } else {
          tick(result.length - r2)
        }
      }

      debug('result.length, userCount:', result.length, userCount)
      after = data.search.pageInfo.hasNextPage && data.search.pageInfo.endCursor
      if (after) {
        await throttle(
          then,
          userCount - result.length,
          data.search.edges.length,
          data.rateLimit
        )
      } else {
        created = result.length < userCount && lastCreated
        debug('created', created)
        debug('created', created)
      }
    } while (after || created)

    if (result.length) {
      data.search.edges = result
    }
    return data
  } catch (e) {
    debug('FIXME?')
    debug('lastCreated:', lastCreated)
    debug(e)
    if (
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
    throw e
  }
}

module.exports = graphqlGot
module.exports.deburred = deburred
module.exports.localFile = localFile
