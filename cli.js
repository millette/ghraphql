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

  Examples
    $ cli Montréal
    // searches for montreal and montréal

    $ cli Montréal "saint jean"
    // searches for montreal, montréal and "saint jean"
`,
  {
    flags: {
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

if (cli.input.length) {
  if (cli.flags.verbose) {
    const locations = graphqlGot.deburred(cli.input)
    console.error('Locations:', locations)
  }
  const query = readFileSync('query.graphql', 'utf-8')

  graphqlGot(cli.input, query)
    .then(body => {
      if (cli.flags.verbose) {
        console.error('Results found:', body.search.edges.length)
      }
      console.log(JSON.stringify(body, null, cli.flags.pretty ? '  ' : ''))
    })
    .catch(console.error)
} else {
  console.error(`Missing required argument: location.
Prefer "montréal" over "montreal"
and use quotes to handle spaces in locations.
${cli.help}
`)
}
