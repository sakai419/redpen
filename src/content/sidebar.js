/* redpen — レビューパネル UI（Shadow DOM に閉じ込めて閲覧中の文書に干渉させない） */
(function () {
  'use strict';
  const RP = (globalThis.RedPen = globalThis.RedPen || {});
  const util = RP.util;

  const PANEL_WIDTH = 380;

  const CSS = `
:host {
  all: initial;
  /* 閲覧中の文書のレイアウトに一切影響させない */
  position: fixed;
  top: 0; left: 0; width: 0; height: 0;
  z-index: 2147483600;
}
*, *::before, *::after { box-sizing: border-box; }

:host {
  --rp-bg: #ffffff;
  --rp-bg-sub: #f6f8fa;
  --rp-border: #e6e8eb;
  --rp-text: #1f2328;
  --rp-text-sub: #59636e;
  --rp-text-mute: #868f99;
  --rp-accent: #2563eb;
  --rp-accent-soft: rgba(37, 99, 235, 0.09);
  --rp-quote-line: #eab308;
  --rp-warn: #b45309;
  --rp-warn-soft: rgba(234, 179, 8, 0.14);
  --rp-shadow: 0 1px 2px rgba(16, 24, 40, .06), 0 12px 32px rgba(16, 24, 40, .12);
  --rp-radius: 10px;
  font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN",
    "Noto Sans JP", "Segoe UI", Roboto, sans-serif;
  font-size: 13.5px;
  line-height: 1.68;
  color: var(--rp-text);
  -webkit-font-smoothing: antialiased;
}
@media (prefers-color-scheme: dark) {
  :host {
    --rp-bg: #0f1216;
    --rp-bg-sub: #171b21;
    --rp-border: #262c34;
    --rp-text: #e3e8ee;
    --rp-text-sub: #9aa5b1;
    --rp-text-mute: #6e7a87;
    --rp-accent: #6c9dff;
    --rp-accent-soft: rgba(108, 157, 255, 0.13);
    --rp-quote-line: #facc15;
    --rp-warn: #f0b429;
    --rp-warn-soft: rgba(250, 204, 21, 0.12);
    --rp-shadow: 0 1px 2px rgba(0,0,0,.5), 0 12px 32px rgba(0,0,0,.55);
  }
}

.panel {
  position: fixed;
  top: 0; right: 0; bottom: 0;
  width: ${PANEL_WIDTH}px;
  background: var(--rp-bg);
  border-left: 1px solid var(--rp-border);
  display: flex;
  flex-direction: column;
  z-index: 2147483600;
  transform: translateX(100%);
  transition: transform .18s cubic-bezier(.2,.8,.3,1);
}
.panel.open { transform: translateX(0); }

.head {
  padding: 12px 14px 10px;
  border-bottom: 1px solid var(--rp-border);
  display: flex; align-items: flex-start; gap: 8px;
}
.head-main { flex: 1; min-width: 0; }
.brand {
  display: flex; align-items: center; gap: 6px;
  font-weight: 650; font-size: 12px; letter-spacing: .02em;
  color: var(--rp-accent);
}
.brand .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--rp-accent); }
.doc-title {
  margin-top: 3px;
  font-size: 13px; font-weight: 600;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.doc-path {
  font-size: 11px; color: var(--rp-text-sub);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.icon-btn {
  border: 1px solid transparent; background: transparent; cursor: pointer;
  width: 26px; height: 26px; border-radius: 6px; color: var(--rp-text-sub);
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; line-height: 1; padding: 0; flex: none;
}
.icon-btn:hover { background: var(--rp-bg-sub); color: var(--rp-text); }
.icon-btn[hidden] { display: none; }
#offBtn:hover { background: rgba(209, 36, 47, .1); color: #d1242f; }

.tabs {
  display: flex; align-items: center; gap: 2px;
  padding: 8px 10px; border-bottom: 1px solid var(--rp-border);
}
.tabs .clear { margin-left: auto; flex: none; }
.tabs .clear[data-confirm="1"] { color: #d1242f; border-color: #d1242f; }
.tab {
  border: none; background: transparent; cursor: pointer; padding: 5px 10px;
  border-radius: 6px; font-size: 12.5px; color: var(--rp-text-sub); font-family: inherit;
}
.tab:hover { background: var(--rp-bg-sub); }
.tab.active { background: var(--rp-accent-soft); color: var(--rp-accent); font-weight: 600; }
.tab .n { opacity: .65; margin-left: 3px; font-variant-numeric: tabular-nums; }

.list { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.empty { padding: 28px 18px; text-align: center; color: var(--rp-text-sub); font-size: 12px; }
.empty strong { display: block; color: var(--rp-text); font-size: 13px; margin-bottom: 6px; }
.empty kbd {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px;
  background: var(--rp-bg-sub); border: 1px solid var(--rp-border);
  border-radius: 4px; padding: 1px 5px;
}

.card {
  border: 1px solid var(--rp-border); border-radius: var(--rp-radius);
  background: var(--rp-bg); padding: 10px 12px; cursor: pointer;
  transition: border-color .12s, background .12s, box-shadow .12s;
}
.card:hover { box-shadow: 0 1px 2px rgba(16,24,40,.05); }
.card:hover { border-color: color-mix(in srgb, var(--rp-accent) 40%, var(--rp-border)); }
.card.active { border-color: var(--rp-accent); background: var(--rp-accent-soft); }
.card.resolved { opacity: .58; }
.card.missing { border-left: 3px solid var(--rp-warn); }

.card-loc {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  font-size: 11.5px; color: var(--rp-text-sub); margin-bottom: 5px;
}
.chip {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  background: var(--rp-bg-sub); border: 1px solid var(--rp-border);
  border-radius: 4px; padding: 0 5px; font-size: 10px; color: var(--rp-text-sub);
}
.chip.warn { color: var(--rp-warn); border-color: var(--rp-warn); background: var(--rp-warn-soft); }
.card-heading { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.card-quote {
  border-left: 2px solid var(--rp-quote-line);
  padding: 1px 0 1px 8px; margin: 0 0 6px;
  color: var(--rp-text-sub); font-size: 13px;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}
.card-body { font-size: 13.5px; white-space: pre-wrap; word-break: break-word; }
.card.resolved .card-body { text-decoration: line-through; text-decoration-color: var(--rp-text-sub); }

.card-actions { display: flex; gap: 4px; margin-top: 7px; opacity: 0; transition: opacity .12s; }
.card:hover .card-actions, .card.active .card-actions { opacity: 1; }
.mini {
  border: 1px solid var(--rp-border); background: var(--rp-bg); color: var(--rp-text-sub);
  border-radius: 5px; font-size: 11px; padding: 2px 7px; cursor: pointer; font-family: inherit;
}
.mini:hover { background: var(--rp-bg-sub); color: var(--rp-text); }
.mini.danger:hover { color: #d1242f; border-color: #d1242f; }

.foot { border-top: 1px solid var(--rp-border); padding: 9px 10px; background: var(--rp-bg-sub); }
.foot-row { display: flex; gap: 6px; align-items: center; }
.btn {
  flex: 1; border: 1px solid var(--rp-border); background: var(--rp-bg); color: var(--rp-text);
  border-radius: 7px; padding: 7px 9px; font-size: 12.5px; cursor: pointer;
  font-family: inherit; font-weight: 550;
  display: flex; align-items: center; justify-content: center; gap: 5px;
}
.btn:hover { background: var(--rp-bg-sub); }
.btn.primary { background: var(--rp-accent); border-color: var(--rp-accent); color: #fff; }
.btn.primary:hover { filter: brightness(1.07); }
.opts { display: flex; gap: 10px; margin-top: 7px; font-size: 11px; color: var(--rp-text-sub); flex-wrap: wrap; }
.opts label { display: flex; align-items: center; gap: 4px; cursor: pointer; }
.opts select {
  font-family: inherit; font-size: 11px; border: 1px solid var(--rp-border);
  border-radius: 4px; background: var(--rp-bg); color: var(--rp-text); padding: 1px 3px;
}

.toast {
  position: fixed; bottom: 16px; right: ${PANEL_WIDTH + 16}px;
  background: var(--rp-text); color: var(--rp-bg);
  padding: 7px 12px; border-radius: 6px; font-size: 12px;
  box-shadow: var(--rp-shadow); opacity: 0; transform: translateY(6px);
  transition: opacity .15s, transform .15s; pointer-events: none; z-index: 2147483640;
}
.toast.show { opacity: 1; transform: translateY(0); }

/* 選択直後に出る小さな起動ボタン */
.launcher {
  position: fixed; z-index: 2147483630;
  background: var(--rp-text); color: var(--rp-bg);
  border: none; border-radius: 6px; padding: 5px 10px;
  font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
  box-shadow: var(--rp-shadow); display: none; align-items: center; gap: 5px;
}
.launcher.show { display: flex; }

/* コメント入力 */
.composer {
  position: fixed; z-index: 2147483635; width: 320px;
  background: var(--rp-bg); border: 1px solid var(--rp-border);
  border-radius: var(--rp-radius); box-shadow: var(--rp-shadow);
  padding: 10px; display: none;
}
.composer.show { display: block; }
.composer-quote {
  border-left: 2px solid var(--rp-quote-line); padding-left: 7px; margin-bottom: 8px;
  font-size: 12.5px; color: var(--rp-text-sub);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.composer textarea {
  width: 100%; min-height: 74px; resize: vertical;
  border: 1px solid var(--rp-border); border-radius: 6px; padding: 7px 8px;
  font-family: inherit; font-size: 13.5px; line-height: 1.55;
  background: var(--rp-bg); color: var(--rp-text);
}
.composer textarea:focus { outline: 2px solid var(--rp-accent-soft); border-color: var(--rp-accent); }
.composer-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 7px; gap: 6px; }
.composer-hint { font-size: 10.5px; color: var(--rp-text-sub); }
.composer-btns { display: flex; gap: 5px; }
.composer-btns .btn { flex: none; padding: 4px 11px; }
`;

  const TEMPLATE = `
<div class="panel" part="panel">
  <div class="head">
    <div class="head-main">
      <div class="brand"><span class="dot"></span>redpen</div>
      <div class="doc-title" id="docTitle"></div>
      <div class="doc-path" id="docPath"></div>
    </div>
    <button class="icon-btn" id="offBtn" title="このタブで redpen を止める">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor"
           stroke-width="1.7" stroke-linecap="round" aria-hidden="true">
        <path d="M8 2.4v5.2"/>
        <path d="M4.7 4.7a4.6 4.6 0 1 0 6.6 0"/>
      </svg>
    </button>
    <button class="icon-btn" id="closeBtn" title="パネルを閉じる (Alt+R)">✕</button>
  </div>
  <div class="tabs">
    <button class="tab active" data-filter="open">未対応<span class="n" id="nOpen">0</span></button>
    <button class="tab" data-filter="resolved">対応済み<span class="n" id="nResolved">0</span></button>
    <button class="tab" data-filter="all">すべて<span class="n" id="nAll">0</span></button>
    <button class="mini danger clear" id="clearBtn"
            title="この文書のコメントをすべて削除" hidden>全件削除</button>
  </div>
  <div class="list" id="list"></div>
  <div class="foot">
    <div class="foot-row">
      <button class="btn primary" id="copyBtn">コピー</button>
      <button class="btn" id="saveBtn">.md 保存</button>
    </div>
    <div class="opts">
      <label><input type="checkbox" id="optResolved"> 対応済みも含める</label>
      <label>形式
        <select id="optStyle">
          <option value="quote">引用 + コメント</option>
          <option value="compact">1 行ずつ</option>
          <option value="json">JSON</option>
        </select>
      </label>
    </div>
  </div>
</div>
<button class="launcher" id="launcher">✎ コメント</button>
<div class="composer" id="composer">
  <div class="composer-quote" id="composerQuote"></div>
  <textarea id="composerInput" placeholder="修正してほしい内容を書く…"></textarea>
  <div class="composer-foot">
    <span class="composer-hint">⌘/Ctrl+Enter で保存</span>
    <div class="composer-btns">
      <button class="btn" id="composerCancel">取消</button>
      <button class="btn primary" id="composerSave">保存</button>
    </div>
  </div>
</div>
<div class="toast" id="toast"></div>
`;

  function create(handlers) {
    const host = document.createElement('div');
    host.id = 'redpen-root';
    host.className = 'rp-ui';
    host.setAttribute('data-rp-ignore', '');
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = CSS;
    shadow.appendChild(style);
    const wrap = document.createElement('div');
    wrap.innerHTML = TEMPLATE;
    while (wrap.firstChild) shadow.appendChild(wrap.firstChild);
    (document.body || document.documentElement).appendChild(host);

    const $ = (id) => shadow.getElementById(id);
    const el = {
      host, shadow,
      panel: shadow.querySelector('.panel'),
      list: $('list'),
      docTitle: $('docTitle'),
      docPath: $('docPath'),
      nOpen: $('nOpen'), nResolved: $('nResolved'), nAll: $('nAll'),
      launcher: $('launcher'),
      composer: $('composer'),
      composerQuote: $('composerQuote'),
      composerInput: $('composerInput'),
      toast: $('toast'),
      optResolved: $('optResolved'),
      optStyle: $('optStyle'),
      clearBtn: $('clearBtn')
    };

    let filter = 'open';
    let isOpen = false;
    let composerCtx = null;

    /* ---- パネル開閉 ---- */
    function setOpen(next) {
      isOpen = next;
      el.panel.classList.toggle('open', isOpen);
      document.documentElement.style.transition = 'padding-right .18s cubic-bezier(.2,.8,.3,1)';
      document.documentElement.style.paddingRight = isOpen ? PANEL_WIDTH + 'px' : '';
      handlers.onToggle?.(isOpen);
    }

    /* ---- トースト ---- */
    let toastTimer = null;
    function toast(message) {
      el.toast.textContent = message;
      el.toast.classList.add('show');
      el.toast.style.right = (isOpen ? PANEL_WIDTH + 16 : 16) + 'px';
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2000);
    }

    /* ---- 起動ボタン ---- */
    function showLauncher(rect) {
      // 先に出してから測る（display:none のままだと寸法が取れない）
      el.launcher.classList.add('show');
      const w = el.launcher.offsetWidth || 96;
      const h = el.launcher.offsetHeight || 28;

      // 選択範囲の上に出す。続きの本文に被らせないため。
      let top = rect.top - h - 8;
      if (top < 8) top = Math.min(rect.bottom + 8, window.innerHeight - h - 8);

      const maxLeft = window.innerWidth - w - 12 - (isOpen ? PANEL_WIDTH : 0);
      el.launcher.style.top = Math.max(8, top) + 'px';
      el.launcher.style.left = Math.max(8, Math.min(rect.left, maxLeft)) + 'px';
    }
    function hideLauncher() {
      el.launcher.classList.remove('show');
    }

    /* ---- 入力ポップオーバー ---- */
    function showComposer(rect, ctx) {
      composerCtx = ctx;
      hideLauncher();
      el.composerQuote.textContent = util.truncate(ctx.quote, 160);
      el.composerInput.value = ctx.body || '';
      el.composer.classList.add('show');

      const width = 320;
      const maxLeft = window.innerWidth - width - 16 - (isOpen ? PANEL_WIDTH : 0);
      const left = Math.max(8, Math.min(rect.left, maxLeft));
      let top = rect.bottom + 8;
      // 下にはみ出すなら選択範囲の上に出す
      if (top + el.composer.offsetHeight > window.innerHeight - 8) {
        top = Math.max(8, rect.top - el.composer.offsetHeight - 8);
      }
      el.composer.style.left = left + 'px';
      el.composer.style.top = top + 'px';
      el.composerInput.focus();
    }
    function hideComposer() {
      el.composer.classList.remove('show');
      composerCtx = null;
    }
    function submitComposer() {
      const body = el.composerInput.value.trim();
      if (!body) {
        el.composerInput.focus();
        return;
      }
      const ctx = composerCtx;
      hideComposer();
      handlers.onSubmitComment?.(ctx, body);
    }

    /* ---- 全件削除（押し間違いを防ぐため 2 段） ---- */
    let clearTimer = null;
    function resetClear() {
      clearTimeout(clearTimer);
      clearTimer = null;
      el.clearBtn.dataset.confirm = '';
      el.clearBtn.textContent = '全件削除';
    }
    function armClear() {
      el.clearBtn.dataset.confirm = '1';
      el.clearBtn.textContent = '本当に全件削除？';
      clearTimeout(clearTimer);
      clearTimer = setTimeout(resetClear, 3000);
    }

    /* ---- 一覧描画 ---- */
    function render(state) {
      el.docTitle.textContent = state.title;
      el.docTitle.title = state.path;
      el.docPath.textContent = state.path;

      const all = RP.exporter.sortComments(state.comments);
      const open = all.filter((c) => c.status !== 'resolved');
      const resolved = all.filter((c) => c.status === 'resolved');
      el.nOpen.textContent = open.length;
      el.nResolved.textContent = resolved.length;
      el.nAll.textContent = all.length;

      el.clearBtn.hidden = all.length === 0;
      if (el.clearBtn.hidden && clearTimer) resetClear();

      const shown = filter === 'open' ? open : filter === 'resolved' ? resolved : all;
      el.list.textContent = '';

      if (shown.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.innerHTML =
          filter === 'open' && all.length > 0
            ? '<strong>未対応の指摘はありません</strong>「すべて」タブで全件を確認できます。'
            : '<strong>まだコメントがありません</strong>本文のテキストを選択して <kbd>✎ コメント</kbd> を押すか、<kbd>Alt</kbd>+<kbd>C</kbd> を押してください。';
        el.list.appendChild(empty);
        return;
      }

      for (const c of shown) el.list.appendChild(renderCard(c, state.activeId));
    }

    function renderCard(c, activeId) {
      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.id = c.id;
      if (c.id === activeId) card.classList.add('active');
      if (c.status === 'resolved') card.classList.add('resolved');
      if (c.anchor?.missing) card.classList.add('missing');

      const loc = document.createElement('div');
      loc.className = 'card-loc';
      const line = RP.exporter.lineLabel(c.anchor);
      if (line) {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = line;
        loc.appendChild(chip);
      }
      if (c.anchor?.missing) {
        const chip = document.createElement('span');
        chip.className = 'chip warn';
        chip.textContent = '本文で未検出';
        chip.title = '原文からこの引用箇所が見つかりません。既に修正された可能性があります。';
        loc.appendChild(chip);
      }
      const heading = RP.exporter.headingLabel(c.anchor);
      if (heading) {
        const h = document.createElement('span');
        h.className = 'card-heading';
        h.textContent = heading;
        h.title = heading;
        loc.appendChild(h);
      }
      card.appendChild(loc);

      if (c.anchor?.quote) {
        const q = document.createElement('div');
        q.className = 'card-quote';
        q.textContent = c.anchor.quote;
        card.appendChild(q);
      }

      const body = document.createElement('div');
      body.className = 'card-body';
      body.textContent = c.body;
      card.appendChild(body);

      const actions = document.createElement('div');
      actions.className = 'card-actions';
      actions.appendChild(miniBtn(c.status === 'resolved' ? '未対応に戻す' : '対応済み', 'resolve'));
      actions.appendChild(miniBtn('編集', 'edit'));
      const del = miniBtn('削除', 'delete');
      del.classList.add('danger');
      actions.appendChild(del);
      card.appendChild(actions);

      return card;
    }

    function miniBtn(label, action) {
      const b = document.createElement('button');
      b.className = 'mini';
      b.dataset.action = action;
      b.textContent = label;
      return b;
    }

    /* ---- イベント ---- */
    shadow.getElementById('closeBtn').addEventListener('click', () => setOpen(false));

    const offBtn = shadow.getElementById('offBtn');
    offBtn.hidden = handlers.canDisable === false;
    offBtn.addEventListener('click', () => handlers.onDisable?.());

    el.clearBtn.addEventListener('click', () => {
      if (el.clearBtn.dataset.confirm !== '1') {
        armClear();
        return;
      }
      resetClear();
      handlers.onDeleteAll?.();
    });

    for (const tab of shadow.querySelectorAll('.tab')) {
      tab.addEventListener('click', () => {
        filter = tab.dataset.filter;
        for (const t of shadow.querySelectorAll('.tab')) t.classList.toggle('active', t === tab);
        handlers.onRefresh?.();
      });
    }

    el.list.addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      if (!card) return;
      const action = e.target.dataset?.action;
      if (action === 'resolve') return handlers.onToggleResolved?.(card.dataset.id);
      if (action === 'delete') return handlers.onDelete?.(card.dataset.id);
      if (action === 'edit') {
        const rect = card.getBoundingClientRect();
        return handlers.onEdit?.(card.dataset.id, rect);
      }
      handlers.onSelectComment?.(card.dataset.id);
    });

    el.launcher.addEventListener('mousedown', (e) => e.preventDefault());
    el.launcher.addEventListener('click', () => handlers.onLauncherClick?.());

    shadow.getElementById('composerSave').addEventListener('click', submitComposer);
    shadow.getElementById('composerCancel').addEventListener('click', () => {
      hideComposer();
      handlers.onCancelComment?.();
    });
    el.composerInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        submitComposer();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hideComposer();
        handlers.onCancelComment?.();
      }
      e.stopPropagation();
    });

    const exportOpts = () => ({
      style: el.optStyle.value,
      includeResolved: el.optResolved.checked
    });
    shadow.getElementById('copyBtn').addEventListener('click', () => handlers.onCopy?.(exportOpts()));
    shadow.getElementById('saveBtn').addEventListener('click', () => handlers.onSave?.(exportOpts()));

    return {
      el,
      render,
      toast,
      showLauncher,
      hideLauncher,
      showComposer,
      hideComposer,
      setOpen,
      isOpen: () => isOpen,
      isComposerOpen: () => el.composer.classList.contains('show'),
      getFilter: () => filter,
      setFilter(next) {
        filter = next;
        for (const t of shadow.querySelectorAll('.tab')) t.classList.toggle('active', t.dataset.filter === next);
      },
      destroy() {
        document.documentElement.style.paddingRight = '';
        host.remove();
      }
    };
  }

  RP.sidebar = { create, PANEL_WIDTH };
})();
