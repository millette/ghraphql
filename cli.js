#!/usr/bin/env node

'use strict'

// core
const { readFileSync } = require('fs')
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
  // let etaTimer

  const startTime = Date.now()

  /*
  const etaTimerFn = (bar, n = 15000) => {
    etaTimer = setTimeout(() => {
      if (!bar || !bar.curr || !bar.total) { return etaTimerFn(bar, n) }
      // in 30 seconds, we did bar.curr / bar.total
      // 30 = bar.curr
      // x = bar.total
      // 5% en 30s; 20 x 30s = 600s approx.
      //
      bar.interrupt(`Approx. ${Math.round(((Date.now() - startTime) / 1000) * bar.total / bar.curr)}s`)
      etaTimerFn(bar, Math.min(120000, n * 2))
    }, n)
  }
  */

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
      lastStarred: parseInt(cli.flags.lastStarred, 10),
      lastRepos: parseInt(cli.flags.lastRepos, 10),
      lastStargazers: parseInt(cli.flags.lastStargazers, 10)
    }

    if (cli.flags.verbose) {
      const locations = deburred(cli.input)
      if (locations.length > 1) {
        console.error('Locations:', locations)
      } else {
        console.error('Location:', locations[0])
      }
    }

    let bar

    const tick = (n, { total, warn } = {}) => {
      if (cli.flags.verbose && total) {
        console.error('Number of results:', total)
      }

      if (total && !bar) {
        if (process.stderr.columns < 50) {
          console.error('Terminal is very narrow')
        }

        const width = Math.min(100, process.stderr.columns) - 38
        bar = new ProgressBar(
          ':bar :percent :elapseds :etas :approxs :rate users/s',
          {
            head: '>',
            total,
            width,
            renderThrottle: BAR_THROTTLE
          }
        )

        // etaTimerFn(bar)
      } else {
        if (warn) {
          bar.interrupt(warn)
        } else {
          bar.tick(n, {
            approx: Math.round(
              (Date.now() - startTime) / 1000 * bar.total / bar.curr
            )
          })
        }
      }
    }

    timing = setInterval(() => {
      if (!bar) {
        return
      }
      bar.tick(0)
      if (bar.complete) {
        clearInterval(timing)
      }
    }, BAR_THROTTLE)

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

    clearInterval(timing)
    // clearTimeout(etaTimer)

    if (cli.flags.verbose) {
      console.error('Results found:', body.search.edges.length)
    }
    console.log(JSON.stringify(body, null, cli.flags.pretty ? '  ' : ''))
  } catch (e) {
    clearInterval(timing)
    // clearTimeout(etaTimer)
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
    --pretty            -p  Pretty output
    --verbose           -v  Verbose mode
    --query             -q  Query to run
    --last-starred      -s  Include these last starred repositories (50)
    --last-repos        -r  Include these last repositories contributed to (50)
    --last-stargazers   -g  Include these last stargazers (50)

  Examples
    $ ghraphql Montréal
    // searches for montreal and montréal

    $ ghraphql Montréal "saint jean"
    // searches for montreal, montréal and "saint jean"
`,
    {
      flags: {
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
