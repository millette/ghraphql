'use strict'

// core
const { readFileSync } = require('fs')

// npm
const meow = require('meow')

// self
const graphqlGot = require('.')

const run = async cli => {
  try {
    if (!cli.input.length) {
      throw new Error(`
  Missing required location argument.
  Prefer "montréal" over "montreal"
  and use quotes to handle spaces in locations.
  ${cli.help}`)
    }
    if (cli.flags.verbose) {
      const locations = graphqlGot.deburred(cli.input)
      if (locations.length > 1) {
        console.error('Locations:', locations)
      } else {
        console.error('Location:', locations[0])
      }
    }
    const body = await graphqlGot(
      cli.input,
      cli.flags.query && readFileSync(`${cli.flags.query}.graphql`, 'utf-8')
    )
    if (cli.flags.verbose) {
      console.error('Results found:', body.search.edges.length)
    }
    console.log(JSON.stringify(body, null, cli.flags.pretty ? '  ' : ''))
  } catch (e) {
    console.error(e.errors ? e : e.toString())
  }
}

run(
  meow(
    `
  Usage
    $ cli <location> [<location> ...]

  Options
    --pretty,  -p   Pretty output

    --verbose, -v   Verbose mode

    --query,   -q   Query to run

  Examples
    $ cli Montréal
    // searches for montreal and montréal

    $ cli Montréal "saint jean"
    // searches for montreal, montréal and "saint jean"
`,
    {
      flags: {
        query: {
          type: 'string',
          alias: 'q'
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
