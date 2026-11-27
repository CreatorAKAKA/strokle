import { useState } from 'react'
import './Strokle.css'
import { kanjiData } from './kanjiData'
import KanjiGlyph from './KanjiGlyph'
import { matchVGKanji } from './strokleMatcher'
import type { MatchStatus } from './strokleMatcher'
import RadicalBank from './RadicalBank'
import joyoData from './data/joyo.json'
import strokleHints from './data/strokle-hints.json'

type Difficulty = 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'All'

const difficulties: Difficulty[] = [
  'N5', 'N4', 'N3', 'N2', 'N1', 'All'
]

function getAnswerPool(difficulty: Difficulty) {
  return Object.entries(joyoData)
    .filter(([kanji, data]) =>
      Object.hasOwn(kanjiData, kanji) &&
      (
        difficulty === 'All' ||
        data.jlpt_new === Number(difficulty.slice(1))
      )
    )
    .map(([kanji]) => kanji)
}

function Strokle() {
  const [difficulty, setDifficulty] =
    useState<Difficulty>('N3')

  const answerPool = getAnswerPool(difficulty)

  const [target, setTarget] = useState(
    () => answerPool[Math.floor(Math.random() * answerPool.length)]
  )
  const [input, setInput] = useState('')
  const [guesses, setGuesses] = useState<string[]>([])
  const [guessColors, setGuessColors] = useState<
    Record<string, Record<string, MatchStatus>>
  >({})
  const [error, setError] = useState('')
  const [revealedHints, setRevealedHints] = useState<number[]>([])
  const hintThresholds = [2, 4, 6, 8]

  const won = guesses.includes(target)
  const lost = guesses.length >= 9 && !won
  const finished = won || lost

  const targetHints = (
    strokleHints as Record<string, {
      radical: string | null
      vocabulary: {
        word: string
        reading: string
        meaning: string
      }[]
    }>
  )[target]

  const vocabularyHint = targetHints?.vocabulary ?? []

  const targetInfo = (
    joyoData as Record<string, {
      readings_on: string[]
      readings_kun: string[]
    }>
  )[target]

  const hintCount = Math.min(
    hintThresholds.length,
    vocabularyHint.length
  )

  const nextHint = revealedHints.length
  const allHintsRevealed = nextHint >= hintCount
  const remaining = (hintThresholds[nextHint] ?? 0) - guesses.length

  const [componentStatuses, setComponentStatuses] =
    useState<Record<string, MatchStatus>>({})


  console.log('Component statuses:', componentStatuses)
  
  async function submitGuess(
    automaticGuess?: string,
    nextTarget?: string
  ) {
    const automatic = automaticGuess !== undefined

    if (finished && !automatic) return

    const guess = automaticGuess ?? input.trim()
    const currentTarget = nextTarget ?? target

    if (!Object.hasOwn(kanjiData, guess)) {
      setError('Kanji not in the current dictionary.')
      return
    }

    if (!automatic && guesses.includes(guess)) {
      setError('You already guessed this kanji.')
      return
    }

    
    try {
      const matches = await matchVGKanji(guess, currentTarget)
      console.table(matches)
      setComponentStatuses((previous) => {
        const updated = { ...previous }

        const priority: Record<string, number> = {
          correct: 3,
          misplaced: 2,
          absent: 1,
          nested: 0,
        }

        for (const match of matches) {
          const current = updated[match.character]

          if (
            (priority[match.status] ?? 0) >
            (priority[current] ?? 0)
          ) {
            updated[match.character] = match.status
          }
        }
        console.log('UPDATED STATUSES:', updated)
        return updated
      })

      setGuessColors((previous) => ({
        ...previous,
        [guess]: Object.fromEntries(
          matches.filter((match) => match.status !== 'absent').map((match) => [
            match.id,
            match.status,
          ])
        ),
      }))

      setGuesses((previous) => [...previous, guess])
      setInput('')
      setError('')
    } catch (error) {
      console.error('Strokle matching failed:', error)
      setError('Could not check this guess. Please try again.')
    }
  }

  async function newGame(
    nextDifficulty: Difficulty = difficulty,
    inheritGuess = false
  ) {
    const previousAnswer = target
    const pool = getAnswerPool(nextDifficulty)

    const candidates = pool.filter(
      (kanji) => kanji !== previousAnswer
    )

    const nextTarget =
      candidates[Math.floor(Math.random() * candidates.length)]
      ?? pool[0]

    setDifficulty(nextDifficulty)
    setTarget(nextTarget)
    setGuesses([])
    setGuessColors({})
    setComponentStatuses({})
    setInput('')
    setError('')
    setRevealedHints([])

    if (inheritGuess && previousAnswer !== nextTarget) {
      await submitGuess(previousAnswer, nextTarget)
    }
  }

  return (
    <div className="strokle-page">
      <h1>Strokle</h1>

      <p className="strokle-subtitle">
        Every kanji tells a story. Piece it together.
      </p>

      <div className="strokle-difficulty">
        {difficulties.map((level) => (
          <button
            key={level}
            className={difficulty === level ? 'active' : ''}
            onClick={() => {
              if (level !== difficulty) {
                newGame(level)
              }
            }}
          >
            {level}
          </button>
        ))}
      </div>

      <div className="strokle-board">
        {Array.from({ length: 9 }, (_, index) => {
          const guess = guesses[index]

          return (
            <div className="strokle-row" key={index}>
              {guess ? (
                <KanjiGlyph
                  kanji={guess}
                  groupColors={guessColors[guess]}
                />
              ) : (
                <div className="strokle-empty-glyph" />
              )}
            </div>
          )
        })}
      </div>

      <div className="strokle-legend">
        <span><i className="legend-correct" /> Correct position</span>
        <span><i className="legend-misplaced" /> Wrong position</span>
        <span><i className="legend-absent" /> Not present</span>
      </div>

      {finished && (
        <h2 className="strokle-result">
          {won
            ? `正解！ Solved in ${guesses.length}/9`
            : `The answer was ${target}`}
        </h2>
      )}

      <div className="strokle-hints">
        {!finished && (
            <p className="strokle-hints-title">
              Need a hint?
            </p>
          )}

        {!finished && (
          <div className="strokle-hint-buttons">
            <button
              disabled={allHintsRevealed || remaining > 0}
              onClick={() =>
                setRevealedHints(previous => [...previous, nextHint])
              }
            >
              <span className="hint-icon">語</span>

              <span>
                {hintCount === 0
                  ? 'No hints available'
                  : allHintsRevealed
                    ? 'All hints revealed'
                    : `Vocabulary hint ${nextHint + 1}/${hintCount}`}
              </span>

              <small>
                {allHintsRevealed
                  ? ''
                  : remaining > 0
                    ? `${remaining} guesses left`
                    : 'Unlock hint'}
              </small>
            </button>
          </div>
        )}

        {(finished || revealedHints.length > 0) && (
          <div className="strokle-hint-results">
            {finished && targetInfo && (
              <div className="strokle-answer-review">
                <div className="strokle-answer-kanji">
                  <KanjiGlyph
                    kanji={target}
                    groupColors={guessColors[target]}
                  />
                </div>

                <div className="strokle-answer-readings">
                  <p>
                    <span className="reading-label">音読み</span>

                    <strong>
                      {targetInfo.readings_on.map(reading =>
                        reading.replace(/[\u3041-\u3096]/g, char =>
                          String.fromCharCode(char.charCodeAt(0) + 0x60)
                        )
                      ).join('、') || '—'}
                    </strong>
                  </p>

                  <p>
                    <span className="reading-label">訓読み</span>

                    <span>
                      {targetInfo.readings_kun.length === 0 && '—'}

                      {targetInfo.readings_kun.map((reading, index) => {
                        const [stem, okurigana] = reading.split('.')

                        return (
                          <span key={index}>
                            {index > 0 && '、'}
                            <strong>{stem}</strong>
                            <span className="reading-okurigana">
                              {okurigana}
                            </span>
                          </span>
                        )
                      })}
                    </span>
                  </p>
                </div>
              </div>
            )}
            <div className="strokle-vocabulary-hint">
              {finished ? (
                <p className="strokle-review-heading">
                  Vocabulary review
                </p>
              ) : (
                <p>Vocabulary:</p>
              )}

              {vocabularyHint.length > 0 ? (
                vocabularyHint.map((item, index) =>
                  finished || revealedHints.includes(index) ? (
                    <div key={index} className="strokle-vocab-item">
                      {finished ? (
                        <>
                          <ruby>
                            {item.word.replaceAll('□', target)}
                            <rt>{item.reading}</rt>
                          </ruby>

                          <span className="strokle-vocab-meaning">
                            {item.meaning}
                          </span>
                        </>
                      ) : (
                        <strong>
                          {item.word.replaceAll('□', '___')}
                        </strong>
                      )}
                    </div>
                  ) : null
                )
              ) : (
                <p>No vocabulary hints available.</p>
              )}
            </div>
          </div>
        )}
      </div>


      {!finished && (
        <div className="strokle-input">
          <input
            type="text"
            placeholder="Enter a kanji..."
            value={input}
            onChange={(event) => {
              setInput(event.target.value)
              setError('')
            }}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.nativeEvent.isComposing
              ) {
                submitGuess()
              }
            }}
            autoComplete="off"
            spellCheck={false}
          />

          <button
            onClick={() => submitGuess()}
            disabled={!input.trim()}
          >
            Guess
          </button>
        </div>
      )}

      {error && (
        <p className="strokle-error">{error}</p>
      )}

      

      {finished && (
        <div className="strokle-result">

          <button onClick={() => newGame(difficulty, true)}>
            Play Again
          </button>
        </div>
      )}

      <RadicalBank statuses={componentStatuses} />
    </div>
  )
}
export default Strokle
