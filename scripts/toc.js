#!/usr/bin/env node

'use strict'

// npm
const marked = require('marked')

// self
const { localFile } = require('..')

// seems to work like GitHub
const makeAnchor = heading =>
  heading
    .toLowerCase()
    .replace(/[^/\w]+/g, '-')
    .replace(/\//g, '')

const readme = localFile('README.md')

const tree = headings =>
  headings
    .filter(h2 => h2.depth === 2)
    .map(h2 => {
      let last = h2.i + 1
      const children = headings
        .slice(last)
        .filter(h3 => h3.depth === 3)
        .filter(h3 => {
          if (last === h3.i) {
            ++last
            return true
          }
          // If we skip an index, we can ignore the rest
          last = headings.length
          return false
        })
      if (children.length) {
        return { ...h2, children }
      }
      return h2
    })

// Output markdown list (and sublists)
const markdownList = () => {
  const lines = ['\n# TOC\n']
  tree(
    marked
      .lexer(readme)
      .filter(
        heading =>
          heading.type === 'heading' && heading.depth > 1 && heading.depth < 4
      )
      .map((heading, i) => ({
        ...heading,
        i,
        anchor: makeAnchor(heading.text)
      }))
  ).forEach(h2 => {
    lines.push(`* [${h2.text}](#${h2.anchor})`)
    if (h2.children && h2.children.length) {
      h2.children.forEach(h3 => {
        lines.push(`  * [${h3.text}](#${h3.anchor})`)
      })
    }
  })
  lines.push('\n')
  return lines.join('\n')
}

// Return updated readme or nothing if no TOC found
const findToc = () => {
  const match = readme.match(/\n# TOC\n\n([^]*?)\n##/)
  return (
    match &&
    match[1] &&
    readme
      .replace(
        match[1][0] === '*' ? match[0].slice(0, -2) : '\n# TOC\n\n',
        markdownList()
      )
      .trim()
  )
}

const updatedReadme = findToc()

if (updatedReadme) {
  // FIXME: actually write new readme file
  console.log(updatedReadme)
}
