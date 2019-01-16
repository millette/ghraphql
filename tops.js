'use strict'

// npm
// const groupBy = require('lodash.groupby')
// const sortBy = require('lodash.sortby')

// self
const data = require('./all-the-repos-top-100-v9.json')

const tot = data.contribsProrata.map(
  ({
    nameWithOwner,
    forkCount,
    primaryLanguage,
    license,
    description,
    detectedLanguage,
    stargazersCount,
    watchersCount,
    rolloCountStars,
    starsProrata,
    contribsProrata,
    // keywords,
    rolloCountContribs
  }) => ({
    nameWithOwner,
    forkCount,
    primaryLanguage,
    license,
    description,
    detectedLanguage,
    stargazersCount,
    watchersCount,
    rolloCountStars,
    starsProrata,
    contribsProrata,
    // keywords: keywords.slice(0, 5).join(', '),
    rolloCountContribs
  })
)

console.log('tot', JSON.stringify(tot, null, '  '))

/*
const xxx3 = groupBy(tot.map(({ nameWithOwner }) => ({
  nameWithOwner,
  owner: nameWithOwner.split('/')[0],
})), 'owner')

const xxx2 = new Map()
let r
for (r in xxx3) {
  xxx2.set(r, xxx3[r].length)
}

const xxx = Array.from(xxx2)
console.log('tot', JSON.stringify(sortBy(xxx, '1').reverse(), null, '  '))
*/

const tot2 = data.starsProrata.map(
  ({
    nameWithOwner,
    forkCount,
    primaryLanguage,
    license,
    description,
    detectedLanguage,
    stargazersCount,
    watchersCount,
    rolloCountStars,
    starsProrata,
    contribsProrata,
    // keywords,
    rolloCountContribs
  }) => ({
    nameWithOwner,
    forkCount,
    primaryLanguage,
    license,
    description,
    detectedLanguage,
    stargazersCount,
    watchersCount,
    rolloCountStars,
    starsProrata,
    contribsProrata,
    // keywords: keywords.slice(0, 5).join(', '),
    rolloCountContribs
  })
)

console.log('tot2', JSON.stringify(tot2, null, '  '))

/*
const xxx3 = groupBy(tot2.map(({ nameWithOwner }) => ({
  nameWithOwner,
  owner: nameWithOwner.split('/')[0],
})), 'owner')

const xxx2 = new Map()
let r
for (r in xxx3) {
  xxx2.set(r, xxx3[r].length)
}

const xxx = Array.from(xxx2)
console.log('tot', JSON.stringify(sortBy(xxx, '1').reverse(), null, '  '))
*/
