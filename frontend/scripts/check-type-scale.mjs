import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const srcDir = join(root, 'src')
// The scale itself is defined here, so raw sizes are expected
const ignoredDir = join(srcDir, 'styles')

const patterns = [
  { regex: /(?<![\w-])(?:[\w-]+:)*text-\[[^\]]*\d(?:px|rem|em)\]/g, reason: 'arbitrary font size' },
  { regex: /(?<![\w-])(?:[\w-]+:)*text-(?:xs|sm|base|lg|xl|[2-9]xl)(?![\w-])/g, reason: 'Tailwind default font size' },
  { regex: /font-size\s*:|fontSize\s*[:=]/g, reason: 'literal font-size' },
]

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return path === ignoredDir ? [] : walk(path)
    return /\.(tsx?|css)$/.test(entry.name) ? [path] : []
  })
}

const problems = []
for (const file of walk(srcDir)) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, index) => {
      for (const { regex, reason } of patterns) {
        for (const match of line.matchAll(regex)) {
          problems.push(`${relative(root, file)}:${index + 1}  ${match[0]}  (${reason})`)
        }
      }
    })
}

if (problems.length > 0) {
  console.error(problems.join('\n'))
  console.error(
    `\n${problems.length} font size(s) outside the type scale. Use the scale utilities (text-title-lg, text-body, text-caption, ...) from src/styles/tailwind-theme.css.`,
  )
  process.exit(1)
}
