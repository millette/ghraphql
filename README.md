# ghraphql

Search GitHub for users by location.

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
