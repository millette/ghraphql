'use strict'

// npm
const norm = require('normalize-email-or-url')

// self
const words = require('./words')

const sorter = (a, b) => {
  if (a[1] > b[1]) {
    return 1
  }
  if (a[1] < b[1]) {
    return -1
  }
  return 0
}

/*
const allUserKeywords = z => {
  const repoKeywords = new Map()
  if (z.repositoriesContributedTo) {
    z.repositoriesContributedTo.forEach(x => {
      if (x.primaryLanguage) {
        repoLanguages.set(
          x.primaryLanguage,
          (repoLanguages.get(x.primaryLanguage) || 0) + 1
        )
      }
    })
  }

  if (!repoLanguages.size) {
    return
  }
  const ret = {}

  if (repoLanguages.size) {
    ret.repoLanguages = Array.from(repoLanguages)
      .sort(sorter)
      .reverse()
      .map(([name, count]) => ({ name, count }))
  }

  return ret
}
*/

const allUserLanguages = z => {
  const repoLanguages = new Map()
  if (z.repositoriesContributedTo) {
    z.repositoriesContributedTo.forEach(x => {
      if (x.primaryLanguage) {
        repoLanguages.set(
          x.primaryLanguage,
          (repoLanguages.get(x.primaryLanguage) || 0) + 1
        )
      }
    })
  }

  if (!repoLanguages.size) {
    return
  }
  const ret = {}

  if (repoLanguages.size) {
    ret.repoLanguages = Array.from(repoLanguages)
      .sort(sorter)
      .reverse()
      .map(([name, count]) => ({ name, count }))
  }

  return ret
}

// const addLanguagesAndKeywords = x => {
const addLanguages = x => {
  const la = allUserLanguages(x)

  if (la && la.repoLanguages) {
    x.repoLanguages = la.repoLanguages
  }

  /*
  const lb = allUserKeywords(x)
  if (lb && lb.repoKeywords) {
    x.repoKeywords = lb.repoKeywords
  }
  */

  return x
}

const fixRepos = z => {
  if (!z || !z.length) {
    return
  }
  const all = z
    .filter(x => x && x.node)
    .map(x => x.node)
    .map(x => {
      const ret = {
        nameWithOwner: x.nameWithOwner
      }

      if (x.forkCount) {
        ret.forkCount = x.forkCount
      }
      if (x.primaryLanguage && x.primaryLanguage.name) {
        ret.primaryLanguage = x.primaryLanguage.name
      }

      if (x.licenseInfo && x.licenseInfo.spdxId) {
        ret.license = x.licenseInfo.spdxId
      }

      if (x.description) {
        ret.description = x.description
        // FIXME: proper keyword extraction
        const { detectedLanguage, frequencies } = words(x.description)
        ret.keywords = frequencies
        if (detectedLanguage) {
          ret.detectedLanguage = detectedLanguage
        }
      }

      // stargazers
      if (x.stargazers && x.stargazers.totalCount) {
        ret.stargazersCount = x.stargazers.totalCount
      }

      // watchers
      if (x.watchers && x.watchers.totalCount) {
        ret.watchersCount = x.watchers.totalCount
      }

      return ret
    })

  if (all.length) {
    return all
  }
}

const slim = x => {
  const ret = {}
  let r
  let repos
  for (r in x) {
    if (!x[r]) {
      continue
    }

    switch (r) {
      case 'name':
        if (x.name !== x.login) {
          ret.name = x.name
        }
        break

      case 'starredRepositories':
        ret.starredRepositoriesCount = 0
        if (
          !x.starredRepositories ||
          !x.starredRepositories.edges ||
          !x.starredRepositories.edges.length
        ) {
          continue
        }
        if (x.starredRepositories.totalCount) {
          ret.starredRepositoriesCount = x.starredRepositories.totalCount
        }
        break

      case 'repositoriesContributedTo':
        ret.repositoriesContributedToCount = 0
        if (
          !x.repositoriesContributedTo.edges ||
          !x.repositoriesContributedTo.edges.length
        ) {
          continue
        }
        if (x.repositoriesContributedTo.totalCount) {
          ret.repositoriesContributedToCount =
            x.repositoriesContributedTo.totalCount
        }
        repos = fixRepos(x.repositoriesContributedTo.edges)
        if (repos) {
          ret.repositoriesContributedTo = repos
        }
        break

      case 'websiteUrl':
        ret.websiteUrl = norm(x.websiteUrl).url
        break

      case 'email':
        ret.email = norm(x.email).email
        break

      default:
        ret[r] = x[r]
    }
  }
  return addLanguages(ret)
  // return addLanguagesAndKeywords(ret)
}

/*
const accumulatorKeywords = (acc, b) => {
  if (b.repoLanguages) {
    b.repoLanguages.forEach(x => acc.set(x.name, (acc.get(x.name) || 0) + 1)) // count total users
  }
  return acc
}
*/

const accumulator = (acc, b) => {
  if (b.repoLanguages) {
    b.repoLanguages.forEach(x => acc.set(x.name, (acc.get(x.name) || 0) + 1)) // count total users
  }
  return acc
}

/*
const allKeywordsImp = (zz) =>
  Array.from(zz.reduce(accumulatorKeywords, new Map()))
    .sort(sorter)
    .reverse()
    .map(([word, count]) => ({ word, count }))
*/

const allLanguagesImp = zz =>
  Array.from(zz.reduce(accumulator, new Map()))
    .sort(sorter)
    .reverse()
    .map(([name, count]) => ({ name, count }))

const process = data => {
  const i2 = data && data.search && data.search.edges.map(({ node }) => node)
  if (!i2) {
    return
  }
  const users = i2.map(slim)
  const repoLanguages = allLanguagesImp(users)
  // const repoKeywords = allKeywordsImp(users)
  data.meta.processedAt = new Date().toISOString()
  console.error('nLicenses:', data.licenses.length)
  return {
    meta: data.meta,
    licenses: data.licenses,
    users,
    // repoKeywords,
    repoLanguages
  }
}

module.exports = process
