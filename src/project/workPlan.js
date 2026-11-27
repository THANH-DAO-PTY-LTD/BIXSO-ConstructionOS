const STATUS_RANK = { todo: 0, doing: 1, done: 2 }

export const workTaskKey = (task) =>
  `${String(task?.phase || '').trim().toLowerCase()}::${String(task?.title || '').trim().toLowerCase()}`

const canonicalTask = (left, right) => {
  const statusDelta = (STATUS_RANK[right?.status] || 0) - (STATUS_RANK[left?.status] || 0)
  if (statusDelta) return statusDelta > 0 ? right : left

  const orderDelta = Number(left?.order || 0) - Number(right?.order || 0)
  if (orderDelta) return orderDelta < 0 ? left : right

  const createdDelta = String(left?.created || '').localeCompare(String(right?.created || ''))
  if (createdDelta) return createdDelta < 0 ? left : right
  return String(left?.id || '').localeCompare(String(right?.id || '')) <= 0 ? left : right
}

export function inspectWorkPlan(tasks = []) {
  const groups = new Map()
  for (const task of tasks) {
    const key = workTaskKey(task)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(task)
  }

  const keep = []
  const duplicates = []
  for (const group of groups.values()) {
    const winner = group.reduce(canonicalTask)
    keep.push(winner)
    duplicates.push(...group.filter((task) => task.id !== winner.id))
  }

  keep.sort((a, b) =>
    Number(a.order || 0) - Number(b.order || 0)
    || String(a.created || '').localeCompare(String(b.created || ''))
    || String(a.id || '').localeCompare(String(b.id || '')))

  return {
    keep,
    duplicates,
    progress: keep.length
      ? Math.round((keep.filter((task) => task.status === 'done').length / keep.length) * 100)
      : 0,
  }
}

export const hasAcceptedHandover = (decisions = []) =>
  decisions.some((decision) => decision?.type === 'handover' && decision?.status === 'approved')
