import type { VGComponent } from './kanjiVG'
import { getVGComponents } from './kanjiVG'

type Bounds = VGComponent['bounds']

export function getOverlap(a: Bounds, b: Bounds): number {
  const left = Math.max(a.x, b.x)
  const right = Math.min(
    a.x + a.width,
    b.x + b.width
  )

  const top = Math.max(a.y, b.y)
  const bottom = Math.min(
    a.y + a.height,
    b.y + b.height
  )

  const intersection =
    Math.max(0, right - left) *
    Math.max(0, bottom - top)

  const union =
    a.width * a.height +
    b.width * b.height -
    intersection

  return union > 0 ? intersection / union : 0
}

export type MatchStatus =
  | 'correct'
  | 'misplaced'
  | 'nested'
  | 'absent'

export type VGMatch = {
  id: string
  character: string
  status: MatchStatus
}

export async function matchVGKanji(
  guess: string,
  target: string
): Promise<VGMatch[]> {
  const guessed = await getVGComponents(guess)
  const answer = await getVGComponents(target)

  const usedGuessStrokes = new Set<string>()
  const usedTargetStrokes = new Set<string>()

  const results: VGMatch[] = []

    function isContained(
    smaller: VGComponent,
    larger: VGComponent
  ): boolean {
    return (
      smaller.id !== larger.id &&
      smaller.strokeIds.length < larger.strokeIds.length &&
      smaller.strokeIds.every((id) =>
        larger.strokeIds.includes(id)
      )
    )
  }

  const pairs = guessed.flatMap((g) =>
    answer
      .filter((a) => a.character === g.character)
      .map((a) => ({
        guess: g,
        target: a,
        overlap: getOverlap(g.bounds, a.bounds),
      }))
  )

  
  pairs.sort((a, b) => {
    const aCorrectPosition = a.overlap >= 0.45
    const bCorrectPosition = b.overlap >= 0.45

    // Prefer larger matching components.
    const sizeDifference =
      b.guess.strokeIds.length -
      a.guess.strokeIds.length

    if (sizeDifference !== 0) {
      return sizeDifference
    }

    // For equally sized components, prefer correct positions.
    if (aCorrectPosition !== bCorrectPosition) {
      return Number(bCorrectPosition) -
        Number(aCorrectPosition)
    }

    // Finally, prefer stronger positional overlap.
    return b.overlap - a.overlap
  })


  for (const pair of pairs) {
    if (
      pair.guess.strokeIds.some(
        (id) => usedGuessStrokes.has(id)
      ) ||
      pair.target.strokeIds.some(
        (id) => usedTargetStrokes.has(id)
      )
    ) {
      continue
    }

    results.push({
      id: pair.guess.id,
      character: pair.guess.character,
      status: pair.overlap >= 0.45
        ? 'correct'
        : 'misplaced',
    })

    pair.guess.strokeIds.forEach(
      (id) => usedGuessStrokes.add(id)
    )

    pair.target.strokeIds.forEach(
      (id) => usedTargetStrokes.add(id)
    )
  }

    const matchedParents = [...results]

  for (const match of matchedParents) {
    const parent = guessed.find(
      (component) => component.id === match.id
    )

    if (!parent) continue

    for (const child of guessed) {
      if (!isContained(child, parent)) continue

      if (results.some((result) => result.id === child.id)) {
        continue
      }

      const candidates = answer.filter(
        (component) => component.character === child.character
      )

      if (candidates.length === 0) continue

      const correctPosition = candidates.some(
        (component) =>
          getOverlap(child.bounds, component.bounds) >= 0.45
      )

      results.push({
        id: child.id,
        character: child.character,
        status: correctPosition ? 'correct' : 'misplaced',
      })
    }
  }

  const answerCharacters = new Set(
    answer.map((component) => component.character)
  )

  for (const component of guessed) {
    if (!answerCharacters.has(component.character)) {
      results.push({
        id: component.id,
        character: component.character,
        status: 'absent',
      })
    }
  }

  return results
}