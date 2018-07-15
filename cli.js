'use strict'

// core
const { readFileSync } = require('fs')

// npm
const meow = require('meow')

// self
const graphqlGot = require('.')

const cli = meow(
  `
  Usage
    $ cli <input>

  Options
    --pretty, -p  Pretty output

    --verbose, -v Verbose mode

    --query, -q   Query to run

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
        default: 'query',
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

const run = async cli => {
  if (cli.input.length) {
    try {
      if (cli.flags.verbose) {
        const locations = graphqlGot.deburred(cli.input)
        console.error('Locations:', locations)
      }
      const query = readFileSync(`${cli.flags.query}.graphql`, 'utf-8')
      const body = await graphqlGot(cli.input, query)
      if (cli.flags.verbose) {
        console.error('Results found:', body.search.edges.length)
      }
      console.log(JSON.stringify(body, null, cli.flags.pretty ? '  ' : ''))
    } catch (e) {
      throw e
    }
  } else {
    console.error(`Missing required argument: location.
Prefer "montréal" over "montreal"
and use quotes to handle spaces in locations.
${cli.help}
`)
  }
}

run(cli).catch(console.error)
