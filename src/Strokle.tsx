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
  const [showVocabularyHint, setShowVocabularyHint] = useState(false)
  const [showStrokeHint, setshowStrokeHint] = useState(false)
  const [showMeaningHint, setShowMeaningHint] = useState(false)

  const won = guesses.includes(target)
  const lost = guesses.length >= 9 && !won
  const finished = won || lost

  const targetInfo =
    joyoData[target as keyof typeof joyoData]

  const targetHints = (
    strokleHints as Record<string, {
      radical: string | null
      vocabulary: {
        word: string
        meaning: string
      }[]
    }>
  )[target]

  const vocabularyHint = targetHints?.vocabulary ?? []

  const strokeHint = targetInfo?.strokes ?? null

  const meaningHint =
    targetInfo?.meanings?.slice(0, 3).join('; ') || null

  const [componentStatuses, setComponentStatuses] =
    useState<Record<string, MatchStatus>>({})


  console.log('Component statuses:', componentStatuses)
  
  async function submitGuess() {
    if (finished) return

    const guess = input.trim()

    if (!Object.hasOwn(kanjiData, guess)) {
      setError('Kanji not in the current dictionary.')
      return
    }

    if (guesses.includes(guess)) {
      setError('You already guessed this kanji.')
      return
    }

    
    try {
      const matches = await matchVGKanji(guess, target)
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

  function newGame(nextDifficulty: Difficulty = difficulty) {
    const pool = getAnswerPool(nextDifficulty)

    const candidates = pool.filter(
      (kanji) => kanji !== target
    )

    setDifficulty(nextDifficulty)

    setTarget(
      candidates[Math.floor(Math.random() * candidates.length)]
      ?? pool[0]
    )
    setGuesses([])
    setGuessColors({})
    setComponentStatuses({})
    setInput('')
    setError('')
    setShowVocabularyHint(false)
    setshowStrokeHint(false)
    setShowMeaningHint(false)
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


      <div className="strokle-hints">
        <p className="strokle-hints-title">Need a hint?</p>

        <div className="strokle-hint-buttons">
          <button
            className={showVocabularyHint ? 'revealed' : ''}
            disabled={guesses.length < 3 || showVocabularyHint}
            onClick={() => setShowVocabularyHint(true)}
          >
            <span className="hint-icon">語</span>
            <span>Vocabulary</span>
            <small>{guesses.length < 3 ? `${3 - guesses.length} left` : showVocabularyHint ? 'Revealed' : 'Unlock'}</small>
          </button>

          <button
            className={showStrokeHint ? 'revealed' : ''}
            disabled={guesses.length < 5 || showStrokeHint}
            onClick={() => setshowStrokeHint(true)}
          >
            <span className="hint-icon">筆</span>
            <span>Strokes</span>
            <small>{guesses.length < 5 ? `${5 - guesses.length} left` : showStrokeHint ? 'Revealed' : 'Unlock'}</small>
          </button>

          <button
            className={showMeaningHint ? 'revealed' : ''}
            disabled={guesses.length < 7 || showMeaningHint}
            onClick={() => setShowMeaningHint(true)}
          >
            <span className="hint-icon">あ</span>
            <span>Meaning</span>
            <small>{guesses.length < 7 ? `${7 - guesses.length} left` : showMeaningHint ? 'Revealed' : 'Unlock'}</small>
          </button>
        </div>

        {(finished || showVocabularyHint || showStrokeHint || showMeaningHint) && (
          <div className="strokle-hint-results">

            {(showVocabularyHint || finished) && (
              <div className="strokle-vocabulary-hint">
                <p>Vocabulary:</p>

                {vocabularyHint.length > 0 ? (
                  vocabularyHint.map((item, index) => (
                    <p key={index}>
                      <strong>
                        {item.word.replaceAll('□', finished ? target : '___')}
                      </strong>
                      {finished && ` — ${item.meaning}`}
                    </p>
                  ))
                ) : (
                  <p>No vocabulary hint available.</p>
                )}
              </div>
            )}

            {(showStrokeHint || finished) && (
              <p>Stroke count: <strong>{strokeHint ?? 'Unknown'}</strong></p>
            )}

            {(showMeaningHint || finished) && (
              <p>Meaning: <strong>{meaningHint ?? 'Unknown'}</strong></p>
            )}

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
            onClick={submitGuess}
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
          <h2>
            {won
              ? `正解！ Solved in ${guesses.length}/9`
              : `The answer was ${target}`}
          </h2>

          <button onClick={() => newGame()}>
            Play Again
          </button>
        </div>
      )}

      <RadicalBank statuses={componentStatuses} />
    </div>
  )
}
export default Strokle
