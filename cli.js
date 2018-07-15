'use strict'

// self
const graphqlGot = require('.')

graphqlGot('kinshasa')
  .then(body => console.log(JSON.stringify(body, null, '  ')))
  .catch(console.error)
