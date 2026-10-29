function Switch(props) {
  return h(
    'span',
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

function LockIcon() {
  return h(
    'svg',
    { width: 12, height: 12, viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
    h('path', {
      fill: 'currentColor',
      d: 'M8 1a3 3 0 0 0-3 3v2H4.5A1.5 1.5 0 0 0 3 7.5v5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 6H11V4a3 3 0 0 0-3-3Zm2 5H6V4a2 2 0 1 1 4 0v2Z',
    }),
  )
}

function Chevron() {
  return h(
    'svg',
    { className: 'dcw-chevron', width: 12, height: 12, viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { fill: 'currentColor', d: 'M6 3.5 10.5 8 6 12.5 4.9 11.4 8.3 8 4.9 4.6Z' }),
  )
}

/** 五个区块统一用默认展开的 details，标题在摘要行。 */
function Section(props) {
  return h(
    'details',
    { className: 'dcw-card', open: true },
    h('summary', null, h('span', { className: 'dcw-card-title' }, props.title), h(Chevron)),
    props.children,
  )
}

/** 文件头可填写的一行：标签、开关、文本框。 */
function ValueRow(props) {
  const entry = props.entry
  return h(
    'div',
    { className: 'dcw-row' },
    h('div', { className: 'dcw-row-label' }, TAG_LABEL[props.tag]),
    h(Switch, {
      label: TAG_LABEL[props.tag],
      checked: entry.enabled,
      disabled: props.disabled,
      onChange: (enabled) => props.onChange({ ...entry, enabled }),
    }),
    h('input', {
      className: 'dcw-input',
      type: 'text',
      value: entry.value,
      placeholder: props.placeholder,
      disabled: props.disabled || !entry.enabled,
      'aria-label': `${TAG_LABEL[props.tag]} 的值`,
      onChange: (event) => props.onChange({ ...entry, value: event.target.value }),
    }),
  )
}

/** 只有开关的标签行；右侧框显示该标签的作用，不进入配置。 */
function FlagRow(props) {
  return h(
    'div',
    { className: 'dcw-row' },
    h('div', { className: 'dcw-row-label' }, TAG_LABEL[props.tag]),
    h(Switch, {
      label: TAG_LABEL[props.tag],
      checked: props.checked,
      disabled: props.disabled,
      onChange: props.onChange,
    }),
    h('input', {
      className: 'dcw-input',
      type: 'text',
      value: '',
      placeholder: props.placeholder,
      disabled: true,
      readOnly: true,
      tabIndex: -1,
      'aria-label': props.placeholder,
    }),
  )
}

/** 值由文件或语法固定的行：中间锁，右侧框给出固定值。 */
function LockRow(props) {
  return h(
    'div',
    { className: 'dcw-row dcw-row-lock' },
    h('div', { className: 'dcw-row-label' }, props.label),
    h('span', { className: 'dcw-lock', title: props.placeholder }, h(LockIcon)),
    h('input', {
      className: 'dcw-input',
      type: 'text',
      value: '',
      placeholder: props.placeholder,
      disabled: true,
      readOnly: true,
      tabIndex: -1,
      'aria-label': props.placeholder,
    }),
  )
}

/** 两种声明注释符号；按钮本身可用键盘切换。 */
function StyleRow(props) {
  const options = [
    { value: 'slash', label: '///' },
    { value: 'block', label: '/** */' },
  ]
  return h(
    'div',
    { className: 'dcw-row dcw-row-style' },
    h('div', { className: 'dcw-row-label' }, props.label),
    h(
      'div',
      { className: 'dcw-segmented', role: 'group', 'aria-label': props.label },
      options.map((option) =>
        h(
          'button',
          {
            key: option.value,
            type: 'button',
            className: 'dcw-segment',
            'aria-pressed': props.value === option.value ? 'true' : 'false',
            disabled: props.disabled,
            onClick: () => props.onChange(option.value),
          },
          option.label,
        ),
      ),
    ),
  )
}

function Preview(props) {
  const s = props.strings
  return h(
    Section,
    { title: s.preview },
    h('pre', { className: 'dcw-preview' }, previewText(props.config, SAMPLE_FILE)),
  )
}
