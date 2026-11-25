import './RadicalBank.css'
import type { MatchStatus } from './strokleMatcher'

const components = Array.from(
  '一丨丶丿乙亅二亠人亻儿入八刀刂力勹匕十卜' +
  '口囗土士夕大女子宀寸小⺍山川工巾干广弓' +
  '心忄手扌日月木水氵火灬犬犭王田目石示礻' +
  '禾竹米糸耳肉艹虫衣衤言貝足車辶金門阝雨' +
  '青白立音食馬魚鳥隹羊羽寺林青争'
)

const statusPriority: Record<string, number> = {
  correct: 3,
  misplaced: 2,
  absent: 1,
  nested: 0,
}

function RadicalBank({
  statuses = {},
}: {
  statuses?: Record<string, MatchStatus>
}) {
  console.log('BANK RECEIVED:', statuses)
  const sortedComponents = Array.from(
    new Set([...components, ...Object.keys(statuses)])
  ).sort((a, b) =>
    (statusPriority[statuses[b]] ?? 0) -
    (statusPriority[statuses[a]] ?? 0)
  )

  return (
    <div className="radical-bank">
      <div className="radical-bank-header">
        <h3>Component Bank</h3>
        <span>{sortedComponents.length} components</span>
      </div>

      <div className="radical-bank-grid">
        {sortedComponents.map((component) => (
          <div
            className={`radical-key ${statuses[component] ?? ''}`}
            key={component}
          >
            {component}
          </div>
        ))}
      </div>
    </div>
  )
}

export default RadicalBank