'use strict'

// npm
const pMap = require('p-map')
const { fetchContribs } = require('rollodeqc-gh-user-streak')
const { weekNumber } = require('weeknumber')
const groupBy = require('lodash.groupby')

const mapper = ({ login, databaseId }) => {
  const fetchedAt = new Date().toISOString()
  const ret = { fetchedAt, login, databaseId }
  return fetchContribs(login)
    .then(
      contribs => (contribs && contribs.length ? { ...ret, contribs } : ret)
    )
    .catch(error => ({
      ...ret,
      error: {
        string: error.toString(),
        statusCode: error.statusCode,
        url: error.url
      }
    }))
}

const byWeek = ({ count, date }) => {
  const year = date.slice(0, 4)
  const wn = weekNumber(new Date(date))
  return `${year}-${wn}`
}

const doit = data => {
  const elOutput = []

  data.forEach(({ login, databaseId, contribs }) => {
    const contribsZeroes = []
    if (contribs && contribs.length > 1) {
      const contribDays = {}
      contribs.forEach(({ date, count }) => {
        contribDays[date] = count
      })

      const last = Date.parse(contribs[contribs.length - 1].date)
      const first = Math.min(
        last - 140 * 86400000,
        Date.parse(contribs[0].date)
      )

      let r
      let date
      for (r = first; r <= last; r += 86400000) {
        date = new Date(r).toISOString().slice(0, 10)
        contribsZeroes.push({
          date,
          count: contribDays[date] || 0
        })
      }
    } else {
      if (contribs && contribs[0]) {
        contribsZeroes.push(contribs[0])
      }
    }

    const grouped = groupBy(contribsZeroes, byWeek)

    const perWeek = []

    let week
    let count

    for (week in grouped) {
      count = grouped[week].reduce((a, { count }) => a + count, 0)
      perWeek.push({
        count,
        week
      })
    }

    const last20 = perWeek
      .reverse()
      .slice(0, 20)
      .map(({ count }) => count)

    let pad
    const length = 20 - last20.length
    if (length) {
      pad = Array(length).fill(0)
    } else {
      pad = []
    }

    const output = [...last20, ...pad]

    const woot = {
      login,
      databaseId,
      output
    }

    if (output.filter(Boolean).length) {
      woot.lastContribDate = contribsZeroes[contribsZeroes.length - 1].date
      woot.sum2 = output.reduce((a, b) => a + b, 0)
    }

    elOutput.push(woot)
  })

  return elOutput
}

const sparks = async fn => {
  const users = require(fn).users.map(({ login, databaseId }) => ({
    login,
    databaseId
  }))
  const allContribs = await pMap(users, mapper, { concurrency: 10 })
  return doit(allContribs)
}

module.exports = sparks
