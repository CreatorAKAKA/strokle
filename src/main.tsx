import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Strokle from './Strokle'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Strokle />

    <footer style={{
      textAlign: 'center',
      padding: '24px',
      fontSize: '12px',
      opacity: 0.6
    }}>
      <a
        href="https://github.com/CreatorAKAKA/strokle/blob/main/THIRD_PARTY_LICENSES.md"
        target="_blank"
        rel="noopener noreferrer"
      >
        Data Sources & Credits
      </a>
    </footer>
  </StrictMode>,
)
