import type { Characteristic } from '../lib/flow'

export const RELAY_FEATURES: Characteristic[] = [
  { id: 'hue', label: 'Philips Hue Bridge: native compatibility claimed, verify exact model', kind: 'custom', supported: false },
  { id: 'on-off', label: 'ON/OFF only · NO DIMMER: requirement to verify', kind: 'custom', supported: false },
  { id: 'voltage', label: '230 V AC · neutral L+N available', kind: 'custom', supported: false },
  { id: 'mount', label: 'Ceiling junction box · not behind the wall switch', kind: 'custom', supported: false },
  { id: 'fixed', label: 'Fixed wiring · not a plug-in device', kind: 'custom', supported: false },
  { id: 'load', label: 'Actual neon load: UNKNOWN', kind: 'custom', supported: false },
]

export interface RelayProduct { id: string; name: string; mockTotal: number; claim: string; url: string }
export const relayProducts: RelayProduct[] = [
  {
    id: 'led-trading', name: 'LED Trading ZigBee-Aktor 230V', mockTotal: 34.65,
    claim: 'Historical research reference: ASIN B08Q3HF3HJ, approximately CHF 29.65 at the time (not a current offer). The module is cited as rated for LED 200 W / 1.5 A; this is not the measured neon load. Cited dimensions: 45 × 45.5 × 20.3 mm, IP20. Native Hue compatibility is claimed in the supplied research but is not verified here. Source conflict: another source description calls it a “dimmer”. ON/OFF-only / no-dimmer capability remains to be verified and is not certified.',
    url: 'https://www.amazon.de/-/en/gp/product/B08Q3HF3HJ/',
  },
  {
    id: 'iluminize', name: 'Iluminize 5120.2', mockTotal: 49,
    claim: 'Alternative cited in the supplied research. Native Hue compatibility, load rating, and no-dimmer behavior must be checked against the exact model documentation. No current price verified. CHF 49 is a fictional demo total used only to exercise the price filter.',
    url: 'https://www.iluminize.com/shop/5120-2-aktor-230v-mit-anschluss-fur-lichtschalter-wechselschaltung-zigbee-kompatibel-1951',
  },
  {
    id: 'gledopto', name: 'Gledopto ON/OFF', mockTotal: 39,
    claim: 'ON/OFF alternative cited in the supplied research. Exact model, native Hue compatibility, and load rating must be verified. No current price verified. CHF 39 is a fictional demo total used only to exercise the price filter.',
    url: 'https://www.gledopto.eu/zigbee-on-off-wall-switch-80x80mm_1',
  },
]

export const RELAY_FOLLOW_UP = 'For a smart relay for your neon light (not a Nintendo or network switch): what is your budget, which bridge do you use, and what is the neon’s actual wattage? Actual wattage is unknown in this demo; 200 W / 1.5 A is a cited module capacity, not a measurement of your light.'
export const RELAY_RESEARCH_NOTE = 'Historical supplied research; not verified live. These are candidates to investigate, not certified compatible products. No real offers or purchases. Hue Smart Plug CH is excluded for this fixed-wiring scenario. The supplied research rejected Sonoff ZBMINIR2 / ZBMINIL2, MiBoxer PZ2, EMOS GoSmart, and Shelly Gen4; the reasons have not been re-verified. No general protocol incompatibility is asserted.'
