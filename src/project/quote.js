// Estimate → quote hand-off. Before an agreement exists the whole estimate is the
// quote. Once one exists the submission is a VARIATION, and an approved variation
// is ADDED to the agreed price (agreementTotal) — so only the difference between
// the live estimate and what is already agreed may be priced, never the full
// estimate a second time.
import { agreementTotal } from './ledger.js'

const fmt = (n) => `A$${Math.round(n).toLocaleString('en-AU')}`

export function normaliseDraftLines(draft = []) {
  return draft.map((l) => ({
    desc: l.desc ?? l.label ?? '', qty: l.qty ?? null, unit: l.unit ?? null,
    amount_aud: Number(l.amount_aud ?? l.amount) || 0,
  }))
}

/**
 * @returns {{ type: 'quote'|'variation', lines: object[], title: string, note: string }}
 * `lines` is empty when the live design is not above the agreed price.
 */
export function estimateToSubmission(draft, agreement) {
  const imported = normaliseDraftLines(draft)
  if (!agreement) return { type: 'quote', lines: imported, title: 'Quote — as designed & estimated', note: '' }
  const estimate = imported.reduce((sum, l) => sum + l.amount_aud, 0)
  const agreed = agreementTotal(agreement)
  const delta = Math.round(estimate - agreed)
  if (delta <= 0) {
    return {
      type: 'variation', lines: [], title: '',
      note: `The live design estimates ${fmt(estimate)}, not above the agreed ${fmt(agreed)} — nothing was imported. A variation is for a priced change: add its lines below.`,
    }
  }
  return {
    type: 'variation',
    lines: [{ desc: `Design changes since the agreement (live estimate ${fmt(estimate)} − agreed ${fmt(agreed)})`, qty: null, unit: null, amount_aud: delta }],
    title: 'Variation — design changes since the agreement',
    note: `Only the difference is priced: the agreed ${fmt(agreed)} already covers the rest of the ${fmt(estimate)} estimate. Split it into specific lines if you can.`,
  }
}
