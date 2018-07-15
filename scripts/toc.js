#!/usr/bin/env node

'use strict'

// npm
const marked = require('marked')

// self
const { localFile } = require('..')

const makeAnchor = x =>
  x
    .toLowerCase()
    .replace(/[^\/\w]+/g, '-')
    .replace(/\//g, '')

const readme = localFile('README.md')

const doit = () => {
  const tokens = marked.lexer(readme)

  const headings = tokens
    .filter(x => x.type === 'heading' && x.depth > 1 && x.depth < 4)
    .map((x, i) => ({
      ...x,
      i,
      anchor: makeAnchor(x.text)
    }))

  return headings.filter(x => x.depth === 2).map(x => {
    let last = x.i + 1
    const children = headings
      .slice(last)
      .filter(y => y.depth === 3)
      .filter(y => {
        if (last === y.i) {
          ++last
          return true
        }
        last = headings.length
        return false
      })
    if (children.length) {
      return { ...x, children }
    }
    return x
  })
}

const dotoo = tops => {
  const lines = ['\n# TOC\n']
  tops.forEach(x => {
    lines.push(`* [${x.text}](#${x.anchor})`)
    if (x.children && x.children.length) {
      x.children.forEach(y => {
        lines.push(`  * [${y.text}](#${y.anchor})`)
      })
    }
  })
  lines.push('\n')
  return lines.join('\n')
}

const findToc = () => {
  const x = readme.match(/\n# TOC\n\n([^]*?)\n##/)
  if (!x || !x[1]) {
    return
  }
  return {
    mode: x[1][0] === '*' ? 'update' : 'insert',
    index: x.index,
    x0: x[0].slice(0, -2),
    x1: x[1]
  }
}

const woot = toc => {
  // move all this into findToc()?
  if (!toc) {
    return
  }
  const it = dotoo(doit())
  const result =
    toc.mode === 'insert'
      ? readme.replace('\n# TOC\n\n', it)
      : readme.replace(toc.x0, it)
  // actually write new readme file
  return result.trim()
}

const zam = woot(findToc())

console.log(zam)
