import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

export interface ChatMessage {
  id: string
  role: 'assistant' | 'user' | 'system'
  text: string
  simulated?: boolean
}

interface Props {
  messages: ChatMessage[]
  revealed: boolean
  characteristicCount: number
  onSend: (text: string) => void
  onConfigure: () => void
  placeholder?: string
}

export default function ChatPanel({ messages, revealed, characteristicCount, onSend, onConfigure, placeholder = 'What are you looking for?' }: Props) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const draftIsEmpty = draft.trim().length === 0
  const userCount = messages.filter((message) => message.role === 'user').length

  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [messages])

  const submitDraft = () => {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    onSend(text)
    inputRef.current?.focus()
  }

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submitDraft()
    }
  }

  return (
    <section className="chat-panel" aria-label="Shopping conversation">
      <div className="chat-panel__header">
        <strong>Your request</strong>
      </div>
      <div className="chat-log" aria-live="polite" aria-relevant="additions" ref={logRef} data-testid="chat-log">
        {messages.length === 0 ? (
          <p className="chat-empty" data-testid="chat-empty">
            Tell us what you need. Start with a computer or a smart light switch.
          </p>
        ) : null}
        {messages.map((message) => (
          <div className={`bubble bubble--${message.role}`} key={message.id} data-testid={`message-${message.role}`} data-simulated={message.simulated ? 'true' : undefined}>
            <span className="bubble__role">
              {message.role === 'user' ? 'You' : 'FairBuy'}
            </span>
            <p>{message.text}</p>
          </div>
        ))}
      </div>
      <div className="chat-actions">
        {!revealed ? (
          <p className="hint" data-testid="ask-progress">
            {userCount === 0 ? 'Start with the product you need.' : 'Add useful details such as a use case, size, performance target, or feature.'}
          </p>
        ) : (
          <div className="chat-actions__row chat-actions__row--between">
            <span className="hint" data-testid="chat-revealed-note">
              {characteristicCount} requirements ready to review.
            </span>
            <button type="button" className="button button--primary" onClick={onConfigure} data-testid="go-configure">
               Review in Configure →
            </button>
          </div>
        )}
        <form className="composer" aria-label="Your shopping message" onSubmit={(event) => { event.preventDefault(); submitDraft() }}>
          <label className="composer__label" htmlFor="ask-free-text">Your message</label>
          <textarea
            id="ask-free-text"
            className="composer__input"
            ref={inputRef}
            rows={2}
            maxLength={500}
            value={draft}
            placeholder={placeholder}
            aria-describedby="ask-composer-hint"
            autoComplete="off"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            data-testid="ask-input"
          />
          <div className="chat-actions__row">
            <button type="submit" className="button button--ghost button--small" disabled={draftIsEmpty} data-testid="ask-send">Send</button>
            <span id="ask-composer-hint" className="hint">Enter to send · Shift+Enter for a new line</span>
          </div>
        </form>
      </div>
    </section>
  )
}
