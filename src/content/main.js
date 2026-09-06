/* redpen — content script のエントリ */
(function () {
  'use strict';
  const RP = (globalThis.RedPen = globalThis.RedPen || {});
  const util = RP.util;

  if (globalThis.__redpenBooted) return;
  globalThis.__redpenBooted = true;

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
    // 元ページのスタイルシートが残っていると組版が混ざるので外す
    for (const node of document.head.querySelectorAll('style, link[rel="stylesheet"]')) {
      if (!node.href || !node.href.startsWith('chrome-extension:')) node.remove();
    }

    const lines = RP.markdown.render(source, article);
    RP.outline.create(article, shell);
    return { root: article, sourceLines: lines };
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

  async function boot() {
    const mode = RP.detect.detectMode();
    if (!mode) return;

    let ctx;
    if (mode === 'markdown') {
      const source = RP.markdown.extractSourceFromPlainTextPage();
      if (!source || !source.trim()) {
        showViewerPrompt();
        return;
      }
      ctx = buildMarkdownView(source);
      document.title = util.basename(location.href);
    } else {
      ctx = { root: RP.detect.pickHtmlRoot(), sourceLines: null };
    }

    const key = util.docKey();
    await RP.app.start({
      root: ctx.root,
      mode,
      sourceLines: ctx.sourceLines,
      key,
      title: document.title?.trim() || util.basename(key),
      path: util.displayPath(key)
    });
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'rp-command') {
      RP.session?.handleCommand(msg.name);
      sendResponse({ ok: Boolean(RP.session) });
    } else if (msg?.type === 'rp-ping') {
      sendResponse({ ok: true, active: Boolean(RP.session) });
    }
    return false;
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
