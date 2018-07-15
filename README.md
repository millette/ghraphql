# ghraphql

Search GitHub for users by location.

## Requirements

### GNU/Linux / Unix-like OS

This might work on MacOS and Microsoft Windows but I haven't tested it. Let me know!

### Node.js

You'll need Node.js. The quickest way to install it for your local user in the [n-install bash script](https://github.com/mklement0/n-install).

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
--readme   -r   Show readme
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
