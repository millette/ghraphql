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

    const variables = {
      lastStarred: parseInt(cli.flags.lastStarred, 10),
      lastRepos: parseInt(cli.flags.lastRepos, 10),
      lastStargazers: parseInt(cli.flags.lastStargazers, 10)
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
        ),
      variables
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
