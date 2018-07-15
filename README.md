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
