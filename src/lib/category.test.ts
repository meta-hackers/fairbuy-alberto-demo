import { describe, expect, it } from 'vitest'
import { routeCategory } from './category'

describe('mock category routing', () => {
  it('routes PC/computer by whole word and defaults unrelated text to PC', () => {
    expect(routeCategory('cerco un PC gaming')).toBe('desktop')
    expect(routeCategory('new computer')).toBe('desktop')
    expect(routeCategory('hello there')).toBe('desktop')
  })
  it('routes switch/interruttore to the relay unless context means another switch', () => {
    expect(routeCategory('smart switch for neon')).toBe('relay')
    expect(routeCategory('interruttore del neon')).toBe('relay')
    expect(routeCategory('Nintendo Switch')).toBe('ambiguous')
    expect(routeCategory('PC e switch')).toBe('ambiguous')
    expect(routeCategory('network switch')).toBe('ambiguous')
  })
})
