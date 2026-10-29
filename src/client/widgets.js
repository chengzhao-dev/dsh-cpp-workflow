function Switch(props) {
  return h(
    'label',
    { className: 'dcw-switch' },
    h('input', {
      type: 'checkbox',
      checked: Boolean(props.checked),
      disabled: Boolean(props.disabled),
      'aria-label': props.label,
      onChange: (event) => props.onChange(event.target.checked),
    }),
    h('span', { className: 'dcw-track' }, h('span', { className: 'dcw-knob' })),
  )
}

/** 设置页的分组卡片：标题下一句说明，正文按行排控件。 */
function Section(props) {
  return h(
    'section',
    { className: 'dcw-card' },
    h(
      'div',
      { className: 'dcw-card-head' },
      h('h4', { className: 'dcw-card-title' }, props.title),
      props.hint ? h('p', { className: 'dcw-card-hint' }, props.hint) : null,
    ),
    h('div', { className: 'dcw-card-body' }, props.children),
  )
}

/** 文件头可填写的一行：标题与开关一行，输入框整行在下；关闭时收起输入框。 */
function ValueRow(props) {
  const entry = props.entry
  return h(
    'div',
    {
      className: 'dcw-row dcw-row-value',
      onClick: (event) => {
        if (props.disabled) return
        if (event.target.closest('.dcw-switch, .dcw-input')) return
        props.onChange({ ...entry, enabled: !entry.enabled })
      },
    },
    h(
      'div',
      { className: 'dcw-row-main' },
      h('span', { className: 'dcw-row-label' }, TAG_LABEL[props.tag]),
    ),
    h(Switch, {
      label: TAG_LABEL[props.tag],
      checked: entry.enabled,
      disabled: props.disabled,
      onChange: (enabled) => props.onChange({ ...entry, enabled }),
    }),
    entry.enabled
      ? h('input', {
          className: 'dcw-input',
          type: 'text',
          value: entry.value,
          placeholder: props.placeholder,
          disabled: props.disabled,
          'aria-label': `${TAG_LABEL[props.tag]} 的值`,
          onChange: (event) => props.onChange({ ...entry, value: event.target.value }),
        })
      : null,
  )
}

/** 只有开关的标签行；说明放在标题下面，不再放一个不可用的假输入框。 */
function FlagRow(props) {
  return h(
    'div',
    {
      className: 'dcw-row dcw-row-flag',
      onClick: (event) => {
        if (props.disabled) return
        if (event.target.closest('.dcw-switch, .dcw-input')) return
        props.onChange(!props.checked)
      },
    },
    h(
      'div',
      { className: 'dcw-row-main' },
      h('span', { className: 'dcw-row-label' }, TAG_LABEL[props.tag]),
      props.hint ? h('span', { className: 'dcw-row-hint' }, props.hint) : null,
    ),
    h(Switch, {
      label: TAG_LABEL[props.tag],
      checked: props.checked,
      disabled: props.disabled,
      onChange: props.onChange,
    }),
  )
}

/** 值由文件或语法固定的行：右侧写成普通文本，不放锁图标。 */
function LockRow(props) {
  return h(
    'div',
    { className: 'dcw-row dcw-row-fixed' },
    h(
      'div',
      { className: 'dcw-row-main' },
      h('span', { className: 'dcw-row-label' }, props.label),
    ),
    h('span', { className: 'dcw-fixed-value' }, props.value),
  )
}

/** 两种声明注释符号：两张等宽卡片，上面符号、下面示例。 */
function StyleRow(props) {
  const options = [
    { value: 'slash', symbol: '///', example: props.slashExample },
    { value: 'block', symbol: '/** */', example: props.blockExample },
  ]
  return h(
    'div',
    { className: 'dcw-style-options', role: 'radiogroup', 'aria-label': props.label },
    options.map((option) =>
      h(
        'button',
        {
          key: option.value,
          type: 'button',
          role: 'radio',
          'aria-checked': props.value === option.value ? 'true' : 'false',
          className: 'dcw-style-option',
          disabled: props.disabled,
          onClick: () => props.onChange(option.value),
        },
        h('span', { className: 'dcw-style-symbol' }, option.symbol),
        h('span', { className: 'dcw-style-example' }, option.example),
      ),
    ),
  )
}

function Preview(props) {
  const s = props.strings
  return h(
    Section,
    { title: s.preview, hint: s.previewHint },
    h(
      'div',
      { className: 'dcw-preview' },
      h('div', { className: 'dcw-preview-head' }, h('span', { className: 'dcw-preview-dot' }), SAMPLE_FILE),
      h('pre', { className: 'dcw-preview-body' }, previewText(props.config, SAMPLE_FILE)),
    ),
  )
}
