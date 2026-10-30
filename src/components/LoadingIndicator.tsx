interface Props {
  mode: 'loading' | 'updating'
}

export default function LoadingIndicator({ mode }: Props) {
  const message = mode === 'updating' ? 'Updating results…' : 'Loading products…'
  return <div className="loading-indicator" role="status" aria-live="polite" aria-atomic="true" data-testid="discover-loading" data-mode={mode}>
    <span className="loading-spinner" aria-hidden="true" />
    <span>{message}</span>
  </div>
}
