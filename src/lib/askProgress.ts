/** Count distinct nonblank user turns after the initial request. */
export function distinctFollowUpCount(userMessages: string[]): number {
  if (userMessages.length < 2) return 0
  const initial = normalizeAnswer(userMessages[0])
  const followUps = new Set(
    userMessages.slice(1)
      .map(normalizeAnswer)
      .filter((answer) => answer && answer !== initial),
  )
  return followUps.size
}

function normalizeAnswer(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}
