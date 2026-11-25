import { useState, useEffect } from 'react'

const svgFiles = import.meta.glob<string>(
  './data/kanji/*.svg',
  {
    query: '?raw',
    import: 'default',
  }
)

const colors = {
  correct: '#86cba0',
  misplaced: '#e9c78d',
  nested: '#a8c8ed',
  absent: '#716876',
  neutral: '#f7eaf2',
}

type GlyphStatus = keyof typeof colors

type KanjiGlyphProps = {
  kanji: string
  componentColors?: Record<string, GlyphStatus>
  groupColors?: Record<string, GlyphStatus>
}

function KanjiGlyph({
  kanji,
  componentColors = {},
  groupColors = {},
}: KanjiGlyphProps) {
  const code = kanji.codePointAt(0)
    ?.toString(16)
    .padStart(5, '0')

  const [loadedSvg, setLoadedSvg] = useState<{
    code: string | undefined
    svg: string
  } | null>(null)

  useEffect(() => {
    let cancelled = false

    const loader = svgFiles[`./data/kanji/${code}.svg`]

    if (loader) {
      loader().then((svg) => {
        if (!cancelled) {
          setLoadedSvg({ code, svg })
        }
      }).catch(console.error)
    }

    return () => {
      cancelled = true
    }
  }, [code])

  const rawSvg =
    loadedSvg?.code === code ? loadedSvg?.svg : null
    console.log('Kanji:', kanji, 'Group colors:', groupColors)

  if (!rawSvg) {
    return (
      <div className="strokle-glyph-fallback">
        {kanji}
      </div>
    )
  }

  const parser = new DOMParser()
  const document = parser.parseFromString(
    rawSvg,
    'image/svg+xml'
  )

  const namespace = 'http://kanjivg.tagaini.net'
  const paths = Array.from(document.querySelectorAll('path'))


  return (
    <svg className="strokle-glyph" viewBox="0 0 109 109">
      <line
        x1="54.5" y1="0" x2="54.5" y2="109"
        className="strokle-guide"
      />

      <line
        x1="0" y1="54.5" x2="109" y2="54.5"
        className="strokle-guide"
      />

      {paths.map((path, index) => {
        let parent = path.parentElement

        let status: GlyphStatus = 'absent'

        while (parent) {
          const groupId = parent.getAttribute('id')
          if (groupId && groupColors[groupId]) {
            status = groupColors[groupId]
            break
          }
          const component = parent.getAttributeNS(
            namespace,
            'element'
          )

          if (component && componentColors[component]) {
            status = componentColors[component]
            break
          }

          parent = parent.parentElement
        }

        return (
          <path
            key={index}
            d={path.getAttribute('d') ?? ''}
            stroke={colors[status]}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )
      })}
    </svg>
  )
}

export default KanjiGlyph