import { useEffect, useRef, type ReactNode } from 'react'
import StageProgress, { type Stage } from './StageProgress'

interface Props {
  stage: Stage
  ready: boolean
  selected: boolean
  learning: boolean
  onNavigate: (stage: Stage) => void
  onRestart: () => void
  children: ReactNode
}

const titles: Record<Stage, string> = {
  ask: 'Find what fits.', configure: 'Make it yours.', discover: 'Your options.', buy: 'Purchase options.',
}

export default function ShoppingShell({ stage, ready, selected, learning, onNavigate, onRestart, children }: Props) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [stage])
  return <div className="shopping-shell">
    <header className="site-header">
      <span className="brand"><span aria-hidden="true">◇</span> fairbuy</span>
      <div className="header-actions">
        <button type="button" className="text-button" onClick={onRestart} data-testid="new-search">New search</button></div>
    </header>
    <StageProgress stage={stage} learning={learning} canConfigure={ready} canBuy={selected} onNavigate={onNavigate} />
    <main id="main-content" className="app-content">
      <h1 ref={heading} tabIndex={-1}>{titles[stage]}</h1>
      {children}
    </main>
  </div>
}
