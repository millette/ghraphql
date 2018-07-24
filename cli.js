#!/usr/bin/env node

'use strict'

// core
const { readFileSync, writeFileSync } = require('fs')
const { basename } = require('path')

// npm
const meow = require('meow')
const marked = require('marked')
const TerminalRenderer = require('marked-terminal')
const ProgressBar = require('progress')

// self
const graphqlGot = require('.')
const { localFile, deburred } = require('.')
const { name } = require('./package.json')

const BAR_THROTTLE = 300

marked.setOptions({
  renderer: new TerminalRenderer()
})

const readme = marked(localFile('README.md'))

const run = async cli => {
  let timing
  let estimator

  const startTime = Date.now()

  // FIXME: use last 5, 10 and 15 minutes
  // to measure average durations
  const makeApprox = bar =>
    bar.curr &&
    Math.round((Date.now() - startTime) / 1000 * bar.total / bar.curr)

  try {
    if (cli.flags.readme) {
      return console.log(readme)
    }
    if (!cli.input.length) {
      throw new Error(`
  Missing required location argument.
  Prefer "montréal" over "montreal"
  and use quotes to handle spaces in locations.
  ${cli.help}`)
    }

    const variables = {
      created: cli.flags.before,
      lastStarred: parseInt(cli.flags.lastStarred, 10),
      lastRepos: parseInt(cli.flags.lastRepos, 10),
      lastStargazers: parseInt(cli.flags.lastStargazers, 10)
    }

    if (cli.flags.verbose) {
      const locations = deburred(cli.input)
      if (locations.length > 1) {
        console.error('Locations:', locations.join(', '))
      } else {
        console.error('Location:', locations[0])
      }
    }

    let bar

    const tick =
      cli.flags.verbose &&
      ((n, { total, warn } = {}) => {
        if (total) {
          console.error('Number of results:', total)
        }

        if (total && !bar) {
          if (process.stderr.columns < 60) {
            console.error('Terminal is very narrow')
          }

          const width = Math.max(15, Math.min(100, process.stderr.columns) - 45)
          // FIXME: split on 2 lines or more (or use multiple bars)
          bar = new ProgressBar(
            ':bar :percent :elapseds :etas :approxs :rate users/s :current',
            {
              head: '>',
              total,
              width,
              renderThrottle: BAR_THROTTLE
            }
          )
        } else {
          if (!bar) {
            return
          }
          if (warn) {
            bar.interrupt(warn)
          } else {
            bar.tick(n, {
              approx: makeApprox(bar)
            })
          }
        }
      })

    if (cli.flags.verbose) {
      timing = setInterval(() => {
        if (!bar) {
          return
        }
        bar.tick(0)
        if (bar.complete) {
          clearInterval(timing)
        }
      }, BAR_THROTTLE)

      estimator = setInterval(() => {
        if (bar && bar.total) {
          const approx = makeApprox(bar)
          if (!approx) {
            return
          }
          const min = Math.floor(approx / 60)
          const sec = approx - min * 60
          bar.interrupt(
            `Initial estimated duration: ${min}m${sec}s (${approx}s)`
          )
          clearInterval(estimator)
        }
      }, 20000)
    }

    const body = await graphqlGot(
      cli.input,
      cli.flags.query &&
        readFileSync(
          `${basename(cli.flags.query, '.graphql')}.graphql`,
          'utf-8'
        ),
      variables,
      tick
    )

    if (cli.flags.verbose) {
      console.error()
    }

    clearInterval(timing)
    clearInterval(estimator)

    if (cli.flags.verbose) {
      console.error('Results found:', body.search.edges.length)
      console.error('Rate limits:', body.rateLimit)
      if (body.search.edges.length) {
        console.error(
          'Last date:',
          body.search.edges[body.search.edges.length - 1].node.createdAt
        )
      }
    }
    const output = JSON.stringify(body, null, cli.flags.pretty ? '  ' : '')
    if (cli.flags.output) {
      writeFileSync(cli.flags.output, output)
    } else {
      console.log(output)
    }
  } catch (e) {
    clearInterval(timing)
    clearInterval(estimator)
    console.error(e.errors ? e : e.toString())
  }
}

run(
  meow(
    `
  Usage
    $ ${name} <location> [<location> ...]

  Options
    --readme                Show readme
    --verbose           -v  Verbose mode
    --pretty            -p  Pretty output
    --output            -o  Output to file
    --before            -b  Before date, 2018-06-21 or 2018-07-21T10:40:40Z
    --last-starred      -s  Include these last starred repositories (50)
    --last-repos        -r  Include these last repositories contributed to (50)
    --last-stargazers   -g  Include these last stargazers (50)
    --query             -q  Query to run

  Examples
    $ ghraphql Montréal
    // searches for montreal and montréal

    $ ghraphql Montréal "saint jean"
    // searches for montreal, montréal and "saint jean"
`,
    {
      flags: {
        output: {
          type: 'string',
          alias: 'o'
        },
        before: {
          type: 'string',
          alias: 'b'
        },
        'last-starred': {
          type: 'string',
          alias: 's'
        },
        'last-repos': {
          type: 'string',
          alias: 'r'
        },
        'last-stargazers': {
          type: 'string',
          alias: 'g'
        },
        query: {
          type: 'string',
          alias: 'q'
        },
        readme: {
          type: 'boolean'
        },
        help: {
          type: 'boolean',
          alias: 'h'
        },
        verbose: {
          type: 'boolean',
          alias: 'v'
        },
        pretty: {
          type: 'boolean',
          alias: 'p'
        }
      }
    }
  )
)
