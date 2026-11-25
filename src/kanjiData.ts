import rawIds from './data/ids.txt?raw'

function loadKanjiData(): Record<string, string> {
  const data: Record<string, string> = {}

  for (const line of rawIds.split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue

    const [, character, ...variants] = line.trim().split('\t')

    if (!character || !variants.length) continue
    if (!/^\p{Unified_Ideograph}$/u.test(character)) continue

    const preferred =
      variants.find((variant) => /\[[^\]]*J[^\]]*\]/.test(variant))
      ?? variants[0]

    const ids = preferred.replace(/\[[^\]]*\]/g, '').trim()

    if (!ids || ids.includes('&')) continue

    data[character] = ids
  }

  return data
}

export const kanjiData = loadKanjiData()

export type KanjiNode = {
  character: string
  children: KanjiNode[]
  decomposition?: KanjiNode
}

const structureSizes: Record<string, number> = {
  '⿰': 2,
  '⿱': 2,
  '⿲': 3,
  '⿳': 3,
  '⿴': 2,
  '⿵': 2,
  '⿶': 2,
  '⿷': 2,
  '⿸': 2,
  '⿹': 2,
  '⿺': 2,
  '⿻': 2,
}

export function parseKanji(kanji: string): KanjiNode {
  const characters = Array.from(kanjiData[kanji] ?? kanji)
  let index = 0

  function parse(): KanjiNode {
    const character = characters[index++]
    if (!character) {
      throw new Error(`Invalid IDS for ${kanji}`)
    }
    const childCount = structureSizes[character] ?? 0

    const children: KanjiNode[] = []

    for (let i = 0; i < childCount; i++) {
      children.push(parse())
    }

    return {
      character,
      children,
    }
  }

  const result = parse()

  if (index !== characters.length) {
    throw new Error(`Incomplete IDS parsing for ${kanji}`)
  }

  return result
}

for (const kanji of Object.keys(kanjiData)) {
  try {
    parseKanji(kanji)
  } catch {
    delete kanjiData[kanji]
  }
}

console.log('Loaded characters:', Object.keys(kanjiData).length)


export type KanjiComponent = {
  character: string
  position: string
}

export function getComponents(
  node: KanjiNode,
  position = 'root'
): KanjiComponent[] {
  if (node.children.length === 0) {
    return [
      {
        character: node.character,
        position,
      },
    ]
  }

  return node.children.flatMap((child, index) =>
    getComponents(
      child,
      `${position}/${node.character}:${index}`
    )
  )
}

export type MatchStatus = 'correct' | 'misplaced' | 'absent'

export function matchKanji(guess: string, target: string) {
  const guessed = getComponents(parseKanji(guess))
  const actual = getComponents(parseKanji(target))

  const used = new Set<number>()

  const results = guessed.map((component) => ({
    ...component,
    status: 'absent' as MatchStatus,
  }))

  // First pass: exact component and position
  results.forEach((component) => {
    const index = actual.findIndex(
      (item, index) =>
        !used.has(index) &&
        item.character === component.character &&
        item.position === component.position
    )

    if (index !== -1) {
      component.status = 'correct'
      used.add(index)
    }
  })

  // Second pass: correct component, wrong position
  results.forEach((component) => {
    if (component.status === 'correct') return

    const index = actual.findIndex(
      (item, index) =>
        !used.has(index) &&
        item.character === component.character
    )

    if (index !== -1) {
      component.status = 'misplaced'
      used.add(index)
    }
  })

  return results
}

export function expandKanji(
  kanji: string,
  visited = new Set<string>(),
  depth = 0
): KanjiNode {
  const node = parseKanji(kanji)

  if (visited.has(kanji) || depth >= 10) {
    return node
  }

  const nextVisited = new Set(visited)
  nextVisited.add(kanji)

  function expand(node: KanjiNode): KanjiNode {
    if (node.children.length > 0) {
      return {
        ...node,
        children: node.children.map(expand),
      }
    }

    if (
      !kanjiData[node.character] ||
      kanjiData[node.character] === node.character ||
      nextVisited.has(node.character)
    ) {
      return node
    }

    return {
      ...node,
      decomposition: expandKanji(
        node.character,
        nextVisited,
        depth + 1
      ),
    }
  }

  return expand(node)
}

export function printKanjiTree(
  node: KanjiNode,
  depth = 0
): string {
  const indent = '  '.repeat(depth)

  const lines = [`${indent}${node.character}`]

  for (const child of node.children) {
    lines.push(printKanjiTree(child, depth + 1))
  }

  if (node.decomposition) {
    lines.push(
      printKanjiTree(node.decomposition, depth + 1)
    )
  }

  return lines.join('\n')
}