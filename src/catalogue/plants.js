// Australian plant palette: data only, no rendering code.
//
// Each species carries the facts that drive real design: mature size (so it
// renders + spaces correctly), sun/water needs, spacing, and an indicative
// supply cost (an estimate).
// `shape` says how plants.jsx renders it: tree=trunk+canopy · shrub=rounded
// mass · grass=fan of blades · groundcover=low spreading mat · accent=
// architectural rosette · climber=slim tall mass · fern=arching fronds.

export const PLANTS = [
  // ── Grasses & strappy (bed fillers, borders) ──
  { id: 'lomandra-tanika', common: 'Lomandra ‘Tanika’', botanical: 'Lomandra longifolia', category: 'Grass', shape: 'grass', w: 0.6, h: 0.6, sun: 'Full–part', water: 'Low', spacing: 0.5, evergreen: true, flower: null, cost: 12 },
  { id: 'dianella-little-jess', common: 'Dianella ‘Little Jess’', botanical: 'Dianella caerulea', category: 'Grass', shape: 'grass', w: 0.4, h: 0.4, sun: 'Full–part', water: 'Low', spacing: 0.4, evergreen: true, flower: 'Blue', cost: 11 },
  { id: 'poa-labillardierei', common: 'Common Tussock Grass', botanical: 'Poa labillardierei', category: 'Grass', shape: 'grass', w: 0.7, h: 0.8, sun: 'Full', water: 'Low', spacing: 0.6, evergreen: true, flower: null, cost: 10 },
  // ── Groundcovers ──
  { id: 'native-violet', common: 'Native Violet', botanical: 'Viola hederacea', category: 'Groundcover', shape: 'groundcover', w: 0.4, h: 0.1, sun: 'Part–shade', water: 'Med', spacing: 0.3, evergreen: true, flower: 'Purple/white', cost: 6 },
  { id: 'myoporum', common: 'Creeping Boobialla', botanical: 'Myoporum parvifolium', category: 'Groundcover', shape: 'groundcover', w: 1.2, h: 0.1, sun: 'Full', water: 'Low', spacing: 0.8, evergreen: true, flower: 'White', cost: 8 },
  // ── Shrubs (structure, screening, colour) ──
  { id: 'westringia-greybox', common: 'Westringia ‘Grey Box’', botanical: 'Westringia fruticosa', category: 'Shrub', shape: 'shrub', w: 1, h: 1, sun: 'Full', water: 'Low', spacing: 0.8, evergreen: true, flower: 'White', cost: 14 },
  { id: 'grevillea-robyn', common: 'Grevillea ‘Robyn Gordon’', botanical: 'Grevillea', category: 'Shrub', shape: 'shrub', w: 2, h: 1.5, sun: 'Full', water: 'Low', spacing: 1.5, evergreen: true, flower: 'Red', cost: 16 },
  { id: 'callistemon-captain', common: 'Bottlebrush ‘Captain Cook’', botanical: 'Callistemon', category: 'Shrub', shape: 'shrub', w: 1.5, h: 2, sun: 'Full', water: 'Low', spacing: 1.2, evergreen: true, flower: 'Red', cost: 18 },
  { id: 'correa-alba', common: 'White Correa', botanical: 'Correa alba', category: 'Shrub', shape: 'shrub', w: 1.2, h: 1.2, sun: 'Full–part', water: 'Low', spacing: 1, evergreen: true, flower: 'White', cost: 14 },
  { id: 'anigozanthos', common: 'Kangaroo Paw', botanical: 'Anigozanthos', category: 'Shrub', shape: 'accent', w: 0.6, h: 1, sun: 'Full', water: 'Low', spacing: 0.5, evergreen: true, flower: 'Red/gold', cost: 13 },
  // ── Screening / hedging ──
  { id: 'lilly-pilly', common: 'Lilly Pilly', botanical: 'Syzygium', category: 'Screen', shape: 'shrub', w: 1.5, h: 3, sun: 'Full–part', water: 'Med', spacing: 1, evergreen: true, flower: 'White', cost: 22 },
  // ── Accents / architectural ──
  { id: 'agave-attenuata', common: 'Agave attenuata', botanical: 'Agave attenuata', category: 'Accent', shape: 'accent', w: 1, h: 0.8, sun: 'Full', water: 'Low', spacing: 1, evergreen: true, flower: null, cost: 20 },
  // ── Trees ──
  { id: 'magnolia-little-gem', common: 'Magnolia ‘Little Gem’', botanical: 'Magnolia grandiflora', category: 'Tree', shape: 'tree', w: 3, h: 5, sun: 'Full', water: 'Med', spacing: 3, evergreen: true, flower: 'White', cost: 90 },
  { id: 'banksia-integrifolia', common: 'Coast Banksia', botanical: 'Banksia integrifolia', category: 'Tree', shape: 'tree', w: 3, h: 4, sun: 'Full', water: 'Low', spacing: 3, evergreen: true, flower: 'Gold', cost: 45 },
  { id: 'eucalyptus-scoparia', common: 'Wallangarra White Gum', botanical: 'Eucalyptus scoparia', category: 'Tree', shape: 'gum', w: 5, h: 9, sun: 'Full', water: 'Low', spacing: 5, evergreen: true, flower: null, cost: 60 },
  { id: 'tree-fern', common: 'Soft Tree Fern', botanical: 'Dicksonia antarctica', category: 'Tree', shape: 'fern', w: 2.5, h: 3, sun: 'Shade', water: 'High', spacing: 2, evergreen: true, flower: null, cost: 70 },
]

export const PLANT_MAP = Object.fromEntries(PLANTS.map((p) => [p.id, p]))
export const PLANT_CATEGORIES = [...new Set(PLANTS.map((p) => p.category))]

// Radius of the plant's canopy at maturity — used by overlap checks and by the
// crowding warning in the growth simulation. Pure arithmetic, no geometry.
export const plantRadius = (speciesId) => ((PLANT_MAP[speciesId]?.w || 1) / 2)
