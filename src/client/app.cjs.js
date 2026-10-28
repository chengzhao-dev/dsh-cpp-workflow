// 配置卡片本身：状态机、保存/撤销/恢复默认值，以及组合包条目里的挂点。
// 分片按 scripts/building-client.mjs 的模块表顺序拼接：shell → text → styles →
// widgets → form-state → 本文件。分片共享同一个工厂作用域，不要各自 require。

// 宿主组合包 cordis.patch.yml 插入的 profile 条目 id；设置服务按它定位表单。
const ENTRY_ID = 'cpp-workflow'
// configForms 可能晚于本插件挂载；页面在首次绘制后短暂重试，拿不到再给手动恢复入口。
const FORM_RETRY_MS = 500
const MAX_FORM_RETRIES = 20

function ConfigPage(props) {
  const s = t()
  ensureStyles()
  // form 由挂点注入；resolveForm 兜住“服务晚到”的部署，拿到后下一次绘制自动接上。
  const form = props.form || (typeof props.resolveForm === 'function' ? props.resolveForm() : undefined)
  const state = useFormSnapshot(form)
  const initial = React.useMemo(() => normalizeConfig(state.value), [])
  const [draft, setDraft] = React.useState(initial)
  const [base, setBase] = React.useState(initial)
  const [dirty, setDirty] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const [tone, setTone] = React.useState('')
  const [attempt, setAttempt] = React.useState(0)
  const revision = state.revision
  // 快照只有 status / writable / revision；旧版本多出来的 mode 字段已不存在，
  // 再按它判断会把所有可写表单误判成只读。
  const ready = Boolean(form && state.status === 'ready' && state.writable)
  const status = state.status
  const missing = !form

  React.useEffect(() => {
    if (dirty || state.status !== 'ready') return
    const next = normalizeConfig(state.value)
    setBase(next)
    setDraft(next)
  }, [revision, status, dirty, form, state.value])

  React.useEffect(() => {
    if (form || attempt >= MAX_FORM_RETRIES || typeof setTimeout !== 'function') return undefined
    const timer = setTimeout(() => setAttempt((value) => value + 1), FORM_RETRY_MS)
    return () => clearTimeout(timer)
  }, [form, attempt])

  const update = (patch) => {
    setDraft((current) => ({ ...current, ...patch }))
    setDirty(true)
    setMessage('')
    setTone('')
  }

  // 撤销：回到最近一次从宿主读到的值，不写盘。
  const reset = () => {
    setDraft(base)
    setDirty(false)
    setMessage('')
    setTone('')
  }

  // 恢复默认值：只填进草稿，点“保存”后才写盘，避免误触直接覆盖已保存的配置。
  const restoreDefaults = () => {
    setDraft(normalizeConfig(DEFAULT_CONFIG))
    setDirty(true)
    setMessage(s.restored)
    setTone('')
  }

  const reload = () => {
    if (typeof window !== 'undefined' && window.location && typeof window.location.reload === 'function') {
      window.location.reload()
    }
  }

  const save = async () => {
    if (!ready || busy) return
    const operations = diffOperations(draft, base)
    if (operations.length === 0) return
    setBusy(true)
    try {
      const accepted = await form.mutate(operations, revision)
      if (accepted) {
        setBase(draft)
        setDirty(false)
        setMessage(s.saved)
        setTone('ok')
      } else {
        // 被拒时宿主已刷新镜像；把基准对齐到新快照，撤销才不会回到过期值。
        const fresh = snapshotOf(form)
        if (fresh && fresh.status === 'ready') setBase(normalizeConfig(fresh.value))
        setMessage(s.rejected)
        setTone('warn')
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
      setTone('warn')
    } finally {
      setBusy(false)
    }
  }

  const editable = Boolean(form)
  const disabled = !ready

  return h(
    'div',
    { className: 'dcw-page' },
    h(
      'header',
      { className: 'dcw-head' },
      h('p', { className: 'dcw-eyebrow' }, s.eyebrow),
      h('h3', { className: 'dcw-title' }, s.title),
      h('p', { className: 'dcw-lede' }, s.intro),
    ),
    missing
      ? h(
          'div',
          { className: 'dcw-note', role: 'status', 'data-tone': 'warn' },
          h('span', { className: 'dcw-note-dot' }),
          h(
            'span',
            null,
            s.readOnly,
            props.hasService === false ? h('span', { className: 'dcw-note-code' }, s.noService) : null,
          ),
          h(
            'button',
            { type: 'button', className: 'dcw-note-action', onClick: reload },
            s.reload,
          ),
        )
      : null,
    editable && !ready && status !== 'missing'
      ? h(
          'div',
          { className: 'dcw-note', role: 'status' },
          h('span', { className: 'dcw-note-dot' }),
          h('span', null, status === 'loading' ? s.loading : status === 'unavailable' ? s.unavailable : s.unreadable),
        )
      : null,
    h(
      'section',
      { className: 'dcw-card', 'aria-labelledby': 'dcw-header-title' },
      h(
        'div',
        { className: 'dcw-card-head' },
        h('h4', { className: 'dcw-card-title', id: 'dcw-header-title' }, s.header),
        h('p', { className: 'dcw-card-hint' }, s.headerHint),
      ),
      h(
        'div',
        { className: 'dcw-row dcw-row-fixed' },
        h('div', { className: 'dcw-row-label' }, TAG_LABEL.file),
        h(
          'div',
          { className: 'dcw-row-control' },
          h('span', { className: 'dcw-static' }, h(LockIcon), s.fixed),
          h('p', { className: 'dcw-row-hint' }, s.fixedHint),
        ),
      ),
      ...HEADER_TAGS.map((tag) =>
        h(ValueRow, {
          key: tag,
          tag,
          strings: s,
          entry: draft[tag],
          disabled,
          onChange: (entry) => update({ [tag]: entry }),
        }),
      ),
    ),
    h(
      'section',
      { className: 'dcw-card', 'aria-labelledby': 'dcw-contract-title' },
      h(
        'div',
        { className: 'dcw-card-head' },
        h('h4', { className: 'dcw-card-title', id: 'dcw-contract-title' }, s.contract),
        h('p', { className: 'dcw-card-hint' }, s.contractHint),
      ),
      h(
        'div',
        { className: 'dcw-flags' },
        ...CONTRACT_TAGS.map((tag) =>
          h(Flag, {
            key: tag,
            tag,
            checked: draft[tag],
            disabled,
            hint: s[HINT_KEY[tag]],
            onChange: (value) => update({ [tag]: value }),
          }),
        ),
      ),
    ),
    h(
      'details',
      { className: 'dcw-card' },
      h('summary', null, h('span', { className: 'dcw-card-title' }, s.extra), h(Chevron)),
      h('p', { className: 'dcw-card-hint', style: { margin: '0 14px 2px' } }, s.extraHint),
      h(
        'div',
        { className: 'dcw-flags' },
        ...EXTRA_TAGS.map((tag) =>
          h(Flag, {
            key: tag,
            tag,
            checked: draft[tag],
            disabled,
            onChange: (value) => update({ [tag]: value }),
          }),
        ),
      ),
    ),
    h(Preview, { config: draft, strings: s }),
    editable
      ? h(
          'div',
          { className: 'dcw-actions' },
          h(
            'button',
            {
              type: 'button',
              className: 'dcw-btn dcw-btn-primary',
              onClick: save,
              disabled: busy || !ready || !dirty,
            },
            s.save,
          ),
          h('button', { type: 'button', className: 'dcw-btn', onClick: reset, disabled: busy || !dirty }, s.reset),
          h(
            'button',
            { type: 'button', className: 'dcw-btn', onClick: restoreDefaults, disabled: busy || !ready },
            s.defaults,
          ),
          h('p', { className: 'dcw-status', role: 'status', 'data-tone': tone }, message || (dirty ? s.unsaved : '')),
        )
      : null,
  )
}

function page(ownerProps, form, resolveForm, hasService) {
  return h(ConfigPage, { ...(ownerProps || {}), form, resolveForm, hasService })
}

function apply(ctx) {
  // 每次取表单都重新查询服务：宿主可能在本插件之后才挂载 configForms。
  const resolveForm = () => {
    if (!ctx.configForms || typeof ctx.configForms.get !== 'function') return undefined
    try {
      return ctx.configForms.get(ENTRY_ID)
    } catch {
      return undefined
    }
  }
  const hasService = Boolean(ctx.configForms && typeof ctx.configForms.get === 'function')
  const mount = () =>
    ctx.slots.inject('plugins.bundle.config', () =>
      ctx.slots.register(
        {
          name: 'plugins.bundle.config',
          key: PACKAGE_NAME,
          label: () => t().nav,
        },
        (ownerProps) =>
          ownerProps && ownerProps.view === 'summary'
            ? null
            : page(ownerProps, undefined, resolveForm, hasService),
      ),
    )
  if (ctx.configForms && typeof ctx.configForms.whileServed === 'function') {
    ctx.effect(() => ctx.configForms.whileServed([ENTRY_ID], mount), 'dsh-cpp-workflow: 配置挂点')
  } else {
    mount()
  }
}

module.exports = {
  name: PACKAGE_NAME,
  inject: ['slots', 'configForms'],
  apply,
  ConfigPage,
  diffOperations,
  previewText,
}
