# ghraphql

Search GitHub for users by location.

# TOC

- [Thank you!](#thank-you)
- [Requirements](#requirements)
  - [GNU/Linux / Unix-like OS](#gnulinux--unix-like-os)
  - [Node.js](#node-js)
  - [GitHub account and token](#github-account-and-token)
- [Install](#install)
- [Usage](#usage)
- [Options](#options)
- [Examples](#examples)
- [Features](#features)
- [GraphQL](#graphql)
- [See also](#see-also)
- [License](#license)

## Thank you!

A big thank you to [WikiSuite](https://wikisuite.org/) (and Marc Laporte) for their financial support of the RoLLodeQc relaunch. It would never have happened without them!

## Requirements

### GNU/Linux / Unix-like OS

This might work on MacOS and Microsoft Windows but I haven't tested it. Let me know!

### Node.js

You'll need Node.js. The quickest way to install it for your local user is the [n-install bash script](https://github.com/mklement0/n-install).

`git` and `curl` are required for `n-install`.

```
$ curl -L https://git.io/n-install | bash
```

This will install the latest LTS, which is 8.11.3 at the time of this writing.

You should restart your shell before using `node` and `npm` but first, setup your GitHub token so you only have to restart once.

### GitHub account and token

You'll need a GitHub account and a token. GitHub provides some [help on personal access token creation](https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line/).

You can [generate a new token](https://github.com/settings/tokens) and set it in your environment variables with the name `GITHUB_TOKEN` to configure `ghraphql`.

If your token is "The-Token", you can try the following:

```
$ GITHUB_TOKEN=The-Token ghraphql Montréal
```

Better to set it up properly in your `.bashrc` file or equivalent. You should now restart your shell for the changes to take effect.

## Install

Note that you don't need to install this separately if you're using the related [gatsby starter](https://github.com/millette/gatsby-starter-location-github) since it will be installed automatically as a dependency.

```
$ npm install -g ghraphql
```

This will install the `ghraphql` command line client globally.

## Usage

```
$ ghraphql <location> [<location> ...]
```

## Options

```
--readme                Show readme
--verbose           -v  Verbose mode
--config                Specify config file
--before            -b  Before date, 2018-06-21 or 2018-07-21T10:40:40Z
--pretty            -p  Pretty output
--output            -o  Output to file
--sparks            -s  Fetch contributions and generate week-based sparkline data
--colors            -c  Fetch GitHub language colors
--last-repos        -r  Include these last repositories contributed to (50)
--query             -q  Query to run
```

## Examples

```sh
$ ghraphql Montréal
// searches for montreal and montréal

$ ghraphql Montréal "saint jean"
// searches for montreal, montréal and "saint jean"

$ ghraphql --colors --pretty
// outputs a JSON of the GitHub language colors
```

## Features

- Use your own GraphQL queries on GitHub
- Automatically search for "montreal" too when given "montréal"
- JSON output

## GraphQL

See [GitHub's GraphQL explorer](https://developer.github.com/v4/explorer/) to get an idea of the data available.

Use CTRL-SPACE to trigger autocompletion and discover supported fields and types.

## See also

Mostly useful with [gatsby-starter-location-github](https://github.com/millette/gatsby-starter-location-github).

## License

AGPL-v3 2018 © [Robin Millette](http://robin.millette.info)
