#!/usr/bin/env node

"use strict"

// core
const { readFileSync, writeFileSync } = require("fs")
const { resolve, dirname, basename, format } = require("path")

// npm
const meow = require("meow")
const marked = require("marked")
const TerminalRenderer = require("marked-terminal")
const ProgressBar = require("progress")
const mkdirp = require("mkdirp").sync
const delay = require("delay")

// self
const graphqlGot = require(".")
const { githubColors, localFile, deburred } = graphqlGot
const { name } = require("./package.json")
const sparks = require("./lib/sparks")

const BAR_THROTTLE = 300

marked.setOptions({
  renderer: new TerminalRenderer(),
})

const readme = marked(localFile("README.md"))

const normalizePath = (fn, ext) =>
  resolve(
    format({
      dir: dirname(fn),
      name: basename(fn, ext),
      ext,
    })
  )

const run = async (cli) => {
  let timing
  let estimator

  const startTime = Date.now()

  const write = (content, ext) => {
    const fn = normalizePath(cli.flags.output, ext)
    mkdirp(dirname(fn))
    writeFileSync(fn, content)
  }

  // FIXME: use last 5, 10 and 15 minutes
  // to measure average durations
  const makeApprox = (bar) =>
    bar.curr &&
    Math.round((((Date.now() - startTime) / 1000) * bar.total) / bar.curr)

  try {
    if (cli.flags.readme) {
      return console.log(readme)
    }

    if (cli.flags.sparks) {
      if (!cli.flags.config) {
        throw new Error(
          "When using the --sparks flag, the --config flag is required."
        )
      }

      const dir = dirname(cli.flags.config)
      const ghDataFn = normalizePath(resolve(dir, "data/gh-users.json"))
      const json = await sparks(ghDataFn, cli.flags.verbose && ProgressBar)
      const output = JSON.stringify(json, null, cli.flags.pretty ? "  " : "")

      if (!cli.flags.output) {
        cli.flags.output = resolve(dir, "data/sparks.json")
      }

      write(output, ".json")
      return
    }

    if (cli.flags.colors) {
      const json = await githubColors()
      const output = JSON.stringify(json, null, cli.flags.pretty ? "  " : "")

      if (!cli.flags.output && cli.flags.config) {
        cli.flags.output = resolve(
          dirname(cli.flags.config),
          "data/language-colors.json"
        )
      }

      if (cli.flags.output) {
        write(output, ".json")
      } else {
        console.log(output)
      }

      return
    }

    if (cli.flags.config) {
      const { locationSearch } = require(normalizePath(cli.flags.config))
      if (locationSearch) {
        if (cli.input.length) {
          console.error("Ignoring command-line locations", cli.input)
          console.log("Using config.js locationSearch field instead.")
        }
        if (typeof locationSearch === "string") {
          cli.input = [locationSearch]
        } else {
          cli.input = locationSearch
        }
      }
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
      lastRepos: parseInt(cli.flags.lastRepos, 10),
    }

    if (cli.flags.verbose) {
      const locations = deburred(cli.input)
      if (locations.length > 1) {
        console.error("Locations:", locations.join(", "))
      } else {
        console.error("Location:", locations[0])
      }
    }

    let bar

    const tick =
      cli.flags.verbose &&
      ((n, { total, warn } = {}) => {
        if (total) {
          console.error("Expected results:", total)
        }

        if (total && !bar) {
          if (process.stderr.columns < 60) {
            console.error("Terminal is very narrow")
          }

          const width = Math.max(15, Math.min(100, process.stderr.columns) - 45)
          // FIXME: split on 2 lines or more (or use multiple bars)
          bar = new ProgressBar(
            ":bar :percent :elapseds :etas :approxs :rate users/s :current",
            {
              head: ">",
              total,
              width,
              renderThrottle: BAR_THROTTLE,
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
              approx: makeApprox(bar),
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

    if (cli.flags.repos) {
      cli.flags.query = "projects"
      /*
      const oyoy = readFileSync(normalizePath(cli.flags.query, '.graphql'), 'utf-8')
      // console.log('query (projects):', oyoy)
      const elelbody = await graphqlGot(cli.input, oyoy)
      // console.log('elelbody:', JSON.stringify(elelbody, null, '  '))
      return
      */
    }

    const body = await graphqlGot(
      cli.input,
      cli.flags.query &&
        readFileSync(normalizePath(cli.flags.query, ".graphql"), "utf-8"),
      variables,
      tick
    )

    clearInterval(estimator)
    clearInterval(timing)

    const output = JSON.stringify(body, null, cli.flags.pretty ? "  " : "")

    if (!cli.flags.output && cli.flags.config) {
      cli.flags.output = resolve(
        dirname(cli.flags.config),
        "data/gh-users.json"
      )
    }

    if (cli.flags.output) {
      write(output, ".json")
    }

    await delay(500)
    if (cli.flags.verbose) {
      console.error("\n\nResults found:", body.users.length)
      if (body.users.length) {
        console.error("Last date:", body.users[body.users.length - 1].createdAt)
      }
    }

    if (!cli.flags.output) {
      console.log(output)
    }
  } catch (e) {
    clearInterval(estimator)
    clearInterval(timing)
    await delay(500)
    console.error("\n\n", e.errors ? e : e.toString())
    console.error(e)
    if (e.headers) {
      console.error("headers:", e.headers)
    }
    if (e.data) {
      console.error("data:", e.data)
    }
    process.exitCode = e.statusCodes || 127
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
    --config                Specify config file
    --pretty            -p  Pretty output
    --output            -o  Output to file
    --repos                 Fetch repositories
    --sparks            -s  Fetch contributions and generate week-based sparkline data
    --colors            -c  Fetch GitHub language colors
    --before            -b  Before date, 2018-06-21 or 2018-07-21T10:40:40Z
    --last-repos        -r  Include these last repositories contributed to (50)
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
          type: "string",
          alias: "o",
        },
        config: {
          type: "string",
        },
        before: {
          type: "string",
          alias: "b",
        },
        "last-repos": {
          type: "string",
          alias: "r",
        },
        query: {
          type: "string",
          alias: "q",
        },
        readme: {
          type: "boolean",
        },
        help: {
          type: "boolean",
          alias: "h",
        },
        verbose: {
          type: "boolean",
          alias: "v",
        },
        pretty: {
          type: "boolean",
          alias: "p",
        },
        repos: {
          type: "boolean",
        },
        sparks: {
          type: "boolean",
          alias: "s",
        },
        colors: {
          type: "boolean",
          alias: "c",
        },
      },
    }
  )
)
