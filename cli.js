#!/usr/bin/env node

'use strict'

// core
const { readFileSync } = require('fs')
const { basename } = require('path')

// npm
const meow = require('meow')
const marked = require('marked')
const TerminalRenderer = require('marked-terminal')

// self
const graphqlGot = require('.')
const { localFile, deburred } = require('.')
const { name } = require('./package.json')

marked.setOptions({
  renderer: new TerminalRenderer()
})

const readme = marked(localFile('README.md'))

const run = async cli => {
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
      cli.flags.query &&
        readFileSync(
          `${basename(cli.flags.query, '.graphql')}.graphql`,
          'utf-8'
        )
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
    $ ${name} <location> [<location> ...]

  Options
    --readme   -r   Show readme
    --pretty,  -p   Pretty output
    --verbose, -v   Verbose mode
    --query,   -q   Query to run

  Examples
    $ ghraphql Montréal
    // searches for montreal and montréal

    $ ghraphql Montréal "saint jean"
    // searches for montreal, montréal and "saint jean"
`,
    {
      flags: {
        query: {
          type: 'string',
          alias: 'q'
        },
        readme: {
          type: 'boolean',
          alias: 'r'
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
