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
   *  sourceLines 原文の行配列（html は読み直せなかったとき null）
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
      onDelete: deleteComment,
      onDeleteMissing: deleteMissingComments,
      onDeleteAll: deleteAllComments,
      onEdit: editComment,
      onLauncherClick: openComposerForSelection,
      onDocumentComment: openComposerForDocument,
      onCancelComment: () => {
        state.pendingRange = null;
        state.editingId = null;
      },
      onSubmitComment: submitComment,
      onCopy: copyExport
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
        if (RP.exporter.isDocumentComment(c)) continue;
        const range = RP.anchor.resolve(c.anchor, state);
        const missing = !range;
        if (Boolean(c.anchor.missing) !== missing) {
          c.anchor.missing = missing;
          changed = true;
        }
        if (range) {
          // HTML は原文を読み直せたときだけ行番号が付く。
          // 付けられなかった頃のコメントや、原文が編集された場合はここで直す。
          // ハイライトを入れると Range が指すテキストノードが分かれるので、その前に数える
          if (state.mode === 'html' && state.sourceLines) {
            const lines = RP.htmlsource.linesFor(range, state);
            if (lines && (c.anchor.startLine !== lines.start || c.anchor.endLine !== lines.end)) {
              c.anchor.startLine = lines.start;
              c.anchor.endLine = lines.end;
              changed = true;
            }
          }
          RP.marks.apply(state.root, range, c.id);
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

    /** 範囲を選ばない、文書全体へのコメント */
    function openComposerForDocument(rect) {
      state.pendingRange = null;
      state.editingId = null;
      ui.showComposer(rect || EMPTY_RECT, { quote: '', scope: 'document' });
    }

    function editComment(id, rect) {
      const c = state.doc.comments.find((x) => x.id === id);
      if (!c) return;
      state.editingId = id;
      state.pendingRange = null;
      const marks = RP.marks.marksOf(state.root, id);
      ui.showComposer(marks[0] ? rectOf(marks[0]) : rect || EMPTY_RECT, {
        quote: c.anchor?.quote || '',
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

      const whole = ctx?.scope === 'document';
      const range = state.pendingRange;
      state.pendingRange = null;
      if (!whole && !range) return;

      const anchor = whole ? null : RP.anchor.create(range, state);
      const comment = {
        id: util.uid(),
        body,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        anchor
      };
      state.doc.comments.push(comment);
      if (range) {
        RP.marks.apply(state.root, range, comment.id);
        window.getSelection()?.removeAllRanges();
      }
      state.activeId = comment.id;
      ui.setOpen(true);
      RP.marks.setActive(state.root, comment.id);
      await persist();
      ui.toast(
        whole
          ? '文書全体へのコメントを追加しました'
          : anchor.startLine
            ? `L${anchor.startLine} にコメントを追加しました`
            : 'コメントを追加しました'
      );
    }

    function focusComment(id) {
      state.activeId = id;
      RP.marks.setActive(state.root, id);
      const c = state.doc.comments.find((x) => x.id === id);
      // 文書全体へのコメントには飛び先が無い
      if (c && !RP.exporter.isDocumentComment(c) && !RP.marks.scrollTo(state.root, id)) {
        ui.toast('本文中に該当箇所が見つかりません');
      }
      refresh();
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

    /** 引用箇所が本文から消えたもの（= 修正が反映されたもの）をまとめて片づける */
    async function deleteMissingComments() {
      const before = state.doc.comments.length;
      state.doc.comments = state.doc.comments.filter((c) => !c.anchor?.missing);
      const n = before - state.doc.comments.length;
      if (n === 0) return;
      if (state.activeId && !state.doc.comments.some((c) => c.id === state.activeId)) {
        state.activeId = null;
      }
      await persist();
      ui.toast(`未検出のコメントを ${n} 件削除しました`);
    }

    async function deleteAllComments() {
      const n = state.doc.comments.length;
      if (n === 0) return;
      state.doc.comments = [];
      RP.marks.removeAll(state.root);
      state.activeId = null;
      state.editingId = null;
      ui.hideComposer();
      await persist();
      ui.toast(`コメントを ${n} 件削除しました`);
    }

    /* ---------- エクスポート ---------- */

    async function copyExport(opts) {
      const text = RP.exporter.build(state.doc, opts);
      if (!text.trim()) {
        ui.toast('書き出すコメントがありません');
        return;
      }
      const done = `${opts.style === 'json' ? 'JSON' : 'Markdown'} をコピーしました`;
      try {
        await navigator.clipboard.writeText(text);
        ui.toast(done);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('data-rp-ignore', '');
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        ui.toast(ok ? done : 'コピーできませんでした');
      }
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
        refresh();
        const card = ui.el.list.querySelector(`.card[data-id="${CSS.escape(state.activeId)}"]`);
        card?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
      }
    }, { signal });

    /* パネル開閉のショートカットは chrome.commands 経由でも、ページ上の keydown でも届く。
     * commands が他の拡張と衝突して割り当てられない環境でも動くよう両方受けるが、
     * 二重に実行されないよう直近の同一コマンドは無視する。
     * comment-selection は右クリックメニューから届く。 */
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
      // Mac の Option+R は e.key が「®」になるので、物理キーで見る
      if (e.code === 'KeyR') {
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
