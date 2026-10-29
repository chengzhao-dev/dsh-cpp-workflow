const STYLE_ID = 'dsh-cpp-workflow-settings'

// 外观只用宿主变量与两档中性色；没有变量时回落到浅色主题的一组合法颜色。
const CSS = `
.dcw-page{--dcw-fg:var(--dsw-alias-label-primary,#1f2328);--dcw-muted:var(--dsw-alias-label-secondary,#69707d);--dcw-faint:var(--dsw-alias-label-tertiary,#8a919c);--dcw-border:var(--dsw-alias-border-l2,rgba(31,35,40,.14));--dcw-bg1:var(--dsw-alias-bg-layer-1,#fff);--dcw-bg2:var(--dsw-alias-bg-layer-2,rgba(31,35,40,.035));--dcw-accent:var(--dsw-alias-brand-primary,#2f6fed);--dcw-danger:var(--dsw-alias-state-error-primary,#c0392b);color:var(--dcw-fg);max-width:760px;padding:2px 0 12px;font-size:13px;line-height:1.6}
.dcw-head{margin:0 0 14px}
.dcw-eyebrow{margin:0 0 4px;color:var(--dcw-muted);font-size:11.5px;letter-spacing:.02em}
.dcw-title{margin:0 0 6px;font-size:16px;font-weight:620;letter-spacing:.005em}
.dcw-lede{margin:0;color:var(--dcw-muted);font-size:12.5px;line-height:1.65;max-width:64ch}
.dcw-note{display:flex;gap:8px;align-items:center;margin:12px 0 0;padding:9px 11px;border:1px solid var(--dcw-border);border-radius:8px;background:var(--dcw-bg2);color:var(--dcw-muted);font-size:12px;line-height:1.55}
.dcw-note[data-tone="warn"]{color:var(--dcw-danger);border-color:color-mix(in srgb,var(--dcw-danger) 35%,transparent)}
.dcw-note-dot{flex:none;width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.55}
.dcw-card{margin:14px 0 0;border:1px solid var(--dcw-border);border-radius:10px;background:var(--dcw-bg1);overflow:hidden}
.dcw-card-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;padding:11px 14px 9px;border-bottom:1px solid var(--dcw-border);background:var(--dcw-bg2)}
.dcw-card-title{margin:0;font-size:12.5px;font-weight:620;letter-spacing:.01em}
.dcw-card-hint{margin:0;color:var(--dcw-muted);font-size:11.5px;line-height:1.5}
.dcw-row{display:grid;grid-template-columns:84px 40px minmax(0,1fr);align-items:center;gap:8px 12px;padding:8px 14px;border-top:1px solid var(--dcw-border)}
.dcw-row:first-of-type{border-top:0}
.dcw-row-label{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;color:var(--dcw-fg)}
.dcw-row-style{grid-template-columns:84px minmax(0,1fr)}
.dcw-row-style .dcw-segmented{grid-column:2}
.dcw-lock{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border:1px dashed var(--dcw-border);border-radius:6px;background:var(--dcw-bg2);color:var(--dcw-muted)}
.dcw-segmented{display:inline-flex;padding:2px;border:1px solid var(--dcw-border);border-radius:8px;background:var(--dcw-bg2);justify-self:start}
.dcw-segment{height:26px;padding:0 12px;border:0;border-radius:6px;background:transparent;color:var(--dcw-muted);font:inherit;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;cursor:pointer}
.dcw-segment:hover:enabled{color:var(--dcw-fg)}
.dcw-segment[aria-pressed="true"]{background:var(--dcw-bg1);color:var(--dcw-fg);box-shadow:0 1px 2px rgba(0,0,0,.12)}
.dcw-segment:focus-visible{outline:2px solid var(--dcw-accent);outline-offset:1px}
.dcw-segment:disabled{opacity:.45;cursor:default}
.dcw-switch{position:relative;display:inline-flex;align-items:center;flex:none;width:34px;height:20px;cursor:pointer}
.dcw-switch input{position:absolute;inset:0;margin:0;opacity:0;cursor:pointer}
.dcw-track{position:absolute;inset:0;border-radius:999px;background:color-mix(in srgb,var(--dcw-fg) 18%,transparent);transition:background .16s ease}
.dcw-knob{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .16s ease}
.dcw-switch input:checked + .dcw-track{background:var(--dcw-accent)}
.dcw-switch input:checked + .dcw-track .dcw-knob{transform:translateX(14px)}
.dcw-switch input:focus-visible + .dcw-track{outline:2px solid var(--dcw-accent);outline-offset:2px}
.dcw-switch input:disabled + .dcw-track{opacity:.4}
.dcw-switch input:disabled{cursor:default}
.dcw-state{color:var(--dcw-faint);font-size:11.5px;min-width:28px}
.dcw-input{flex:1 1 220px;min-width:0;height:28px;padding:0 9px;border:1px solid var(--dcw-border);border-radius:6px;background:transparent;color:var(--dcw-fg);font:inherit;font-size:12.5px}
.dcw-input::placeholder{color:var(--dcw-faint)}
.dcw-input:focus{outline:none;border-color:var(--dcw-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--dcw-accent) 18%,transparent)}
.dcw-input:disabled{background:var(--dcw-bg2);color:var(--dcw-faint)}
.dcw-flags{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0 16px;padding:4px 14px 8px}
.dcw-flag{display:flex;flex-direction:column;gap:3px;padding:7px 0}
.dcw-flag .dcw-row-label{padding-top:0;display:flex;align-items:center;gap:8px;justify-content:space-between}
.dcw-card>summary{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:11px 14px;cursor:pointer;list-style:none}
.dcw-card details>summary::-webkit-details-marker{display:none}
.dcw-card details>summary::marker{content:''}
.dcw-card>summary:hover{background:var(--dcw-bg2)}
.dcw-chevron{transition:transform .16s ease;color:var(--dcw-muted)}
.dcw-card[open] .dcw-chevron{transform:rotate(90deg)}
.dcw-preview{margin:0;padding:11px 14px 13px;border-top:1px solid var(--dcw-border);overflow-x:auto;background:var(--dcw-bg2);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.7;white-space:pre;color:var(--dcw-fg)}
.dcw-actions{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:14px;padding:11px 2px 4px;border-top:1px solid var(--dcw-border)}
.dcw-btn{height:30px;padding:0 13px;border:1px solid var(--dcw-border);border-radius:7px;background:var(--dcw-bg1);color:var(--dcw-fg);font:inherit;font-size:12.5px;cursor:pointer}
.dcw-btn:hover:enabled{border-color:color-mix(in srgb,var(--dcw-fg) 32%,transparent)}
.dcw-btn:focus-visible{outline:2px solid var(--dcw-accent);outline-offset:1px}
.dcw-btn:disabled{opacity:.45;cursor:default}
.dcw-btn-primary{background:var(--dcw-accent);border-color:transparent;color:var(--dsw-alias-label-primary-foreground,#fff)}
.dcw-btn-primary:hover:enabled{filter:brightness(1.06)}
.dcw-status{flex:1 1 200px;margin:0;color:var(--dcw-muted);font-size:12px}
.dcw-status[data-tone="warn"]{color:var(--dcw-danger)}
.dcw-status[data-tone="ok"]{color:var(--dsw-alias-state-success-primary,#1a7f37)}
.dcw-note-code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;opacity:.8;margin-left:6px}
.dcw-note-action{margin-left:auto;flex:none;padding:3px 10px;border:1px solid currentColor;border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:11.5px;cursor:pointer;white-space:nowrap}
.dcw-note-action:hover{background:var(--dcw-bg1)}
@media (max-width:640px){.dcw-row,.dcw-row-style{grid-template-columns:1fr 40px}.dcw-row-label{grid-column:1/-1}.dcw-row-style .dcw-segmented{grid-column:1/-1}}
`

function ensureStyles() {
  if (typeof document === 'undefined' || !document.createElement) return
  if (document.querySelector && document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`)) return
  const style = document.createElement('style')
  style.dataset.pluginCss = STYLE_ID
  style.textContent = CSS
  if (document.head && document.head.appendChild) document.head.appendChild(style)
}
