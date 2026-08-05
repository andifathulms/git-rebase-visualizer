/**
 * Records oracle fixtures by running the scenarios through the REAL `git`
 * binary. Development-only: it shells out and touches the filesystem, so it
 * never runs in CI and never reaches the browser build.
 *
 * What it records is *structure*, never literal hashes. PRD §8 — real git folds
 * the committer timestamp and author identity into a commit id, so exact hashes
 * cannot and should not match. The fixture describes the shape by commit
 * message instead — parent relationships, ref positions, which commits share a
 * tree, and whether a marked commit survived as an unreferenced object.
 *
 * Cherry-pick and rebase copy a message onto a second commit, so a message
 * alone is not a key; duplicates are disambiguated by a deterministic rule both
 * sides apply identically. See `labels` below.
 *
 * Usage: pnpm fixtures:record
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SCENARIOS } from '../tests/oracle/scenarios.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, '..', 'tests', 'oracle', 'fixtures.json')

// Fixed identity and dates so a re-record produces the same fixture; the values
// themselves never reach an assertion.
const ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Cangkok',
  GIT_AUTHOR_EMAIL: 'cangkok@example.test',
  GIT_COMMITTER_NAME: 'Cangkok',
  GIT_COMMITTER_EMAIL: 'cangkok@example.test',
  GIT_AUTHOR_DATE: '2023-11-14T22:13:20+07:00',
  GIT_COMMITTER_DATE: '2023-11-14T22:13:20+07:00',
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_SYSTEM: '/dev/null',
}

function git(cwd, args) {
  return execFileSync('git', args, { cwd, env: ENV, encoding: 'utf8' }).trim()
}

function tokenize(line) {
  return line.match(/"[^"]*"|\S+/g).map((token) => token.replace(/^"|"$/g, ''))
}

function runScenario(scenario) {
  const dir = mkdtempSync(join(tmpdir(), `cangkok-${scenario.id}-`))
  const marks = {}

  try {
    git(dir, ['init', '-q', '-b', 'main', '.'])

    for (const raw of scenario.script) {
      const line = raw.replace(/@mark:([\w-]+)/g, (_, name) => {
        if (!marks[name]) throw new Error(`mark ${name} belum ada di ${scenario.id}`)
        return marks[name]
      })
      const tokens = tokenize(line)

      if (tokens[0] === 'write') {
        const path = join(dir, tokens[1])
        mkdirSync(dirname(path), { recursive: true })
        writeFileSync(path, `${tokens[2].split('|').join('\n')}\n`)
        continue
      }

      if (tokens[0] === 'mark') {
        marks[tokens[1]] = git(dir, ['rev-parse', 'HEAD'])
        continue
      }

      git(dir, tokens)
    }

    return describe(dir, marks)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** Turns a real repository into the hash-free structural description. */
function describe(dir, marks) {
  const refLines = git(dir, ['for-each-ref', '--format=%(refname) %(objectname)'])
    .split('\n')
    .filter(Boolean)

  const refs = {}
  for (const line of refLines) {
    const [name, oid] = line.split(' ')
    refs[name] = oid
  }

  const reachable = git(dir, ['rev-list', '--all']).split('\n').filter(Boolean)

  const messageOf = (oid) => git(dir, ['log', '-1', '--format=%s', oid])
  const treeOf = (oid) => git(dir, ['rev-parse', `${oid}^{tree}`])
  const parentsOf = (oid) =>
    git(dir, ['log', '-1', '--format=%P', oid]).split(' ').filter(Boolean)
  const ancestorCount = (oid) => Number(git(dir, ['rev-list', '--count', oid]))

  // Cherry-pick and rebase copy a message onto a second commit, so a message
  // alone is not a key. Duplicates are ordered by ancestor count, then parent
  // messages, then tree — all hash-free except the tree, which is only ever a
  // sort key and never appears in the fixture.
  const labels = {}
  const groups = {}
  for (const oid of reachable) {
    const subject = messageOf(oid)
    ;(groups[subject] ??= []).push(oid)
  }
  for (const subject of Object.keys(groups).sort()) {
    const group = groups[subject]
    if (group.length === 1) {
      labels[group[0]] = subject
      continue
    }
    const ordered = [...group].sort((a, b) => {
      const byDepth = ancestorCount(a) - ancestorCount(b)
      if (byDepth !== 0) return byDepth
      const byParents = parentsOf(a).map(messageOf).join(',').localeCompare(
        parentsOf(b).map(messageOf).join(','),
      )
      if (byParents !== 0) return byParents
      return treeOf(a).localeCompare(treeOf(b))
    })
    ordered.forEach((oid, index) => {
      labels[oid] = `${subject}#${index}`
    })
  }

  const treeGroups = {}
  let nextGroup = 0
  const groupFor = (tree) => {
    if (!(tree in treeGroups)) treeGroups[tree] = nextGroup++
    return treeGroups[tree]
  }

  const commits = {}
  for (const oid of [...reachable].sort((a, b) => labels[a].localeCompare(labels[b]))) {
    commits[labels[oid]] = {
      parents: parentsOf(oid).map((parent) => labels[parent]),
      treeGroup: groupFor(treeOf(oid)),
    }
  }

  const refMessages = {}
  for (const name of Object.keys(refs).sort()) {
    refMessages[name] = labels[refs[name]]
  }

  const markStates = {}
  for (const name of Object.keys(marks).sort()) {
    const oid = marks[name]
    let present = true
    try {
      git(dir, ['cat-file', '-e', `${oid}^{commit}`])
    } catch {
      present = false
    }
    markStates[name] = { present, reachable: reachable.includes(oid) }
  }

  return {
    refs: refMessages,
    head: git(dir, ['symbolic-ref', '-q', '--short', 'HEAD']) || null,
    commits,
    marks: markStates,
    reachableCount: reachable.length,
  }
}

const fixtures = {}
for (const scenario of SCENARIOS) {
  process.stdout.write(`recording ${scenario.id} … `)
  fixtures[scenario.id] = runScenario(scenario)
  console.log('ok')
}

writeFileSync(OUT, `${JSON.stringify(fixtures, null, 2)}\n`)
console.log(`\nwrote ${OUT}`)
console.log(`git ${git(process.cwd(), ['--version'])}`)
