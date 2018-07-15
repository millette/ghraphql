'use strict'

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
  graphqlGot(cli.input)
    .then(body => {
      if (cli.flags.verbose) {
        console.error('Results found:', body.search.edges.length)
      }
      console.log(JSON.stringify(body, null, '  '))
    })
    .catch(console.error)
} else {
  console.error(`Missing required argument: location.
Prefer "montréal" over "montreal"
and use quotes to handle spaces in locations.
${cli.help}
`)
}
