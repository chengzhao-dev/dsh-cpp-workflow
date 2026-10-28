function diffOperations(draft, base) {
  const operations = []
  for (const key of Object.keys(DEFAULT_CONFIG)) {
    const next = draft[key]
    const previous = base[key]
    if (next !== null && typeof next === 'object') {
      // 文件头字段整体不是 volatile，宿主只接受叶子路径（brief.enabled / brief.value）。
      const before = previous !== null && typeof previous === 'object' ? previous : {}
      for (const field of Object.keys(next)) {
        if (JSON.stringify(next[field]) !== JSON.stringify(before[field])) {
          operations.push({ op: 'set', path: [key, field], value: next[field] })
        }
      }
      continue
    }
    if (JSON.stringify(next) !== JSON.stringify(previous)) {
      operations.push({ op: 'set', path: [key], value: next })
    }
  }
  return operations
}

function snapshotOf(form) {
  if (!form) return { status: 'missing', writable: false }
  if (typeof form.getSnapshot === 'function') return form.getSnapshot()
  return form.state || { status: 'missing', writable: false }
}

// 宿主的 ConfigFormController 是可订阅的外部存储；旧调用方仍可能直接给 form.state。
function useFormSnapshot(form) {
  const [snapshot, setSnapshot] = React.useState(() => snapshotOf(form))
  React.useEffect(() => {
    if (!form || typeof form.subscribe !== 'function' || typeof form.getSnapshot !== 'function') {
      setSnapshot(snapshotOf(form))
      return undefined
    }
    setSnapshot(form.getSnapshot())
    return form.subscribe(() => setSnapshot(form.getSnapshot()))
  }, [form])
  return snapshot
}
