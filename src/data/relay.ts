import type { Characteristic } from '../lib/flow'

export const RELAY_FEATURES: Characteristic[] = [
  { id: 'hue', label: 'Bridge Philips Hue : compatibilité native déclarée, à vérifier', kind: 'custom', supported: false },
  { id: 'on-off', label: 'ON/OFF uniquement · SANS DIMMER : exigence à vérifier', kind: 'custom', supported: false },
  { id: 'voltage', label: '230 V AC · neutre L+N disponible', kind: 'custom', supported: false },
  { id: 'mount', label: 'Boîte de dérivation au plafond · pas derrière l’interrupteur', kind: 'custom', supported: false },
  { id: 'fixed', label: 'Installation fixe · pas une prise', kind: 'custom', supported: false },
  { id: 'load', label: 'Puissance réelle du néon : INCONNUE', kind: 'custom', supported: false },
]

export interface RelayProduct { id: string; name: string; mockTotal: number; claim: string; url: string }
export const relayProducts: RelayProduct[] = [
  {
    id: 'led-trading', name: 'LED Trading ZigBee-Aktor 230V', mockTotal: 34.65,
    claim: 'Recherche historique : ASIN B08Q3HF3HJ, env. CHF 29.65 (pas une offre actuelle). Capacité annoncée du MODULE : LED 200 W / 1.5 A ; ce n’est PAS la consommation mesurée du néon. Dimensions citées : 45 × 45.5 × 20.3 mm, IP20. Compatibilité native Hue déclarée par la recherche, non vérifiée ici. Contradiction de la source : aussi appelé « dimmer ». La capacité ON/OFF sans dimmer reste À VÉRIFIER, jamais certifiée.',
    url: 'https://www.amazon.de/-/en/gp/product/B08Q3HF3HJ/',
  },
  {
    id: 'iluminize', name: 'Iluminize 5120.2', mockTotal: 49,
    claim: 'Alternative citée dans la recherche fournie. Compatibilité native Hue, capacité de charge et absence de dimmer à vérifier dans la documentation du modèle exact. Aucun prix actuel vérifié. Total purement mock de CHF 49 pour tester le filtre.',
    url: 'https://www.iluminize.com/shop/5120-2-aktor-230v-mit-anschluss-fur-lichtschalter-wechselschaltung-zigbee-kompatibel-1951',
  },
  {
    id: 'gledopto', name: 'Gledopto ON/OFF', mockTotal: 39,
    claim: 'Alternative ON/OFF citée dans la recherche. Référence exacte, compatibilité native Hue et capacité à vérifier. Aucun prix actuel vérifié. Total purement mock de CHF 39 pour tester le filtre.',
    url: 'https://www.gledopto.eu/zigbee-on-off-wall-switch-80x80mm_1',
  },
]

export const RELAY_FOLLOW_UP = 'Pour le relais smart du néon (pas Nintendo ni réseau) : quel budget, quel bridge et quelle puissance réelle du néon ? La puissance est inconnue dans cette simulation ; 200 W / 1.5 A désigne une capacité du module, pas une mesure de la charge.'
export const RELAY_RESEARCH_NOTE = 'Recherche historique fournie, non vérifiée en direct. Candidats à étudier, pas des compatibilités certifiées. Aucun achat ni offre réelle. Hue Smart Plug CH exclu pour ce scénario à câblage fixe. Sonoff ZBMINIR2 / ZBMINIL2, MiBoxer PZ2, EMOS GoSmart et Shelly Gen4 rejetés dans la recherche source ; motifs non revérifiés, aucune incompatibilité générale de protocole affirmée.'
