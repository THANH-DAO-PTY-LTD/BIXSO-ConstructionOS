export const SURVEY_EVIDENCE_FIELDS = [
  { key: 'accessWidthM', label: 'Minimum access width', suffix: 'm' },
  { key: 'soilType', label: 'Soil type / condition' },
  { key: 'slopePercent', label: 'Measured slope', suffix: '%' },
  { key: 'fallDirection', label: 'Fall direction' },
  { key: 'drainageStrategy', label: 'Drainage observation / strategy' },
  { key: 'bydaReference', label: 'Before You Dig Australia reference' },
]

const present = (value) => value !== null && value !== undefined && String(value).trim() !== ''

export function surveyReadiness(survey = {}) {
  const checklist = Array.isArray(survey.checklist) ? survey.checklist : []
  const evidence = survey.evidence || {}
  const missing = []

  if (!checklist.length || checklist.some((item) => !item.done)) missing.push('Complete every on-site check')
  if (!present(survey.findings)) missing.push('Record the site findings')
  for (const field of SURVEY_EVIDENCE_FIELDS) {
    if (!present(evidence[field.key])) missing.push(field.label)
  }
  if (evidence.servicesChecked !== true) missing.push('Confirm underground services were checked')
  if (evidence.easementsChecked !== true) missing.push('Confirm easements/title constraints were checked')
  if (!Number(evidence.photoCount || 0)) missing.push('Attach or record at least one site photo')

  return { ready: missing.length === 0, missing }
}

export function surveyReadyForQuote(survey = {}) {
  return survey.status === 'done' && surveyReadiness(survey).ready
}
