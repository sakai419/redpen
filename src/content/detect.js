/* redpen — このページで拡張を動かすべきか、Markdown なのか HTML なのかを判定する */
(function () {
  'use strict';
  const RP = (globalThis.RedPen = globalThis.RedPen || {});

  const util = RP.util;
  const pathname = (url = location.href) => util.pathOf(url);
  const isMarkdownUrl = (url = location.href) => util.isMarkdownUrl(url);
  const isHtmlUrl = (url = location.href) => util.isHtmlUrl(url);

  /** file:// のディレクトリ一覧ページ */
  function isDirectoryListing() {
    return location.href.startsWith('file://') && pathname().endsWith('/');
  }

  /**
   * @returns {'markdown'|'html'|null}
   */
  function detectMode() {
    if (isDirectoryListing()) return null;
    if (location.protocol === 'chrome-extension:') return null;
    if (isMarkdownUrl()) return 'markdown';
    if (isHtmlUrl()) return 'html';
    // 拡張子なしでも、生成レポートらしい HTML なら対象にする
    if (location.protocol === 'file:' && document.contentType === 'text/html') return 'html';
    return null;
  }

  /** HTML モードでアノテーション対象にする本文コンテナ */
  function pickHtmlRoot() {
    const candidates = ['main', 'article', '.markdown-body', '#content', '.content', 'body'];
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim().length > 0) return el;
    }
    return document.body;
  }

  RP.detect = { detectMode, isMarkdownUrl, isHtmlUrl, isDirectoryListing, pickHtmlRoot, pathname };
})();
