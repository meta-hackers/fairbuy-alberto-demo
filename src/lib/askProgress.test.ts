import { describe, expect, it } from 'vitest'
import { distinctFollowUpCount } from './askProgress'

describe('Ask follow-up progress', () => {
  it('does not count the initial request as a follow-up', () => {
    expect(distinctFollowUpCount(['A gaming computer'])).toBe(0)
  })

  it('counts two distinct, nonblank follow-up answers', () => {
    expect(distinctFollowUpCount(['A gaming computer', '1440p please', 'Budget CHF 2000'])).toBe(2)
  })

  it('does not inflate the count for duplicates, whitespace, or resubmitting the initial answer', () => {
    expect(distinctFollowUpCount(['A gaming computer', '  1440p please  ', '1440P PLEASE', 'A gaming computer', '  '])).toBe(1)
  })

  it('normalizes spacing and case while preserving distinct content', () => {
    expect(distinctFollowUpCount(['Need a relay', 'budget CHF 50', 'Hue   Bridge', 'budget   CHF 50'])).toBe(2)
  })
})
