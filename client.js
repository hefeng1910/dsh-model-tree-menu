window.__ModuleLoader__.load({
  id: '@local/dsh-model-tree-menu',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    let ReactDOM = null;
    try { ReactDOM = require('react-dom'); } catch (_e) { ReactDOM = null; }
    const createPortal = ReactDOM && typeof ReactDOM.createPortal === 'function' ? ReactDOM.createPortal : null;

    // ---------------------------------------------------------------------
    // Locale (own namespace so we never clash with the shipped "model" ns)
    // ---------------------------------------------------------------------
    const NS = 'modelTree';

    const zh = {
      'provider.account': 'DeepSeek 账号',
      'trigger.fallback': '请选择模型',
      'trigger.loading': '正在加载模型…',
      'trigger.aria': '选择模型，当前 {model}',
      'trigger.ariaEffort': '选择模型，当前 {model}，推理等级 {effort}',
      'menu.aria': '模型与推理等级',
      'menu.model': '模型',
      'menu.effort': '推理等级',
      'menu.providers': '选择中转站',
      'menu.modelsOf': '{name} 的模型',
      'menu.back': '返回',
      'menu.providerCount': '{count} 个模型',
      'effort.providerDefault': 'Default',
      'status.loading': '正在刷新模型列表…',
      'error.action': '模型操作失败：{message}',
      'error.sessionInUse': '当前会话已被占用，可能是其他正在运行的 DSH 导致的，请退出其他 DSH 后重试。',
      'action.reload': '重新加载',
      'warning.groupLoad': '{name} 加载失败：{message}',
      'search.placeholder': '搜索该站模型…',
      'search.clear': '清除搜索',
      'search.empty': '没有匹配的模型。',
      'empty.models': '暂无可用模型',
      'empty.efforts': '当前模型未提供推理等级。'
    };

    const en = {
      'provider.account': 'DeepSeek Account',
      'trigger.fallback': 'Select model',
      'trigger.loading': 'Loading models…',
      'trigger.aria': 'Select model, current {model}',
      'trigger.ariaEffort': 'Select model, current {model}, reasoning effort {effort}',
      'menu.aria': 'Model and reasoning effort',
      'menu.model': 'Model',
      'menu.effort': 'Effort',
      'menu.providers': 'Choose a relay',
      'menu.modelsOf': 'Models in {name}',
      'menu.back': 'Back',
      'menu.providerCount': '{count} models',
      'effort.providerDefault': 'Default',
      'status.loading': 'Refreshing model list…',
      'error.action': 'Model operation failed: {message}',
      'error.sessionInUse': 'This session is already in use, possibly by another running DSH instance. Quit other DSH instances and try again.',
      'action.reload': 'Reload',
      'warning.groupLoad': '{name} failed to load: {message}',
      'search.placeholder': 'Search models in this relay…',
      'search.clear': 'Clear search',
      'search.empty': 'No matching models.',
      'empty.models': 'No models available.',
      'empty.efforts': 'This model provides no reasoning effort levels.'
    };

    // ---------------------------------------------------------------------
    // Small inline icons (no primitives dependency)
    // ---------------------------------------------------------------------
    function Svg(props, children) {
      return h('svg', Object.assign({
        viewBox: '0 0 24 24',
        width: 16,
        height: 16,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.7,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        focusable: false
      }, props), children);
    }
    const IconModel = () => Svg({ className: 'mtm_triggerIcon' }, h('rect', { x: 3, y: 4, width: 18, height: 6, rx: 2 }), h('rect', { x: 3, y: 14, width: 18, height: 6, rx: 2 }));
    const IconChevronDown = (p) => Svg(p, h('path', { d: 'M6 9l6 6 6-6' }));
    const IconChevronRight = (p) => Svg(p, h('path', { d: 'M9 6l6 6-6 6' }));
    const IconCheck = () => Svg({}, h('path', { d: 'M20 6L9 17l-5-5' }));
    const IconClose = () => Svg({}, h('path', { d: 'M18 6L6 18M6 6l12 12' }));
    const IconWarning = () => Svg({}, h('path', { d: 'M12 9v4M12 17h.01M10.3 3.9l-8 14A2 2 0 004 21h16a2 2 0 001.7-3.1l-8-14a2 2 0 00-3.4 0z' }));
    function Spinner() {
      return h('span', { className: 'mtm_spinner', 'aria-hidden': true });
    }

    // ---------------------------------------------------------------------
    // Fuzzy ranking for model names within one relay (subsequence match)
    // ---------------------------------------------------------------------
    function rankByName(items, query) {
      const q = query.trim().toLowerCase();
      if (q === '') return items.slice();
      const scored = [];
      for (let i = 0; i < items.length; i++) {
        const name = String(items[i].name || '').toLowerCase();
        const idx = name.indexOf(q);
        if (idx >= 0) {
          scored.push({ item: items[i], i, score: idx === 0 ? 0 : 1, idx });
          continue;
        }
        // ordered subsequence
        let qi = 0;
        let first = -1;
        for (let ni = 0; ni < name.length && qi < q.length; ni++) {
          if (name[ni] === q[qi]) {
            if (first < 0) first = ni;
            qi++;
          }
        }
        if (qi === q.length) scored.push({ item: items[i], i, score: 2, idx: first });
      }
      scored.sort((a, b) => a.score - b.score || a.idx - b.idx || a.i - b.i);
      return scored.map((s) => s.item);
    }

    // ---------------------------------------------------------------------
    // CSS (prefixed, theme tokens only)
    // ---------------------------------------------------------------------
    const css = `
/* ===== iOS 18 frosted-glass model picker ===== */
.mtm_root{min-width:0;position:relative;display:inline-flex}
.mtm_trigger{display:flex;align-items:center;gap:5px;min-width:0;max-width:min(360px,45cqw);height:30px;padding:0 8px 0 10px;border:1px solid color-mix(in srgb,var(--dsw-alias-border-l1) 60%,transparent);border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 42%,transparent);-webkit-backdrop-filter:blur(18px) saturate(180%);backdrop-filter:blur(18px) saturate(180%);color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;line-height:20px;cursor:pointer;outline:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 1px 2px rgba(0,0,0,.08);transition:background .18s ease,box-shadow .18s ease,transform .18s ease}
.mtm_trigger:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 72%,transparent);box-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 2px 8px rgba(0,0,0,.10)}
.mtm_trigger:active:not(:disabled){transform:scale(.98)}
.mtm_trigger:focus-visible{box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary)),inset 0 1px 0 rgba(255,255,255,.28)}
.mtm_trigger:disabled{opacity:.5;cursor:default}
.mtm_triggerLabel{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.mtm_triggerEffort{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex-shrink:1000;color:var(--dsw-alias-label-secondary)}
.mtm_triggerIcon{flex:none;display:var(--dsh-composer-model-icon-display,none)}
.mtm_triggerLabel,.mtm_triggerEffort{display:var(--dsh-composer-model-text-display,block)}
.mtm_chevron{flex:none;color:var(--dsw-alias-label-secondary);transition:transform .22s cubic-bezier(.34,1.2,.64,1)}
.mtm_chevronOpen{transform:rotate(180deg)}

/* floating glass panel */
.mtm_menu{position:fixed;z-index:1100;display:flex;flex-direction:column;width:max-content;min-width:min(248px,100vw - 32px);max-width:min(420px,100vw - 32px);max-height:min(400px,100vh - 96px);padding:6px;border:1px solid color-mix(in srgb,var(--dsw-alias-border-l1) 60%,transparent);border-radius:22px;background:color-mix(in srgb,var(--dsw-alias-bg-overlay) 28%,transparent);-webkit-backdrop-filter:blur(30px) saturate(185%);backdrop-filter:blur(30px) saturate(185%);color:var(--dsw-alias-label-primary);box-shadow:inset 0 1px 0 rgba(255,255,255,.30),inset 0 -1px 0 rgba(0,0,0,.05),0 16px 48px rgba(0,0,0,.28),0 3px 12px rgba(0,0,0,.14);animation:mtm_fade .18s ease}
@keyframes mtm_fade{from{opacity:0}to{opacity:1}}
@supports not ((-webkit-backdrop-filter:blur(1px)) or (backdrop-filter:blur(1px))){.mtm_menu{background:var(--dsw-alias-bg-overlay)}.mtm_trigger{background:var(--dsw-alias-bg-layer-2)}}
.mtm_scroll{overflow-y:auto;min-height:0;padding:1px;border-radius:17px;overscroll-behavior:contain}
.mtm_scroll::-webkit-scrollbar{width:8px}
.mtm_scroll::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2,rgba(127,127,127,.3));border-radius:99px;border:2px solid transparent;background-clip:padding-box}
.mtm_status,.mtm_empty{padding:12px 10px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);text-align:center}
.mtm_error,.mtm_warning{display:flex;gap:8px;align-items:flex-start;margin:4px 2px;padding:10px;border-radius:14px;font-size:12px;line-height:18px}
.mtm_error{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 14%,transparent);color:var(--dsw-alias-state-error-primary)}
.mtm_warning{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);color:var(--dsw-alias-state-warn-primary)}
.mtm_retry{margin-left:auto;flex:none;border:none;background:transparent;color:inherit;text-decoration:underline;font-size:12px;cursor:pointer}

/* list rows */
.mtm_cell,.mtm_option{display:flex;align-items:center;gap:9px;width:100%;padding:9px 10px;border:none;border-radius:13px;background:transparent;color:var(--dsw-alias-label-primary);font-size:13.5px;line-height:20px;text-align:left;cursor:pointer;outline:none;transition:background .15s ease,transform .12s ease}
.mtm_cell:hover,.mtm_cell:focus-visible,.mtm_option:hover:not(:disabled),.mtm_option:focus-visible,.mtm_optionActive{background:color-mix(in srgb,var(--dsw-alias-label-primary) 9%,transparent)}
.mtm_option:active:not(:disabled),.mtm_cell:active{transform:scale(.985)}
.mtm_option:disabled{opacity:.45;cursor:default}
.mtm_option.selected,.mtm_option.selected:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 16%,transparent)}
.mtm_cellLabel{flex:none;color:var(--dsw-alias-label-secondary)}
.mtm_cellValue{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right;color:var(--dsw-alias-label-secondary)}
.mtm_cellChevron{flex:none;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));opacity:.6}

/* search — inline glass pill */
.mtm_searchRow{display:flex;align-items:center;gap:6px;padding:2px 4px 8px}
.mtm_search{flex:1;min-width:0;height:34px;padding:0 12px;border:1px solid color-mix(in srgb,var(--dsw-alias-border-l1) 55%,transparent);border-radius:12px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 60%,transparent);color:var(--dsw-alias-label-primary);font-size:13.5px;outline:none;transition:border-color .15s ease,background .15s ease,box-shadow .15s ease}
.mtm_search::placeholder{color:var(--dsw-alias-label-secondary);opacity:.8}
.mtm_search:focus{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 70%,transparent);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 82%,transparent);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary) 18%,transparent)}
.mtm_searchClear{flex:none;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:none;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background .15s ease}
.mtm_searchClear:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 14%,transparent)}

/* header with back chevron */
.mtm_header{display:flex;align-items:center;gap:8px;padding:4px 6px 8px;font-size:12.5px;color:var(--dsw-alias-label-secondary)}
.mtm_back{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:none;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);color:var(--dsw-alias-label-primary);cursor:pointer;transition:background .15s ease}
.mtm_back:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 14%,transparent)}
.mtm_headerTitle{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;font-size:13px;color:var(--dsw-alias-label-primary)}

.mtm_optionCopy{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mtm_providerName{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}
.mtm_providerMeta{flex:none;font-size:12px;color:var(--dsw-alias-label-secondary);opacity:.75}
.mtm_check{flex:none;display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;color:var(--dsw-alias-brand-primary)}
.mtm_spinner{display:inline-block;width:14px;height:14px;border-radius:50%;border:2px solid color-mix(in srgb,var(--dsw-alias-label-secondary) 30%,transparent);border-top-color:var(--dsw-alias-brand-primary);animation:mtm_spin .7s linear infinite}
@keyframes mtm_spin{to{transform:rotate(360deg)}}
`;

    // ---------------------------------------------------------------------
    // Component
    // ---------------------------------------------------------------------
    const EMPTY_SNAPSHOT = { current: null, routable: null, groups: [], failures: [], status: 'idle', pending: null, error: null };
    const EMPTY_DIRECTORY_STORE = {
      getSnapshot: () => EMPTY_SNAPSHOT,
      subscribe: () => () => {}
    };

    class ModelTreeErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { error: null };
      }
      static getDerivedStateFromError(error) {
        return { error };
      }
      componentDidCatch(error) {
        try { console.error('[dsh-model-tree-menu] crashed', error); } catch (_e) {}
      }
      render() {
        if (this.state.error) {
          const msg = this.state.error && (this.state.error.stack || this.state.error.message || String(this.state.error));
          return h('div', {
            style: { fontSize: 11, color: 'var(--dsw-alias-state-error-primary)', maxWidth: 360, padding: '2px 6px', whiteSpace: 'pre-wrap', overflow: 'hidden', textOverflow: 'ellipsis' },
            title: String(msg)
          }, '模型选择器加载失败：' + String(msg).split('\n')[0]);
        }
        return this.props.children;
      }
    }
    function SafeModelTreeSelect(props) {
      return h(ModelTreeErrorBoundary, null, h(ModelTreeSelect, props));
    }

    function ModelTreeSelect(props) {
      const { locked, available, directory, load, select, t, renderSlot } = props;
      const state = React.useSyncExternalStore(
        (fn) => directory.subscribe(fn),
        () => directory.getSnapshot()
      );
      const [open, setOpen] = React.useState(false);
      // pane: "root" | "providers" | "models" | "effort"
      const [pane, setPane] = React.useState('root');
      const [providerId, setProviderId] = React.useState(null);
      const [query, setQuery] = React.useState('');
      const [highlighted, setHighlighted] = React.useState(0);
      const [menuPos, setMenuPos] = React.useState(null);
      const [toast, setToast] = React.useState(null);
      const toastSeq = React.useRef(0);

      const rootRef = React.useRef(null);
      const triggerRef = React.useRef(null);
      const menuRef = React.useRef(null);
      const searchRef = React.useRef(null);
      const itemRefs = React.useRef([]);
      const id = React.useId();

      const accountName = t('provider.account');

      // Providers in display order (account first, then official, then rest)
      const providers = React.useMemo(() => {
        const sorted = state.groups.slice().sort((l, r) => {
          const rank = (g) => (g.id === 'deepseek-account' ? 0 : g.id === 'deepseek-official' ? 1 : 2);
          return rank(l) - rank(r);
        });
        return sorted.map((g) => ({
          id: g.id,
          name: g.id === 'deepseek-account' ? accountName : (g.name || g.id),
          models: g.models
        }));
      }, [state.groups, accountName]);

      const activeProvider = providers.find((p) => p.id === providerId);
      const filteredModels = React.useMemo(() => {
        if (activeProvider === undefined) return [];
        return rankByName(activeProvider.models, query);
      }, [activeProvider, query]);

      const current = state.current; // { provider, model, reasoningEffort? }
      const currentProvider = current === null ? undefined : providers.find((p) => p.id === current.provider);
      const currentModel = current === null || currentProvider === undefined ? undefined : currentProvider.models.find((m) => m.id === current.model);
      const currentChoice = current === null || currentProvider === undefined || currentModel === undefined ? undefined : { group: currentProvider, model: currentModel };
      const reasoning = currentModel === undefined ? undefined : currentModel.reasoning;
      const effectiveEffort = current === null ? undefined : (current.reasoningEffort !== undefined ? current.reasoningEffort : reasoning === undefined ? undefined : reasoning.defaultEffort);
      const effortLabel = currentChoice === undefined ? undefined : reasoning === undefined ? state.retainedEffort : effectiveEffort === undefined ? t('effort.providerDefault') : (reasoning.efforts.find((lv) => lv.id === effectiveEffort) || {}).name || effectiveEffort;

      const effortChoices = React.useMemo(() => {
        if (reasoning === undefined) return [];
        const list = [];
        if (reasoning.defaultEffort === undefined) list.push({ key: 'provider-default', effort: undefined, label: t('effort.providerDefault') });
        for (const lv of reasoning.efforts) list.push({ key: 'effort:' + lv.id, effort: lv.id, label: lv.name });
        return list;
      }, [reasoning, t]);

      const busy = state.pending !== null;
      const reload = () => load();

      // Outside click
      React.useEffect(() => {
        if (!open) return;
        const onDown = (ev) => {
          if (rootRef.current && rootRef.current.contains(ev.target)) return;
          if (menuRef.current && menuRef.current.contains(ev.target)) return;
          setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
      }, [open]);

      // Position menu above trigger
      React.useLayoutEffect(() => {
        if (!available || !open) { setMenuPos(null); return; }
        const place = () => {
          const rect = triggerRef.current && triggerRef.current.getBoundingClientRect();
          if (!rect) return;
          const MARGIN = 12;
          const lw = menuRef.current ? menuRef.current.offsetWidth : 0;
          const lh = menuRef.current ? menuRef.current.offsetHeight : 0;
          let x = rect.right - lw;
          let y = rect.top - 8 - lh;
          if (lw > 0) x = Math.min(Math.max(x, MARGIN), window.innerWidth - lw - MARGIN);
          if (lh > 0) y = Math.min(Math.max(y, MARGIN), window.innerHeight - lh - MARGIN);
          setMenuPos({ left: x, top: y });
        };
        place();
        window.addEventListener('scroll', place, true);
        window.addEventListener('resize', place);
        let observer = null;
        if (typeof ResizeObserver !== 'undefined' && menuRef.current) {
          observer = new ResizeObserver(place);
          observer.observe(menuRef.current);
        }
        return () => {
          if (observer) observer.disconnect();
          window.removeEventListener('scroll', place, true);
          window.removeEventListener('resize', place);
        };
      }, [available, open, pane, state, query]);

      // Focus management when panes change
      React.useEffect(() => {
        if (!open) return;
        if (pane === 'models' && searchRef.current) { searchRef.current.focus(); return; }
        const first = itemRefs.current.find((n) => n && !n.disabled);
        if (first) first.focus();
      }, [open, pane]);

      if (!available) return null;

      const show = () => {
        triggerRef.current && triggerRef.current.focus();
        setQuery('');
        setHighlighted(0);
        setPane('root');
        setOpen(true);
        reload();
      };
      const close = (restore) => {
        setOpen(false);
        setPane('root');
        setProviderId(null);
        if (restore) queueMicrotask(() => triggerRef.current && triggerRef.current.focus());
      };
      const openProvider = (pid) => {
        setProviderId(pid);
        setQuery('');
        setHighlighted(0);
        setPane('models');
      };

      const submit = (selection) => {
        triggerRef.current && triggerRef.current.focus();
        select(selection).then((result) => {
          if (result === undefined) return;
          if (result.ok) { close(true); return; }
          const { error } = result;
          toastSeq.current += 1;
          setToast({
            seq: toastSeq.current,
            text: error.code === 'session/writer-held' ? t('error.sessionInUse') : t('error.action', { message: error.code + ': ' + error.message })
          });
        });
      };
      const chooseModel = (provider, model) => {
        if (current !== null && current.provider === provider.id && current.model === model.id) { close(true); return; }
        submit({ provider: provider.id, model: model.id });
      };
      const chooseEffort = (effort) => {
        if (current === null) return;
        if (effectiveEffort === effort) { close(true); return; }
        const sel = { provider: current.provider, model: current.model };
        if (effort !== undefined) sel.reasoningEffort = effort;
        submit(sel);
      };

      const waiting = currentChoice === undefined && state.status === 'loading';
      const modelLabel = waiting ? t('trigger.loading') : currentChoice ? currentChoice.model.name : t('trigger.fallback');
      const triggerLabel = effortLabel === undefined ? modelLabel : modelLabel + ' · ' + effortLabel;
      const triggerAria = waiting ? t('trigger.loading') : currentChoice === undefined ? t('trigger.fallback') : effortLabel === undefined ? t('trigger.aria', { model: modelLabel }) : t('trigger.ariaEffort', { model: modelLabel, effort: effortLabel });

      const renderModelLabel = (provider, model, placement, selected) => h('span', {
        'data-provider-id': provider.id,
        'data-model-id': model.id
      }, renderSlot ? renderSlot('conversation.input.model.label', { provider, model, placement, selected }, { fallback: model.name }) : model.name);

      let itemIndex = 0;
      const itemRef = () => {
        const at = itemIndex++;
        return (node) => { itemRefs.current[at] = node; };
      };

      const onKeyDown = (ev) => {
        if (ev.nativeEvent && ev.nativeEvent.isComposing) return;
        if (ev.key === 'Escape') {
          ev.preventDefault();
          if (pane === 'models') { setPane('providers'); setQuery(''); return; }
          if (pane === 'effort') { setPane('root'); return; }
          if (pane === 'providers') { setPane('root'); return; }
          close(true);
          return;
        }
        if (!open) return;
        if (pane === 'models') {
          const n = filteredModels.length;
          if ((ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && n > 0) {
            ev.preventDefault();
            const next = (highlighted + (ev.key === 'ArrowDown' ? 1 : -1) + n) % n;
            setHighlighted(next);
            return;
          }
          if ((ev.key === 'Enter' || (ev.key === 'Tab' && !ev.shiftKey)) && ev.target instanceof HTMLInputElement) {
            const m = filteredModels[highlighted];
            if (!busy && m && activeProvider) { ev.preventDefault(); chooseModel(activeProvider, m); }
            return;
          }
          if (ev.key === 'Tab' && ev.shiftKey) { ev.preventDefault(); setPane('providers'); setQuery(''); return; }
        }
        if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
          const items = itemRefs.current.filter((n) => n);
          if (items.length === 0) return;
          ev.preventDefault();
          const active = items.indexOf(document.activeElement);
          const delta = ev.key === 'ArrowDown' ? 1 : -1;
          const idx = active === -1 ? (delta > 0 ? 0 : items.length - 1) : (active + delta + items.length) % items.length;
          items[idx] && items[idx].focus();
        }
      };

      const onBlur = (ev) => {
        if (ev.relatedTarget instanceof Node && ((rootRef.current && rootRef.current.contains(ev.relatedTarget)) || (menuRef.current && menuRef.current.contains(ev.relatedTarget)))) return;
        close(false);
      };

      const cell = (label, value, onClick, key) => h('button', {
        key,
        ref: itemRef(),
        type: 'button',
        role: 'menuitem',
        className: 'mtm_cell',
        onClick
      }, h('span', { className: 'mtm_cellLabel' }, label), h('span', { className: 'mtm_cellValue' }, value), h(IconChevronRight, { className: 'mtm_cellChevron' }));

      const header = (title, onBack) => h('div', { className: 'mtm_header' },
        onBack && h('button', { type: 'button', className: 'mtm_back', 'aria-label': t('menu.back'), onClick: onBack }, h(IconChevronRight, { style: { transform: 'rotate(180deg)' } })),
        h('span', { className: 'mtm_headerTitle' }, title)
      );

      const renderMenuBody = () => {
        if (pane === 'root') {
          return [
            cell(t('menu.model'), currentChoice ? renderModelLabel(currentChoice.group, currentChoice.model, 'menu', true) : modelLabel, () => { setPane('providers'); setQuery(''); setHighlighted(0); }, 'cell-model'),
            reasoning !== undefined && cell(t('menu.effort'), effortLabel, () => setPane('effort'), 'cell-effort')
          ];
        }
        if (pane === 'providers') {
          if (state.status === 'loading' && providers.length === 0) return h('div', { className: 'mtm_status' }, t('status.loading'));
          if (providers.length === 0) return h('div', { className: 'mtm_empty' }, t('empty.models'));
          const nodes = [header(t('menu.providers'), () => setPane('root'))];
          nodes.push(h('div', { className: 'mtm_scroll', role: 'menu', 'aria-label': t('menu.providers') },
            providers.map((p) => h('button', {
              key: p.id,
              ref: itemRef(),
              type: 'button',
              role: 'menuitem',
              className: 'mtm_option' + (current && current.provider === p.id ? ' selected' : ''),
              onClick: () => openProvider(p.id)
            },
              h('span', { className: 'mtm_providerName' }, p.name),
              h('span', { className: 'mtm_providerMeta' }, t('menu.providerCount', { count: p.models.length })),
              current && current.provider === p.id ? h('span', { className: 'mtm_check' }, h(IconCheck)) : null,
              h(IconChevronRight, { className: 'mtm_cellChevron' })
            ))
          ));
          return nodes;
        }
        if (pane === 'models') {
          if (!activeProvider) return null;
          const nodes = [];
          nodes.push(header(t('menu.modelsOf', { name: activeProvider.name }), () => { setPane('providers'); setQuery(''); }));
          // search
          nodes.push(h('div', { className: 'mtm_searchRow' },
            h('input', {
              ref: searchRef,
              className: 'mtm_search',
              type: 'text',
              role: 'searchbox',
              'aria-label': t('search.placeholder'),
              placeholder: t('search.placeholder'),
              value: query,
              readOnly: busy,
              onChange: (e) => { setQuery(e.target.value); setHighlighted(0); }
            }),
            query !== '' && h('button', { type: 'button', className: 'mtm_searchClear', 'aria-label': t('search.clear'), onClick: () => { setQuery(''); searchRef.current && searchRef.current.focus(); } }, h(IconClose))
          ));
          if (filteredModels.length === 0) {
            nodes.push(h('div', { className: 'mtm_empty' }, t(activeProvider.models.length === 0 ? 'empty.models' : 'search.empty')));
            return nodes;
          }
          nodes.push(h('div', { className: 'mtm_scroll', role: 'menu', 'aria-label': t('menu.modelsOf', { name: activeProvider.name }) },
            filteredModels.map((m, idx) => {
              const selected = current !== null && current.provider === activeProvider.id && current.model === m.id;
              return h('button', {
                key: m.id,
                ref: itemRef(),
                type: 'button',
                role: 'menuitemradio',
                'aria-checked': selected ? 'true' : 'false',
                tabIndex: -1,
                className: 'mtm_option' + (selected ? ' selected' : '') + (idx === highlighted ? ' mtm_optionActive' : ''),
                title: m.name,
                disabled: busy,
                onMouseMove: () => setHighlighted(idx),
                onClick: () => chooseModel(activeProvider, m)
              },
                h('span', { className: 'mtm_optionCopy' }, renderModelLabel(activeProvider, m, 'option', selected)),
                h('span', { className: 'mtm_check' }, state.pending && state.pending.provider === activeProvider.id && state.pending.model === m.id ? h(Spinner) : selected ? h(IconCheck) : null)
              );
            })
          ));
          return nodes;
        }
        if (pane === 'effort') {
          const nodes = [header(t('menu.effort'), () => setPane('root'))];
          if (effortChoices.length === 0) { nodes.push(h('div', { className: 'mtm_empty' }, t('empty.efforts'))); return nodes; }
          nodes.push(h('div', { className: 'mtm_scroll', role: 'menu', 'aria-label': t('menu.effort') },
            effortChoices.map((lv) => {
              const selected = effectiveEffort === lv.effort;
              return h('button', {
                key: lv.key,
                ref: itemRef(),
                type: 'button',
                role: 'menuitemradio',
                'aria-checked': selected ? 'true' : 'false',
                className: 'mtm_option' + (selected ? ' selected' : ''),
                disabled: busy,
                onClick: () => chooseEffort(lv.effort)
              },
                h('span', { className: 'mtm_optionCopy' }, lv.label),
                h('span', { className: 'mtm_check' }, selected ? h(IconCheck) : null)
              );
            })
          ));
          return nodes;
        }
        return null;
      };

      const menuEl = open && h('div', {
          ref: menuRef,
          id: id + '-menu',
          className: 'mtm_menu',
          role: pane === 'root' || pane === 'providers' || pane === 'effort' ? 'menu' : 'dialog',
          'aria-label': t('menu.aria'),
          'aria-busy': state.status === 'loading' || busy ? 'true' : undefined,
          style: menuPos || { visibility: 'hidden', left: 0, top: 0 }
        },
          // errors / warnings shown at top for load actions
          state.error != null && state.status !== 'ready' ? h('div', { className: 'mtm_error' }, h('span', null, t('error.action', { message: state.error })), h('button', { type: 'button', className: 'mtm_retry', onClick: reload }, t('action.reload'))) : null,
          (state.failures || []).map((f) => h('div', { key: 'f-' + f.id, className: 'mtm_warning' }, h('span', null, t('warning.groupLoad', { name: f.id === 'deepseek-account' ? accountName : (f.name || f.id), message: f.message })), h('button', { type: 'button', className: 'mtm_retry', onClick: reload }, t('action.reload')))),
          renderMenuBody()
      );
      // Portalling to document.body escapes the composer card so the frosted
      // panel samples the whole page (and the conversation) behind it.
      const menu = menuEl && createPortal ? createPortal(menuEl, document.body) : menuEl;

      return h('div', { ref: rootRef, className: 'mtm_root', onKeyDown, onBlur },
        h('button', {
          ref: triggerRef,
          type: 'button',
          className: 'mtm_trigger',
          'aria-label': triggerAria,
          'aria-haspopup': 'menu',
          'aria-expanded': open ? 'true' : 'false',
          title: triggerLabel,
          disabled: locked,
          onClick: () => { if (open) close(true); else show(); }
        },
          h(IconModel, null),
          h('span', { className: 'mtm_triggerLabel' }, currentChoice ? renderModelLabel(currentChoice.group, currentChoice.model, 'trigger', true) : modelLabel),
          effortLabel !== undefined ? h('span', { className: 'mtm_triggerEffort' }, effortLabel) : null,
          busy ? h(Spinner) : h(IconChevronDown, { className: 'mtm_chevron' + (open ? ' mtm_chevronOpen' : '') })
        ),
        menu,
        toast !== null && h('div', {
          key: toast.seq,
          role: 'status',
          style: { position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 1200, maxWidth: 420, padding: '8px 12px', borderRadius: 10, background: 'var(--dsw-alias-bg-overlay)', color: 'var(--dsw-alias-state-error-primary)', boxShadow: '0 8px 24px rgba(0,0,0,.2)', fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }
        }, h(IconWarning, null), h('span', null, toast.text))
      );
    }

    // ---------------------------------------------------------------------
    // Plugin body
    // ---------------------------------------------------------------------
    return {
      // The modelDirectory service proxy binds `this.ctx` to the CALLER's
      // context, so our own context must also carry remote/remote.session (the
      // service's own inject list) or calling directoryFor() throws.
      inject: ['locale', 'sessions', 'slots', 'modelDirectories', 'remote', 'remote.session'],
      apply(ctx) {
        // Inject styles once per page
        ctx.effect(() => {
          const tagId = '@local/dsh-model-tree-menu/mtm.css';
          let tag = document.querySelector('style[data-plugin-css="' + tagId + '"]');
          if (!tag) {
            tag = document.createElement('style');
            tag.dataset.plugin = '@local/dsh-model-tree-menu';
            tag.dataset.pluginCss = tagId;
            tag.textContent = css;
            document.head.appendChild(tag);
          }
          return () => {
            if (tag && tag.parentNode) tag.parentNode.removeChild(tag);
          };
        }, 'dsh-model-tree-menu: styles');

        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-model-tree-menu: dictionaries');

        // Register straight onto the slot (proven load path). The model-directory
        // face is resolved lazily per session via ctx.get so a late provider
        // never blocks registration.
        ctx.slots.inject('conversation.input.model', () => ctx.slots.register({
          name: 'conversation.input.model',
          locale: NS,
          // Higher priority than the shipped occupant (0) so this replaces it.
          priority: 100,
          // Keep the child label slot alive so label-provider plugins still apply.
          children: {
            'conversation.input.model.label': { kind: 'single', scope: 'session', inline: true }
          },
          inject: (sessionId) => {
            const models = ctx.modelDirectories || ctx.get('modelDirectories');
            const sessions = ctx.sessions || ctx.get('sessions');
            let directory;
            try { directory = models ? models.directoryFor(sessionId) : undefined; } catch (_e) { directory = undefined; }
            const isSubagent = sessions !== undefined && sessions.subagentAddress(sessionId) !== undefined;
            const available = directory !== undefined && !isSubagent;
            return {
              available,
              directory: directory ? directory.store : EMPTY_DIRECTORY_STORE,
              load: () => { if (available) directory.load().catch(() => {}); },
              select: (selection) => available ? directory.select(selection) : Promise.resolve(undefined)
            };
          }
        }, SafeModelTreeSelect));
      }
    };
  }
});
