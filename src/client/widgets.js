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

const HINT_KEY = {
  brief: 'briefHint',
  author: 'authorHint',
  date: 'dateHint',
  copyright: 'copyrightHint',
  version: 'versionHint',
  param: 'paramHint',
  returns: 'returnHint',
  throws: 'throwsHint',
}

function ValueRow(props) {
  const s = props.strings
  const entry = props.entry
  return h(
    'div',
    { className: 'dcw-row' },
    h('div', { className: 'dcw-row-label' }, TAG_LABEL[props.tag]),
    h(
      'div',
      { className: 'dcw-row-control' },
      h(Switch, {
        label: TAG_LABEL[props.tag],
        checked: entry.enabled,
        disabled: props.disabled,
        onChange: (enabled) => props.onChange({ ...entry, enabled }),
      }),
      h('span', { className: 'dcw-state', 'aria-hidden': 'true' }, entry.enabled ? s.on : s.off),
      h('input', {
        className: 'dcw-input',
        type: 'text',
        value: entry.value,
        placeholder: props.tag === 'brief' ? s.blankBrief : s.emptyValue,
        disabled: props.disabled || !entry.enabled,
        'aria-label': `${TAG_LABEL[props.tag]} 的值`,
        onChange: (event) => props.onChange({ ...entry, value: event.target.value }),
      }),
      h('p', { className: 'dcw-row-hint' }, s[HINT_KEY[props.tag]] || ''),
    ),
  )
}

function Flag(props) {
  return h(
    'div',
    { className: 'dcw-flag' },
    h(
      'div',
      { className: 'dcw-row-label' },
      TAG_LABEL[props.tag],
      h(Switch, {
        label: TAG_LABEL[props.tag],
        checked: props.checked,
        disabled: props.disabled,
        onChange: props.onChange,
      }),
    ),
    h('p', { className: 'dcw-row-hint' }, props.hint || ''),
  )
}

function Preview(props) {
  const s = props.strings
  return h(
    'section',
    { className: 'dcw-card', 'aria-label': s.preview },
    h(
      'div',
      { className: 'dcw-card-head' },
      h('h4', { className: 'dcw-card-title' }, s.preview),
      h('p', { className: 'dcw-card-hint' }, s.previewHint),
    ),
    h('pre', { className: 'dcw-preview' }, previewText(props.config, SAMPLE_FILE)),
  )
}
