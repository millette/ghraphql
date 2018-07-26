'use strict'

const norm = require('normalize-email-or-url')

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
  const starLanguages = new Map()
  if (z.starredRepositories) {
    z.starredRepositories.forEach(x => {
      if (x.primaryLanguage) {
        starLanguages.set(
          x.primaryLanguage,
          (starLanguages.get(x.primaryLanguage) || 0) + 1
        )
      }
    })
  }

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

  if (!repoLanguages.size && !starLanguages.size) {
    return
  }
  const ret = {}

  if (repoLanguages.size) {
    ret.repoLanguages = Array.from(repoLanguages)
      .sort(sorter)
      .reverse()
      .map(([name, count]) => ({ name, count }))
  }

  if (starLanguages.size) {
    ret.starLanguages = Array.from(starLanguages)
      .sort(sorter)
      .reverse()
      .map(([name, count]) => ({ name, count }))
  }

  return ret
}

const addLanguages = x => {
  const la = allUserLanguages(x)
  if (!la) {
    return x
  }
  if (la.repoLanguages) {
    x.repoLanguages = la.repoLanguages
  }

  if (la.starLanguages) {
    x.starLanguages = la.starLanguages
  }
  return x
}

const fixStars = z => {
  if (!z || !z.length) {
    return
  }
  const all = z.filter(x => x && x.node).map(x => {
    const ret = {
      starredAt: x.starredAt,
      nameWithOwner: x.node.nameWithOwner
    }

    if (x.node.primaryLanguage && x.node.primaryLanguage.name) {
      ret.primaryLanguage = x.node.primaryLanguage.name
    }
    return ret
  })

  if (all.length) {
    return all
  }
}

const fixStargazers = z => {
  if (!z || !z.length) {
    return
  }
  const all = z.filter(x => x && x.node).map(x => {
    const ret = {
      starredAt: x.starredAt,
      createdAt: x.node.createdAt,
      login: x.node.login,
      databaseId: x.node.databaseId
    }

    if (x.node.location) {
      ret.location = x.node.location
    }

    return ret
  })

  if (all.length) {
    return all
  }
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

      if (x.stargazers) {
        if (x.stargazers.totalCount) {
          ret.stargazersCount = x.stargazers.totalCount
        }
        if (x.stargazers.edges && x.stargazers.edges.length) {
          const gazers = fixStargazers(x.stargazers.edges)
          if (gazers) {
            ret.stargazers = gazers
          }
        }
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
  let stars
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
        if (
          !x.starredRepositories.edges ||
          !x.starredRepositories.edges.length
        ) {
          continue
        }
        stars = fixStars(x.starredRepositories.edges)
        if (stars) {
          ret.starredRepositories = stars
        }
        break

      case 'repositoriesContributedTo':
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
}

const accumulator = (g, acc, b) => {
  if (b[g]) {
    // b[g].forEach(x => acc.set(x.name, (acc.get(x.name) || 0) + x.count)) // count total projects
    b[g].forEach(x => acc.set(x.name, (acc.get(x.name) || 0) + 1)) // count total users
  }
  return acc
}

const allLanguagesImp = (f, zz) =>
  Array.from(zz.reduce(accumulator.bind(null, f), new Map()))
    .sort(sorter)
    .reverse()
    .map(([name, count]) => ({ name, count }))

const process = data => {
  const i2 = data && data.search && data.search.edges.map(({ node }) => node)
  if (!i2) {
    return
  }
  const users = i2.map(slim)
  const repoLanguages = allLanguagesImp('repoLanguages', users)
  const starLanguages = allLanguagesImp('starLanguages', users)
  data.meta.processedAt = new Date().toISOString()
  return {
    meta: data.meta,
    users,
    repoLanguages,
    starLanguages
  }
}

module.exports = process