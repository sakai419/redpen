/* redpen — content script のエントリ */
(function () {
  'use strict';
  const RP = (globalThis.RedPen = globalThis.RedPen || {});
  const util = RP.util;

  if (globalThis.__redpenBooted) return;
  globalThis.__redpenBooted = true;

  /** 無効にしたときに元の見た目へ戻すための控え */
  let markdownSource = null;
  let currentMode = null;

  function buildMarkdownView(source) {
    const shell = document.createElement('div');
    shell.className = 'rp-doc-shell';
    const article = document.createElement('article');
    article.className = 'rp-doc';
    article.id = 'rp-doc';
    shell.appendChild(article);

    document.body.textContent = '';
    document.body.className = 'rp-md-page';
    document.body.appendChild(shell);

    const lines = RP.markdown.render(source, article);
    const outline = RP.outline.create(article, { anchorTo: shell, mode: 'markdown' });
    return { root: article, sourceLines: lines, outline };
  }

  /** Chrome がプレーンテキストで表示していた状態に戻す */
  function restorePlainText() {
    if (markdownSource == null) return;
    document.body.className = '';
    document.body.textContent = '';
    const pre = document.createElement('pre');
    pre.style.cssText = 'word-wrap: break-word; white-space: pre-wrap;';
    pre.textContent = markdownSource;
    document.body.appendChild(pre);
  }

  function restoreView() {
    if (currentMode === 'markdown') restorePlainText();
    document.documentElement.style.paddingRight = '';
    document.documentElement.style.paddingLeft = '';
  }

  /** Markdown なのに Chrome がプレーンテキスト表示してくれなかったときの案内 */
  function showViewerPrompt() {
    const bar = document.createElement('div');
    bar.className = 'rp-ui rp-fallback';
    bar.setAttribute('data-rp-ignore', '');
    bar.innerHTML =
      '<span>redpen: このページから Markdown 原文を読み取れませんでした。</span>' +
      '<button type="button">redpen ビューアで開く</button>';
    bar.querySelector('button').addEventListener('click', () => {
      location.href = util.viewerUrl(location.href);
    });
    document.body.appendChild(bar);
  }

  /** このタブで動いてよいかを service worker に聞く */
  async function shouldRun() {
    try {
      const res = await chrome.runtime.sendMessage({ type: 'rp-should-run' });
      return res?.enabled !== false;
    } catch {
      // service worker が応答しないときは動かす側に倒す
      return true;
    }
  }

  async function boot({ force = false } = {}) {
    if (RP.session) return;
    const mode = RP.detect.detectMode();
    if (!mode) return;
    if (!force && !(await shouldRun())) return;

    currentMode = mode;
    let ctx;
    if (mode === 'markdown') {
      const source = markdownSource ?? RP.markdown.extractSourceFromPlainTextPage();
      if (!source || !source.trim()) {
        showViewerPrompt();
        return;
      }
      markdownSource = source;
      ctx = buildMarkdownView(source);
      document.title = util.basename(location.href);
    } else {
      const root = RP.detect.pickHtmlRoot();
      // 目次などで DOM をいじる前に、原文の行番号を焼き込む
      const sourceLines = await RP.htmlsource.load();
      ctx = { root, sourceLines, outline: RP.outline.create(root, { mode: 'html' }) };
    }

    const key = util.docKey();
    await RP.app.start({
      root: ctx.root,
      mode,
      sourceLines: ctx.sourceLines,
      outline: ctx.outline,
      canDisable: true,
      onDisable: restoreView,
      key,
      title: document.title?.trim() || util.basename(key),
      path: util.displayPath(key)
    });
  }

  /** 右クリックメニューやポップアップから止められたとき */
  function disableFromOutside() {
    if (!RP.session) return;
    RP.session.teardown();
    restoreView();
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'rp-command') {
      RP.session?.handleCommand(msg.name);
      sendResponse({ ok: Boolean(RP.session) });
    } else if (msg?.type === 'rp-disable') {
      disableFromOutside();
      sendResponse({ ok: true });
    } else if (msg?.type === 'rp-enable') {
      boot({ force: true });
      sendResponse({ ok: true });
    } else if (msg?.type === 'rp-ping') {
      sendResponse({ ok: true, active: Boolean(RP.session) });
    }
    return false;
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => boot(), { once: true });
  } else {
    boot();
  }
})();
