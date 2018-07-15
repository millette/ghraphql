'use strict'

// self
const graphqlGot = require('.')

const where = process.argv.slice(2)
if (where.length) {
  graphqlGot(where)
    .then(body => console.log(JSON.stringify(body, null, '  ')))
    .catch(console.error)
} else {
  console.error(
    'Required location argument. Prefer "montréal" to "montreal". You can pass many locations, use quotes "" or escape spaces.'
  )
}
