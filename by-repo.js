'use strict'

// npm
// const groupBy = require('lodash.groupby')
const sortBy = require('lodash.sortby')

const dd = x => console.error(new Date().toISOString(), x)

// self
dd('start')
const { users } = require('./gat-repos-v3.json')
dd('loaded')
const projects = new Map()

dd('process')
users.forEach(u => {
  if (u.starredRepositories || u.starredRepositoriesV2) {
    ;(u.starredRepositories || u.starredRepositoriesV2).forEach(p => {
      const g = projects.get(p.nameWithOwner) || p
      g.rolloCountStars = (g.rolloCountStars || 0) + 1
      if (!g.rolloCountContribs) {
        g.rolloCountContribs = 0
      }
      if (!g.users) {
        g.users = []
      }
      g.users.push({ login: u.login, location: u.location, type: 'star' })
      if (!g.contribsProrata) {
        g.contribsProrata = 0
      }
      g.starsProrata =
        (g.rolloCountStars &&
          // g.stargazersCount > 9 &&
          g.rolloCountStars / g.stargazersCount) ||
        0
      projects.set(g.nameWithOwner, g)
    })
  }
  if (u.repositoriesContributedTo) {
    u.repositoriesContributedTo.forEach(p => {
      const g = projects.get(p.nameWithOwner) || p
      g.rolloCountContribs = (g.rolloCountContribs || 0) + 1
      if (!g.rolloCountStars) {
        g.rolloCountStars = 0
      }
      if (!g.users) {
        g.users = []
      }
      g.users.push({ login: u.login, location: u.location, type: 'contrib' })
      if (!g.starsProrata) {
        g.starsProrata = 0
      }
      g.contribsProrata =
        (g.rolloCountContribs &&
          // g.forkCount > 4 &&
          g.rolloCountContribs / (g.watchersCount + g.forkCount)) ||
        0
      projects.set(g.nameWithOwner, g)
    })
  }
})
dd('processed')
dd('toArray')
const repos = Array.from(projects.values())

// console.error(repos[0], Object.keys(repos[0]))

dd('toObj')
const obj = {
  nResults: {
    stars: repos.reduce((a, b) => a + b.rolloCountStars, 0),
    contribs: repos.reduce((a, b) => a + b.rolloCountContribs, 0),
    tot: repos.reduce((a, b) => a + b.rolloCountStars + b.rolloCountContribs, 0)
  },
  repos,
  contribs: sortBy(repos, 'rolloCountContribs')
    .reverse()
    .slice(0, 100),
  contribsProrata: sortBy(
    sortBy(repos, 'contribsProrata')
      .reverse()
      .slice(0, 500),
    'rolloCountContribs'
  )
    .reverse()
    .slice(0, 500),
  stars: sortBy(repos, 'rolloCountStars')
    .reverse()
    .slice(0, 100),
  starsProrata: sortBy(
    sortBy(repos, 'starsProrata')
      .reverse()
      .slice(0, 500),
    'rolloCountStars'
  )
    .reverse()
    .slice(0, 500),
  tot: sortBy(repos, a => a.rolloCountContribs + a.rolloCountStars)
    .reverse()
    .slice(0, 100)
}
dd('done')
console.log(JSON.stringify(obj, null, '  '))
