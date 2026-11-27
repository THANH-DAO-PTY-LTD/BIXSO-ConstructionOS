export const COMMITTED_PAYMENT_STATUSES = new Set(['invoiced', 'paid'])
export const COMMITTED_SUPPLY_STATUSES = new Set(['ordered', 'delivered', 'bought', 'used'])

export const paymentCanBeDeleted = (payment = {}) =>
  payment.kind !== 'quote' && payment.status === 'proposed'

export const supplyCanBeDeleted = (supply = {}) => !COMMITTED_SUPPLY_STATUSES.has(supply.status)

export const supplyIdentity = (supply = {}) =>
  String(supply.catalogue_id || `${supply.category || ''}:${supply.name || ''}:${supply.unit || ''}`).trim().toLowerCase()

export const agreementTotal = (agreement = {}) =>
  Number(agreement.amount_aud || 0) + (agreement.variations || []).reduce((sum, item) => sum + Number(item.amount_aud || 0), 0)
