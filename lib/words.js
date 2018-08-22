'use strict'

// npm
const words = require('lodash.words')
const countBy = require('lodash.countby')
const sortBy = require('lodash.sortby')
const deburr = require('lodash.deburr')
const difference = require('lodash.difference')
const stopwords = require('stopwords')
const franc = require('franc-min')

const universalStopwords = ['svn', 'git', 'http', 'https', 'org', 'com', 'net']

const supported = {
  en: { stopwords: [...stopwords.english, ...universalStopwords] },
  fr: { stopwords: [...stopwords.french, ...universalStopwords] }
}

const FALLBACK = 'en'

const extractKeywords = (str, limit) => {
  const allWords = words(deburr(str.toLowerCase().replace("'", ' '))).filter(
    a => a.length >= 2
  )

  let detectedLanguage = (franc(str) || FALLBACK).slice(0, 2)
  if (!supported[detectedLanguage]) {
    detectedLanguage = FALLBACK
  }
  const validWords = countBy(
    difference(allWords, supported[detectedLanguage].stopwords)
  )

  const y = []
  let word
  for (word in validWords) {
    y.push({
      word,
      count: validWords[word]
    })
  }
  if (!limit) {
    limit = y.length
  }
  return {
    detectedLanguage,
    frequencies: sortBy(y, 'count')
      .reverse()
      .slice(0, limit)
  }
}

module.exports = extractKeywords
