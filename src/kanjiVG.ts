const svgFiles = import.meta.glob<string>(
  './data/kanji/*.svg',
  {
    query: '?raw',
    import: 'default',
  }
)

const namespace = 'http://kanjivg.tagaini.net'

export type VGComponent = {
  id: string
  character: string
  strokeIds: string[]
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
}

export async function loadKanjiSvg(kanji: string) {
  const code = kanji.codePointAt(0)
    ?.toString(16)
    .padStart(5, '0')

  const loader = svgFiles[`./data/kanji/${code}.svg`]

  return loader ? await loader() : null
}

export async function getVGComponents(
  kanji: string
): Promise<VGComponent[]> {
  const rawSvg = await loadKanjiSvg(kanji)

  if (!rawSvg) return []

  const parsed = new DOMParser().parseFromString(
    rawSvg,
    'image/svg+xml'
  )

  const svg = document.importNode(
    parsed.documentElement,
    true
  ) as unknown as SVGSVGElement

  svg.style.position = 'absolute'
  svg.style.visibility = 'hidden'
  svg.style.pointerEvents = 'none'

  document.body.appendChild(svg)

  try {
    return Array.from(svg.querySelectorAll('g'))
      .filter((group) =>
        group.getAttributeNS(namespace, 'element')
      )
      .map((group) => {
        const bounds = group.getBBox()

        return {
          id: group.getAttribute('id') ?? '',
          character:
            group.getAttributeNS(namespace, 'element') ?? '',
          strokeIds: Array.from(group.querySelectorAll('path'))
            .map((path) => path.getAttribute('id') ?? ''),
          bounds: {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
          },
        }
      })
      .filter((group) => group.id && group.character)
  } finally {
    svg.remove()
  }
}