# ghraphql

Search GitHub for users by location.

## Install

```
$ npm install -g ghraphql
```

This will install the `ghraphql` command line client globally.

You'll need a GitHub account and a token. GitHub provides some [help on personal access token creation](https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line/).

You can [generate a new token](https://github.com/settings/tokens) and set it in your environment variables with the name `GITHUB_TOKEN` to configure `ghraphql`.

If your token is "The-Token", you can try the following:

```
$ GITHUB_TOKEN=The-Token ghraphql Montréal
```

Better to set it up properly in your `.bashrc` file or equivalent.

## Usage

```
$ ghraphql <location> [<location> ...]
```

## Options

```
--pretty,  -p   Pretty output
--verbose, -v   Verbose mode
--query,   -q   Query to run
```

## Examples

```
$ ghraphql Montréal
// searches for montreal and montréal

$ ghraphql Montréal "saint jean"
// searches for montreal, montréal and "saint jean"
```

## Features

* Use your own GraphQL queries on GitHub
* Automatically search for "montreal" too when given "montréal"
* JSON output

## Coming features

* Paging (over 100 results)
* Respect quotas (5000 query limit per hours and points)

## GraphQL

See [GitHub's GraphQL explorer](https://developer.github.com/v4/explorer/) to get an idea of the data available.

Use CTRL-SPACE to trigger autocompletion and discover supported fields and types.
