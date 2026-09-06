/* redpen — ドキュメント 1 件分のレビューセッション
 * content script（file:// の HTML / プレーンテキスト表示された Markdown）と
 * 拡張内ビューアの両方から、同じ実装で起動する。
 */
(function () {
  'use strict';
  const RP = (globalThis.RedPen = globalThis.RedPen || {});
  const util = RP.util;

  /**
   * @param {object} cfg
   *  root        アノテーション対象のコンテナ要素
   *  mode        'markdown' | 'html'
   *  sourceLines Markdown 原文の行配列（html のときは null）
   *  key/title/path  ドキュメント識別情報
   *  outline     目次インスタンス（あれば畳むときに一緒に片づける）
   *  canDisable  レビューパネルに「このタブで無効にする」を出すか
   *  onDisable   無効にする直前に呼ぶ（ページの見た目を元に戻す用）
   */
  async function start(cfg) {
    // 無効化のときにイベントをまとめて外せるようにしておく
    const abort = new AbortController();
    const { signal } = abort;
    const state = {
      root: cfg.root,
      mode: cfg.mode,
      sourceLines: cfg.sourceLines || null,
      doc: null,
      activeId: null,
      pendingRange: null,
      editingId: null
    };

    const ui = RP.sidebar.create({
      canDisable: cfg.canDisable !== false,
      onDisable: disable,
      onRefresh: refresh,
      onToggle: () => {},
      onSelectComment: focusComment,
      onToggleResolved: toggleResolved,
      onDelete: deleteComment,
      onEdit: editComment,
      onLauncherClick: openComposerForSelection,
      onCancelComment: () => {
        state.pendingRange = null;
        state.editingId = null;
      },
      onSubmitComment: submitComment,
      onCopy: copyExport,
      onSave: saveExport
    });

    state.doc =
      (await RP.store.loadDoc(cfg.key)) ||
      RP.store.emptyDoc(cfg.key, { title: cfg.title, path: cfg.path, mode: cfg.mode });
    // 開き直しでタイトル等が変わることがあるので毎回上書きする
    state.doc.title = cfg.title;
    state.doc.path = cfg.path;
    state.doc.mode = cfg.mode;

    paintAll();
    refresh();
    if (state.doc.comments.length > 0) ui.setOpen(true);

    /* ---------- 描画 ---------- */

    function paintAll() {
      RP.marks.removeAll(state.root);
      let changed = false;
      for (const c of state.doc.comments) {
        const range = RP.anchor.resolve(c.anchor, state);
        const missing = !range;
        if (Boolean(c.anchor.missing) !== missing) {
          c.anchor.missing = missing;
          changed = true;
        }
        if (range) {
          RP.marks.apply(state.root, range, c.id, { resolved: c.status === 'resolved' });
        }
      }
      if (changed) RP.store.saveDoc(state.doc);
    }

    function refresh() {
      ui.render({
        title: state.doc.title,
        path: state.doc.path,
        comments: state.doc.comments,
        activeId: state.activeId
      });
    }

    async function persist() {
      await RP.store.saveDoc(state.doc);
      refresh();
    }

    /* ---------- コメント操作 ---------- */

    const EMPTY_RECT = { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 };

    /** Range の矩形。取得できない環境では画面左上に寄せる */
    function rectOf(target) {
      if (!target || typeof target.getBoundingClientRect !== 'function') return EMPTY_RECT;
      const rect = target.getBoundingClientRect();
      if (!rect || (!rect.width && !rect.height && !rect.top && !rect.left)) return EMPTY_RECT;
      return rect;
    }

    function currentSelectionRange() {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
      const range = sel.getRangeAt(0);
      if (!state.root.contains(range.commonAncestorContainer)) return null;
      if (!range.toString().trim()) return null;
      return range;
    }

    function openComposerForSelection() {
      const range = state.pendingRange || currentSelectionRange();
      if (!range) {
        ui.toast('コメントを付けたい範囲を選択してください');
        return;
      }
      state.pendingRange = range;
      state.editingId = null;
      ui.showComposer(rectOf(range), { quote: range.toString() });
    }

    function editComment(id, rect) {
      const c = state.doc.comments.find((x) => x.id === id);
      if (!c) return;
      state.editingId = id;
      state.pendingRange = null;
      const marks = RP.marks.marksOf(state.root, id);
      ui.showComposer(marks[0] ? rectOf(marks[0]) : rect || EMPTY_RECT, {
        quote: c.anchor.quote,
        body: c.body
      });
    }

    async function submitComment(ctx, body) {
      if (state.editingId) {
        const c = state.doc.comments.find((x) => x.id === state.editingId);
        state.editingId = null;
        if (c) {
          c.body = body;
          c.updatedAt = Date.now();
          await persist();
          ui.toast('コメントを更新しました');
        }
        return;
      }

      const range = state.pendingRange;
      state.pendingRange = null;
      if (!range) return;

      const anchor = RP.anchor.create(range, state);
      const comment = {
        id: util.uid(),
        body,
        status: 'open',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        anchor
      };
      state.doc.comments.push(comment);
      RP.marks.apply(state.root, range, comment.id);
      state.activeId = comment.id;
      window.getSelection()?.removeAllRanges();
      ui.setOpen(true);
      ui.setFilter('open');
      RP.marks.setActive(state.root, comment.id);
      await persist();
      ui.toast(
        anchor.startLine
          ? `L${anchor.startLine} にコメントを追加しました`
          : 'コメントを追加しました'
      );
    }

    function focusComment(id) {
      state.activeId = id;
      RP.marks.setActive(state.root, id);
      if (!RP.marks.scrollTo(state.root, id)) {
        ui.toast('本文中に該当箇所が見つかりません');
      }
      refresh();
    }

    async function toggleResolved(id) {
      const c = state.doc.comments.find((x) => x.id === id);
      if (!c) return;
      c.status = c.status === 'resolved' ? 'open' : 'resolved';
      c.updatedAt = Date.now();
      RP.marks.setResolved(state.root, id, c.status === 'resolved');
      await persist();
    }

    async function deleteComment(id) {
      const idx = state.doc.comments.findIndex((x) => x.id === id);
      if (idx === -1) return;
      state.doc.comments.splice(idx, 1);
      RP.marks.remove(state.root, id);
      if (state.activeId === id) state.activeId = null;
      await persist();
      ui.toast('コメントを削除しました');
    }

    /* ---------- エクスポート ---------- */

    function buildExport(opts) {
      return RP.exporter.build(state.doc, opts);
    }

    async function copyExport(opts) {
      const text = buildExport(opts);
      if (!text.trim()) {
        ui.toast('書き出すコメントがありません');
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        ui.toast('Markdown をコピーしました');
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('data-rp-ignore', '');
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        ui.toast(ok ? 'Markdown をコピーしました' : 'コピーできませんでした');
      }
    }

    function saveExport(opts) {
      const text = buildExport(opts);
      if (!text.trim()) {
        ui.toast('書き出すコメントがありません');
        return;
      }
      const mime = opts.style === 'json' ? 'application/json' : 'text/markdown';
      const blob = new Blob([text], { type: `${mime};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = RP.exporter.filename(state.doc, opts.style);
      a.setAttribute('data-rp-ignore', '');
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 1000);
      ui.toast('ダウンロードしました');
    }

    /* ---------- 入力イベント ---------- */

    const updateLauncher = util.debounce(() => {
      if (ui.isComposerOpen()) return;
      const range = currentSelectionRange();
      if (!range) {
        ui.hideLauncher();
        state.pendingRange = null;
        return;
      }
      state.pendingRange = range;
      ui.showLauncher(rectOf(range));
    }, 10);

    document.addEventListener('mouseup', updateLauncher, { signal });
    // fixed 配置なのでスクロールすると選択範囲から離れる
    window.addEventListener('scroll', () => ui.hideLauncher(), { passive: true, signal });
    document.addEventListener('keyup', (e) => {
      if (e.shiftKey || e.key.startsWith('Arrow')) updateLauncher();
    }, { signal });

    document.addEventListener('mousedown', (e) => {
      const path = e.composedPath();
      if (path.some((n) => n?.id === 'redpen-root')) return;
      ui.hideLauncher();
      if (ui.isComposerOpen()) {
        ui.hideComposer();
        state.pendingRange = null;
        state.editingId = null;
      }
      const mark = e.target?.closest?.('mark.rp-hl');
      if (mark) {
        state.activeId = mark.dataset.rpId;
        RP.marks.setActive(state.root, state.activeId);
        ui.setOpen(true);
        ui.setFilter('all');
        refresh();
        const card = ui.el.list.querySelector(`.card[data-id="${CSS.escape(state.activeId)}"]`);
        card?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
      }
    }, { signal });

    /* ショートカットは chrome.commands 経由でも、ページ上の keydown でも届く。
     * commands が他の拡張と衝突して割り当てられない環境でも動くよう両方受けるが、
     * 二重に実行されないよう直近の同一コマンドは無視する。 */
    const lastInvoked = new Map();

    function invokeCommand(name) {
      const now = Date.now();
      if (now - (lastInvoked.get(name) || 0) < 300) return;
      lastInvoked.set(name, now);
      if (name === 'comment-selection') openComposerForSelection();
      else if (name === 'toggle-sidebar') ui.setOpen(!ui.isOpen());
    }

    document.addEventListener('keydown', (e) => {
      if (!e.altKey || e.metaKey || e.ctrlKey) return;
      const key = e.key.toLowerCase();
      if (key === 'c') {
        e.preventDefault();
        invokeCommand('comment-selection');
      } else if (key === 'r') {
        e.preventDefault();
        invokeCommand('toggle-sidebar');
      }
    }, { signal });

    /** UI とイベントをすべて畳む。コメント自体は保存されたまま残る */
    function teardown() {
      abort.abort();
      RP.marks.removeAll(state.root);
      cfg.outline?.destroy();
      ui.destroy();
      if (RP.session === session) RP.session = null;
    }

    /** このタブで redpen を止める。ページの見た目は onDisable が元に戻す */
    function disable() {
      teardown();
      cfg.onDisable?.();
      try {
        chrome.runtime.sendMessage({ type: 'rp-set-enabled', enabled: false, notify: false });
      } catch {
        /* 拡張が更新された直後などは送れないことがある */
      }
    }

    const session = {
      state,
      ui,
      handleCommand: invokeCommand,
      refresh,
      teardown,
      disable,
      repaint: () => {
        paintAll();
        refresh();
      }
    };
    RP.session = session;
    return session;
  }

  RP.app = { start };
})();
