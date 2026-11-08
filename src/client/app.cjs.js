// 配置卡片本身：状态机、保存/撤销/恢复默认值，以及组合包条目里的挂点。
// 分片按 scripts/building-client.mjs 的模块表顺序拼接：shell → text → styles →
// widgets → form-state → 本文件。分片共享同一个工厂作用域，不要各自 require。

// 宿主组合包 cordis.patch.yml 插入的 profile 条目 id；设置服务按它定位表单。
const ENTRY_ID = 'cpp-workflow'

/** 文件头可填写标签的占位文字；顺序与 HEADER_TAGS 一致。 */
const HEADER_PLACEHOLDER = {
  brief: 'briefPlaceholder',
  author: 'authorPlaceholder',
  date: 'datePlaceholder',
  copyright: 'copyrightPlaceholder',
  version: 'versionPlaceholder',
}

/** 只有开关的标签按区块取占位文字。 */
const FLAG_PLACEHOLDER = {
  param: 'paramPlaceholder',
  returns: 'returnPlaceholder',
  throws: 'throwsPlaceholder',
  pre: 'prePlaceholder',
  post: 'postPlaceholder',
  retval: 'retvalPlaceholder',
  tparam: 'tparamPlaceholder',
  note: 'notePlaceholder',
  see: 'seePlaceholder',
}

function ConfigPage(props) {
  const s = t()
  ensureStyles()
  // 宿主把 configForms 列为必需注入，挂载时取一次表单；之后沿用同一个 controller，
  // 不在每次绘制里调用宿主服务。
  const [form] = React.useState(
    () => props.form || (typeof props.resolveForm === 'function' ? props.resolveForm() : undefined),
  )
  const state = useFormSnapshot(form)
  const initial = React.useMemo(() => normalizeConfig(state.value), [])
  const [draft, setDraft] = React.useState(initial)
  const [base, setBase] = React.useState(initial)
  const [dirty, setDirty] = React.useState(false)
  const [baseRevision, setBaseRevision] = React.useState(state.revision)
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const [tone, setTone] = React.useState('')
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
    setBaseRevision(state.revision)
    setDraft(next)
  }, [revision, status, dirty, form, state.value])

  // 脏标记按与已保存值的差集算：把开关关了又开回原值时，页面不该再说“有未保存的改动”。
  const update = (patch) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    setDirty(diffOperations(next, base).length > 0)
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
    const next = normalizeConfig(DEFAULT_CONFIG)
    setDraft(next)
    setDirty(diffOperations(next, base).length > 0)
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
      // 基准 revision 与 base 同时记录：草稿期间外部若改过配置，这里传旧 revision，
      // 宿主会拒绝，不会用新 revision 把旧草稿盖上去。
      const accepted = await form.mutate(operations, baseRevision)
      if (accepted) {
        const fresh = snapshotOf(form)
        if (fresh && fresh.status === 'ready') setBaseRevision(fresh.revision)
        setBase(draft)
        setDirty(false)
        setMessage(s.saved)
        setTone('ok')
      } else {
        // 被拒时宿主已刷新镜像；把基准对齐到新快照，撤销才不会回到过期值。
        const fresh = snapshotOf(form)
        if (fresh && fresh.status === 'ready') {
          setBase(normalizeConfig(fresh.value))
          setBaseRevision(fresh.revision)
        }
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

  /** 一个标签一行：标题与说明，右侧开关。 */
  const flag = (tag, checked) =>
    h(FlagRow, {
      key: tag,
      tag,
      checked,
      disabled,
      hint: s[FLAG_PLACEHOLDER[tag]],
      onChange: (value) => update({ [tag]: value }),
    })

  return h(
    'div',
    { className: 'dcw-page' },
    h(
      'header',
      { className: 'dcw-head' },
      h('h3', { className: 'dcw-title' }, s.heading),
      h('p', { className: 'dcw-lede' }, s.lede),
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
          h('button', { type: 'button', className: 'dcw-note-action', onClick: reload }, s.reload),
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
      Section,
      { title: s.style, hint: s.styleHint },
      h(StyleRow, {
        label: s.style,
        value: draft.commentStyle,
        disabled,
        slashExample: s.styleSlashExample,
        blockExample: s.styleBlockExample,
        onChange: (value) => update({ commentStyle: value }),
      }),
      h(LockRow, { label: s.bodyRow, value: s.bodyPlaceholder }),
    ),
    h(
      Section,
      { title: s.header, hint: s.headerHint },
      h(LockRow, { label: TAG_LABEL.file, value: s.filePlaceholder }),
      ...HEADER_TAGS.map((tag) =>
        h(ValueRow, {
          key: tag,
          tag,
          entry: draft[tag],
          disabled,
          placeholder: s[HEADER_PLACEHOLDER[tag]],
          onChange: (entry) => update({ [tag]: entry }),
        }),
      ),
    ),
    h(Section, { title: s.type, hint: s.typeHint }, ...TYPE_TAGS.map((tag) => flag(tag, draft[tag]))),
    h(
      Section,
      { title: s.declaration, hint: s.declarationHint },
      ...[...CONTRACT_TAGS, ...FUNCTION_EXTRA_TAGS].map((tag) => flag(tag, draft[tag])),
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
    // 旧宿主没有 whileServed 时也交给效果作用域注销挂点，卸载后不留悬挂注册。
    ctx.effect(() => mount(), 'dsh-cpp-workflow: 配置挂点')
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
