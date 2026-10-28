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
      text: `Il budget attivo va da ${formatCHF(brief.budgetMin)} a ${formatCHF(brief.budgetMax)}. Il testo libero non modifica il budget: usa il cursore del prezzo in Configura. Risposta simulata, nessuna AI.`,
    }
  }
  if (topic === 'gaming') {
    return {
      topic,
      text: `Le caratteristiche attive riguardano: ${brief.games.length > 0 ? brief.games.join(', ') : 'nessun gioco selezionato'}. Per cambiarle usa Configura; il testo libero non aggiorna le caratteristiche. Risposta simulata, nessuna AI.`,
    }
  }
  if (topic === 'resolution') {
    return {
      topic,
      text: `Le caratteristiche attive puntano a ${brief.resolution} · ${brief.targetFps} fps. Modifica la caratteristica in Configura; il testo libero non applica modifiche. Risposta simulata, nessuna AI.`,
    }
  }
  if (topic === 'ram') {
    return {
      topic,
      text: `La caratteristica RAM attiva è ${brief.ram.value} GB, ${brief.ram.mode === 'required' ? 'obbligatoria' : 'preferita'}. Il testo libero non aggiorna il vincolo: usa Configura. Risposta simulata, nessuna AI.`,
    }
  }
  if (topic === 'gpu') {
    return {
      topic,
      text: `La caratteristica GPU attiva è RTX ${brief.gpu.value} o superiore, ${brief.gpu.mode === 'required' ? 'obbligatoria' : 'preferita'}. ${brief.avoidGpu.length > 0 ? `Eviti: ${brief.avoidGpu.join(', ')}.` : 'Nessuna GPU è nella lista da evitare.'} Il testo libero non aggiorna il vincolo: usa Configura. Risposta simulata, nessuna AI.`,
    }
  }
  return {
    topic: 'fallback',
    text: 'Non interpreto questa richiesta in modo affidabile. Questa demo risponde solo a parole chiave su budget, giochi, risoluzione/FPS, RAM e GPU. Usa Configura o le caratteristiche: non ho modificato nulla. Risposta simulata, nessuna AI.',
  }
}
