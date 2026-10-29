const STYLE_ID = 'dsh-cpp-workflow-settings'

// 外观只用宿主变量与两档中性色；没有变量时回落到浅色主题的一组合法颜色。
const CSS = `
.dcw-page{--dcw-fg:var(--dsw-alias-label-primary,#1f2328);--dcw-muted:var(--dsw-alias-label-secondary,#69707d);--dcw-faint:var(--dsw-alias-label-tertiary,#8a919c);--dcw-border:var(--dsw-alias-border-l2,rgba(31,35,40,.14));--dcw-bg1:var(--dsw-alias-bg-layer-1,#fff);--dcw-bg2:var(--dsw-alias-bg-layer-2,rgba(31,35,40,.035));--dcw-accent:var(--dsw-alias-brand-primary,#2f6fed);--dcw-danger:var(--dsw-alias-state-error-primary,#c0392b);--dcw-success:var(--dsw-alias-state-success-primary,#1a7f37);color:var(--dcw-fg);max-width:760px;padding:2px 0 12px;font-size:13px;line-height:1.6}
.dcw-head{margin:0 0 16px}
.dcw-title{margin:0 0 6px;font-size:17px;font-weight:620;letter-spacing:.005em}
.dcw-lede{margin:0;color:var(--dcw-muted);font-size:12.5px;line-height:1.65;max-width:66ch}
.dcw-note{display:flex;gap:8px;align-items:center;margin:12px 0 0;padding:9px 11px;border:1px solid var(--dcw-border);border-radius:8px;background:var(--dcw-bg2);color:var(--dcw-muted);font-size:12px;line-height:1.55}
.dcw-note[data-tone="warn"]{color:var(--dcw-danger);border-color:color-mix(in srgb,var(--dcw-danger) 35%,transparent)}
.dcw-note-dot{flex:none;width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.55}
.dcw-note-code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;opacity:.8;margin-left:6px}
.dcw-note-action{margin-left:auto;flex:none;padding:3px 10px;border:1px solid currentColor;border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:11.5px;cursor:pointer;white-space:nowrap}
.dcw-note-action:hover{background:var(--dcw-bg1)}
.dcw-card{margin:14px 0 0;border:1px solid var(--dcw-border);border-radius:12px;background:var(--dcw-bg1);overflow:hidden}
.dcw-card-head{padding:12px 16px 10px;border-bottom:1px solid var(--dcw-border);background:var(--dcw-bg2)}
.dcw-card-title{margin:0;font-size:13px;font-weight:620;letter-spacing:.01em}
.dcw-card-hint{margin:2px 0 0;color:var(--dcw-muted);font-size:11.5px;line-height:1.5}
.dcw-card-body{padding:0}
.dcw-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:2px 14px;min-height:48px;padding:10px 16px;border-top:1px solid var(--dcw-border)}
.dcw-card-body>.dcw-row:first-child{border-top:0}
.dcw-row-main{display:flex;flex-direction:column;gap:2px;min-width:0}
.dcw-row-label{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;color:var(--dcw-fg)}
.dcw-row-hint{color:var(--dcw-muted);font-size:11.5px;line-height:1.5}
.dcw-row-value .dcw-input{grid-column:1/-1;margin-top:8px}
.dcw-fixed-value{color:var(--dcw-muted);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;white-space:nowrap}
.dcw-row-flag,.dcw-row-value{cursor:pointer}
.dcw-style-options{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px 16px}
.dcw-style-option{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:12px 14px;border:1px solid var(--dcw-border);border-radius:10px;background:var(--dcw-bg1);color:var(--dcw-fg);font:inherit;text-align:left;cursor:pointer}
.dcw-style-option:hover:enabled{border-color:color-mix(in srgb,var(--dcw-fg) 30%,transparent)}
.dcw-style-option[aria-checked="true"]{border-color:var(--dcw-accent);background:color-mix(in srgb,var(--dcw-accent) 7%,var(--dcw-bg1));box-shadow:inset 0 0 0 1px var(--dcw-accent)}
.dcw-style-option:focus-visible{outline:2px solid var(--dcw-accent);outline-offset:2px}
.dcw-style-option:disabled{opacity:.5;cursor:default}
.dcw-style-symbol{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;font-weight:620}
.dcw-style-example{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:1.55;color:var(--dcw-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.dcw-switch{position:relative;display:inline-flex;align-items:center;flex:none;width:40px;height:22px;cursor:pointer}
.dcw-switch input{position:absolute;inset:0;margin:0;opacity:0;cursor:pointer}
.dcw-track{position:absolute;inset:0;border-radius:999px;background:color-mix(in srgb,var(--dcw-fg) 20%,transparent);transition:background .16s ease}
.dcw-knob{position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:var(--dsw-alias-bg-layer-1,#fff);box-shadow:0 1px 2px rgba(0,0,0,.28);transition:transform .16s ease}
.dcw-switch input:checked + .dcw-track{background:var(--dcw-accent)}
.dcw-switch input:checked + .dcw-track .dcw-knob{transform:translateX(18px)}
.dcw-switch input:focus-visible + .dcw-track{outline:2px solid var(--dcw-accent);outline-offset:2px}
.dcw-switch input:disabled + .dcw-track{opacity:.4}
.dcw-switch input:disabled{cursor:default}
.dcw-input{width:100%;min-width:0;height:36px;padding:0 11px;border:1px solid var(--dcw-border);border-radius:8px;background:var(--dcw-bg1);color:var(--dcw-fg);font:inherit;font-size:12.5px}
.dcw-input::placeholder{color:var(--dcw-faint)}
.dcw-input:focus{outline:none;border-color:var(--dcw-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--dcw-accent) 16%,transparent)}
.dcw-input:disabled{opacity:.55}
.dcw-preview{margin:0;border-top:1px solid var(--dcw-border)}
.dcw-preview-head{display:flex;align-items:center;gap:7px;padding:8px 14px;border-bottom:1px solid var(--dcw-border);background:var(--dcw-bg2);color:var(--dcw-muted);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px}
.dcw-preview-dot{width:6px;height:6px;border-radius:50%;background:var(--dcw-faint)}
.dcw-preview-body{margin:0;padding:12px 14px 14px;overflow-x:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.7;white-space:pre;color:var(--dcw-fg)}
.dcw-actions{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:16px;padding:12px 0 4px;border-top:1px solid var(--dcw-border)}
.dcw-btn{height:32px;padding:0 14px;border:1px solid var(--dcw-border);border-radius:8px;background:var(--dcw-bg1);color:var(--dcw-fg);font:inherit;font-size:12.5px;cursor:pointer}
.dcw-btn:hover:enabled{border-color:color-mix(in srgb,var(--dcw-fg) 32%,transparent)}
.dcw-btn:focus-visible{outline:2px solid var(--dcw-accent);outline-offset:1px}
.dcw-btn:disabled{opacity:.45;cursor:default}
.dcw-btn-primary{background:var(--dcw-accent);border-color:transparent;color:var(--dsw-alias-label-primary-foreground,#fff)}
.dcw-btn-primary:hover:enabled{filter:brightness(1.06)}
.dcw-status{flex:1 1 180px;margin:0;min-height:20px;color:var(--dcw-muted);font-size:12px}
.dcw-status[data-tone="warn"]{color:var(--dcw-danger)}
.dcw-status[data-tone="ok"]{color:var(--dcw-success)}
@media (max-width:520px){.dcw-style-options{grid-template-columns:1fr}.dcw-row{grid-template-columns:minmax(0,1fr) auto}.dcw-row-value .dcw-input{grid-column:1/-1}}
`

function ensureStyles() {
  if (typeof document === 'undefined' || !document.createElement) return
  if (document.querySelector && document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`)) return
  const style = document.createElement('style')
  style.dataset.pluginCss = STYLE_ID
  style.textContent = CSS
  if (document.head && document.head.appendChild) document.head.appendChild(style)
}
