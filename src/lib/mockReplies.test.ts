import { describe, expect, it } from 'vitest'
import { defaultBrief } from '../data/fixtures'
import { mockReply, mockTopicFor } from './mockReplies'

describe('mock free-text replies', () => {
  it('answers budget questions from the current brief without changing it', () => {
    const reply = mockReply('Il mio budget massimo è 1800 CHF', defaultBrief)
    expect(reply.topic).toBe('budget')
    expect(reply.text).toContain("CHF 1'200")
    expect(reply.text).toContain("CHF 2'400")
    expect(reply.text).toContain('Il testo libero non modifica il budget')
    expect(reply.text).toContain('nessuna AI')
  })

  it('answers gaming questions and points to Configura', () => {
    const reply = mockReply('Gioco soprattutto FPS competitivi e giochi AAA', defaultBrief)
    expect(reply.topic).toBe('gaming')
    expect(reply.text).toContain('FPS competitivi')
    expect(reply.text).toContain('Configura')
  })

  it('answers resolution and FPS questions with the current target', () => {
    const reply = mockReply('Vorrei giocare in 4K', defaultBrief)
    expect(reply.topic).toBe('resolution')
    expect(reply.text).toContain('1440p')
    expect(reply.text).toContain('120 fps')
  })

  it('answers RAM questions without inferring a mandatory rule', () => {
    const reply = mockReply('Mi servono 32 GB di RAM', defaultBrief)
    expect(reply.topic).toBe('ram')
    expect(reply.text).toContain('32 GB')
    expect(reply.text).toContain('preferita')
    expect(reply.text).toContain('non aggiorna il vincolo')
  })

  it('answers GPU questions and reports avoided models', () => {
    const brief = { ...defaultBrief, avoidGpu: ['RTX 4060 Ti'] }
    const reply = mockReply('Che GPU mi consigli?', brief)
    expect(reply.topic).toBe('gpu')
    expect(reply.text).toContain('RTX 4070 o superiore')
    expect(reply.text).toContain('RTX 4060 Ti')
  })

  it('uses an explicit fallback for unsupported input', () => {
    const reply = mockReply('Mi piace il colore blu', defaultBrief)
    expect(reply.topic).toBe('fallback')
    expect(reply.text).toContain('Non interpreto')
    expect(reply.text).toContain('non ho modificato nulla')
  })

  it('does not treat the word “programma” as RAM', () => {
    expect(mockTopicFor('Questo programma mi sembra utile')).toBe('fallback')
  })
})
