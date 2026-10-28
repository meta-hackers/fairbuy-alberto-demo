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

const budgetWords = ['budget', 'costo', 'costi', 'prezzo', 'prezzi', 'spesa', 'soldi', 'chf', 'franchi', 'franco', 'economico', 'costare']
const gpuWords = ['gpu', 'scheda video', 'scheda grafica', 'nvidia', 'radeon', 'rtx', 'geforce']
const ramWords = ['memoria']
const resolutionWords = ['risoluzione', 'resolution', '1080', '1440', '2160', '4k', 'frame', 'hertz', 'monitor']
const gamingWords = ['gioco', 'giochi', 'giocare', 'gaming', 'competitivo', 'competitivi', 'aaa', 'sim racing', 'coop', 'co-op', 'strategia', 'sparatutto', 'avventura', 'rpg']

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
      text: `Your active budget is ${formatCHF(brief.budgetMin)}–${formatCHF(brief.budgetMax)}. Free text does not change it; use the price control in Configure. Scripted reply, no AI.`,
    }
  }
  if (topic === 'gaming') {
    return {
      topic,
      text: `Your active characteristics cover: ${brief.games.length > 0 ? brief.games.join(', ') : 'no games selected'}. Change them in Configure; free text does not update characteristics. Scripted reply, no AI.`,
    }
  }
  if (topic === 'resolution') {
    return {
      topic,
      text: `Your active target is ${brief.resolution} · ${brief.targetFps} fps. Edit it in Configure; free text does not apply changes. Scripted reply, no AI.`,
    }
  }
  if (topic === 'ram') {
    return {
      topic,
      text: `Your active RAM characteristic is ${brief.ram.value} GB, ${brief.ram.mode}. Free text does not update it; use Configure. Scripted reply, no AI.`,
    }
  }
  if (topic === 'gpu') {
    return {
      topic,
      text: `Your active GPU characteristic is RTX ${brief.gpu.value} or higher, ${brief.gpu.mode}. ${brief.avoidGpu.length > 0 ? `You are avoiding: ${brief.avoidGpu.join(', ')}.` : 'No GPUs are on your avoid list.'} Free text does not update it; use Configure. Scripted reply, no AI.`,
    }
  }
  return {
    topic: 'fallback',
    text: 'I cannot reliably interpret that request. This demo responds only to keywords about budget, games, resolution/FPS, RAM, and GPU. Use Configure or edit your characteristics; I have not changed anything. Scripted reply, no AI.',
  }
}
