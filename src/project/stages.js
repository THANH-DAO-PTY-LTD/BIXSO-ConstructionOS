const isDone = (task) => task?.status === 'done'
const isPending = (decision) => decision?.status === 'pending'

export function stageReadiness({ target, role, project, tasks = [], decisions = [] }) {
  const blockers = []

  if (target === 'in_progress') {
    if (role !== 'contractor') blockers.push('Only the engaged contractor can start the build.')
    if (!project?.concept_locked) blockers.push('Lock the design concept before starting construction.')
    if (!project?.agreement) blockers.push('Approve a quote and record the agreement before construction starts.')
  }

  if (target === 'handover' || target === 'completed') {
    if (target === 'handover' && role !== 'contractor') blockers.push('Only the engaged contractor can start handover.')
    if (target === 'completed' && role !== 'client') blockers.push('Only the client can accept handover and complete the project.')
    if (tasks.length === 0) blockers.push('Create a work plan before handover.')
    const incomplete = tasks.filter((task) => !isDone(task))
    if (incomplete.length) blockers.push(`${incomplete.length} of ${tasks.length} work tasks are still incomplete.`)
    const pending = decisions.filter(isPending)
    if (pending.length) blockers.push(`${pending.length} approval or milestone decision${pending.length === 1 ? ' is' : 's are'} still waiting.`)
  }

  return {
    ready: blockers.length === 0,
    blockers,
    completedTasks: tasks.filter(isDone).length,
    totalTasks: tasks.length,
    pendingDecisions: decisions.filter(isPending).length,
  }
}
