import type { Brief } from '../data/fixtures'
import { formatCHF } from './sellers'

export type MockTopic = 'budget' | 'gaming' | 'resolution' | 'ram' | 'gpu' | 'fallback'

export interface MockReply {
  topic: MockTopic
  text: string
}

const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const hasWord = (text: string, word: string) => {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(text)
}

const hasAny = (text: string, words: string[]) => words.some((word) => text.includes(word))

const budgetWords = ['budget', 'price', 'cost', 'expensive', 'cheap', 'costo', 'costi', 'prezzo', 'prezzi', 'spesa', 'soldi', 'chf', 'franchi', 'franco', 'economico', 'costare']
const gpuWords = ['gpu', 'scheda video', 'scheda grafica', 'nvidia', 'radeon', 'rtx', 'geforce']
const ramWords = ['memory', 'memoria']
const resolutionWords = ['risoluzione', 'resolution', '1080', '1440', '2160', '4k', 'frame', 'hertz', 'monitor']
const gamingWords = ['game', 'gaming', 'competitive', 'gioco', 'giochi', 'giocare', 'competitivo', 'competitivi', 'aaa', 'sim racing', 'coop', 'co-op', 'strategia', 'sparatutto', 'avventura', 'rpg']

export function mockTopicFor(text: string): MockTopic {
  const normalized = normalize(text)
  if (hasAny(normalized, budgetWords) || hasWord(normalized, 'caro')) return 'budget'
  if (hasAny(normalized, gpuWords) || hasAny(normalized, ['4060', '4070', '4080'])) return 'gpu'
  if (hasWord(normalized, 'ram') || hasAny(normalized, ramWords)) return 'ram'
  if (hasAny(normalized, resolutionWords) || hasWord(normalized, 'hz')) return 'resolution'
  if (hasAny(normalized, gamingWords)) return 'gaming'
  if (hasWord(normalized, 'fps')) return 'resolution'
  return 'fallback'
}

export function mockReply(text: string, brief: Brief): MockReply {
  const topic = mockTopicFor(text)
  if (topic === 'budget') {
    return {
      topic,
      text: `Your budget is ${formatCHF(brief.budgetMin)}–${formatCHF(brief.budgetMax)}. Free text does not change it; use Configure.`,
    }
  }
  if (topic === 'gaming') {
    return {
      topic,
      text: `Your requirements cover: ${brief.games.length > 0 ? brief.games.join(', ') : 'no games selected'}. Edit them in Configure; this message has not changed them.`,
    }
  }
  if (topic === 'resolution') {
    return {
      topic,
      text: `Your target is ${brief.resolution} · ${brief.targetFps} fps. Edit it in Configure; this message has not changed it.`,
    }
  }
  if (topic === 'ram') {
    return {
      topic,
      text: `Your RAM target is ${brief.ram.value} GB, ${brief.ram.mode}. Free text does not update it; use Configure.`,
    }
  }
  if (topic === 'gpu') {
    return {
      topic,
      text: `Your GPU target is RTX ${brief.gpu.value} or higher, ${brief.gpu.mode}. ${brief.avoidGpu.length > 0 ? `You are avoiding: ${brief.avoidGpu.join(', ')}.` : ''} Edit it in Configure; this message has not changed it.`,
    }
  }
  return {
    topic: 'fallback',
    text: 'I cannot reliably interpret that request. Review your requirements in Configure; I have not changed anything.',
  }
}
