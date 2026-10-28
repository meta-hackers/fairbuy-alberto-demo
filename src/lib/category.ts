export type Category = 'desktop' | 'relay' | 'ambiguous'
/** Only consulted for the first message, or the explicit answer to a category clarification. */
export function routeCategory(text: string): Category {
  const pc = /\b(pc|computer)\b/i.test(text)
  const relay = /\b(switch|interruttore)\b/i.test(text)
  const otherSwitch = /\b(nintendo|network|rete|ethernet)\b/i.test(text)
  if ((pc && relay) || (relay && otherSwitch)) return 'ambiguous'
  if (relay) return 'relay'
  return 'desktop'
}
