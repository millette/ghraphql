'use strict'

// npm
const norm = require('normalize-email-or-url')
const groupBy = require('lodash.groupby')
const countBy = require('lodash.countby')
const uniq = require('lodash.uniq')
const intersectionWith = require('lodash.intersectionwith')

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

const addLanguages = x => {
  const la = allUserLanguages(x)

  if (la && la.repoLanguages) {
    x.repoLanguages = la.repoLanguages
  }

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
        const { detectedLanguage, frequencies } = words(x.description)
        ret.keywords = frequencies
        if (detectedLanguage) {
          ret.detectedLanguage = detectedLanguage
        }
      }

      if (x.stargazers && x.stargazers.totalCount) {
        ret.stargazersCount = x.stargazers.totalCount
      }

      if (x.watchers && x.watchers.totalCount) {
        ret.watchersCount = x.watchers.totalCount
      }

      return ret
    })

  if (all.length) {
    return all
  }
}

const mergeRepos = x => ({
  ...x,
  repositoriesContributedTo: {
    edges: [...x.repositories.edges, ...x.repositoriesContributedTo.edges],
    totalCount:
      x.repositories.totalCount + x.repositoriesContributedTo.totalCount
  },
  repositories: undefined
})

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
        if (x.starredRepositories.totalCount) {
          ret.starredRepositoriesCount = x.starredRepositories.totalCount
          ret.starredRepositories = fixRepos(x.starredRepositories.edges)
        }
        break

      case 'repositoriesContributedTo':
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
}

const accumulator = (acc, b) => {
  if (b.repoLanguages) {
    b.repoLanguages.forEach(x => acc.set(x.name, (acc.get(x.name) || 0) + 1)) // count total users
  }
  return acc
}

const allLanguagesImp = zz =>
  Array.from(zz.reduce(accumulator, new Map()))
    .sort(sorter)
    .reverse()
    .map(([name, count]) => ({ name, count }))

const userLicenses = u => {
  const z = countBy(u.repositoriesContributedTo, 'license')
  delete z.undefined
  const g = []
  let license
  for (license in z) {
    g.push([license, z[license]])
  }

  if (!g.length) {
    return u
  }
  u.licenses = g
    .sort(sorter)
    .reverse()
    .map(([license, count]) => ({ license, count }))

  return u
}

const userWords = u => {
  const s = groupBy(u.repositoriesContributedTo, 'detectedLanguage')
  delete s.undefined
  if (!Object.keys(s).length) {
    return u
  }
  let r
  const sums = new Map()
  for (r in s) {
    sums.set(r, new Map())
    s[r].forEach(g => {
      g.keywords.forEach(k =>
        sums.get(r).set(k.word, (sums.get(r).get(k.word) || 0) + k.count)
      )
    })
  }
  // FIXME: also use bio for keywords when available
  const keywords = {}
  sums.forEach((v, k) => {
    keywords[k] = Array.from(v)
      .sort(sorter)
      .reverse()
      .map(([word, count]) => ({ word, count }))
  })
  const kw2 = []
  for (r in keywords) {
    kw2.push({
      language: r,
      keywords: keywords[r]
    })
  }

  u.repositoriesContributedTo.forEach(z => {
    delete z.keywords
  })

  u.keywords = kw2
  return u
}

const allWords = d => {
  const sums = new Map()
  d.users
    .filter(u => u.keywords)
    .forEach(u => {
      u.keywords.forEach(({ language, keywords }) => {
        if (!sums.get(language)) {
          sums.set(language, new Map())
        }
        keywords.forEach(({ word, count }) => {
          sums
            .get(language)
            .set(word, (sums.get(language).get(word) || 0) + count)
        })
      })
    })

  const keywords = {}
  sums.forEach((v, k) => {
    keywords[k] = Array.from(v)
      .sort(sorter)
      .reverse()
      .map(([word, count]) => ({ word, count }))
  })

  let r
  const kw2 = []
  for (r in keywords) {
    kw2.push({
      language: r,
      keywords: keywords[r]
    })
  }

  d.keywords = kw2
  return d
}

const process = data => {
  const i2 = data && data.search && data.search.edges.map(({ node }) => node)
  if (!i2) {
    return
  }
  const users = i2
    .map(mergeRepos)
    .map(slim)
    .map(userWords)
    .map(userLicenses)

  data.meta.processedAt = new Date().toISOString()
  const usedLicenses = uniq(
    users
      .map(x => {
        if (!x.licenses || !x.licenses.length) {
          return
        }
        return x.licenses.map(y => y.license)
      })
      .filter(Boolean)
      .reduce((a, b) => [...a, ...b], [])
  )

  return allWords({
    meta: data.meta,
    licenses: intersectionWith(
      data.licenses,
      usedLicenses,
      (a, b) => a.spdxId === b
    ),
    users,
    repoLanguages: allLanguagesImp(users)
  })
}

module.exports = process
