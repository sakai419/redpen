/* redpen — 共通ユーティリティ */
(function () {
  'use strict';
  const RP = (globalThis.RedPen = globalThis.RedPen || {});

  const MD_EXT = /\.(md|markdown|mdown|mkd|mdx)$/i;
  const HTML_EXT = /\.(html?|xhtml)$/i;
  const VIEWER_PATH = 'src/viewer/viewer.html';

  const util = {
    MD_EXT,
    HTML_EXT,
    VIEWER_PATH,

    /** URL のパス部分（パーセントデコード済み） */
    pathOf(url) {
      try {
        return decodeURIComponent(new URL(url).pathname);
      } catch {
        return String(url).replace(/[?#].*$/, '');
      }
    },

    isMarkdownUrl(url) {
      return MD_EXT.test(util.pathOf(url));
    },

    isHtmlUrl(url) {
      return HTML_EXT.test(util.pathOf(url));
    },

    /** 拡張内ビューアの URL を組み立てる */
    viewerUrl(src) {
      return chrome.runtime.getURL(VIEWER_PATH) + '?src=' + encodeURIComponent(src);
    },

    /**
     * タブの URL からドキュメントキーを求める。
     * ビューアで開いている場合は元ファイルのキーを返すので、
     * 直接開いたときと同じコメントが引ける。
     */
    docKeyFromTabUrl(url) {
      try {
        const u = new URL(url);
        if (u.protocol === 'chrome-extension:' && u.pathname.endsWith('/viewer.html')) {
          const src = u.searchParams.get('src');
          return src ? util.docKey(src) : null;
        }
        if (!['file:', 'http:', 'https:'].includes(u.protocol)) return null;
        return util.docKey(url);
      } catch {
        return null;
      }
    },

    /** ランダム ID */
    uid() {
      const a = new Uint8Array(8);
      crypto.getRandomValues(a);
      return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
    },

    /** ドキュメント識別キー（クエリ・ハッシュを除いた URL） */
    docKey(href = location.href) {
      const u = new URL(href);
      u.hash = '';
      u.search = '';
      return decodeURI(u.href);
    },

    /** file:///a/b/report.md -> report.md */
    basename(key) {
      const s = key.replace(/[?#].*$/, '').replace(/\/+$/, '');
      return s.slice(s.lastIndexOf('/') + 1) || s;
    },

    /** file:// URL をローカルパス表記に戻す */
    displayPath(key) {
      if (key.startsWith('file://')) {
        try {
          return decodeURIComponent(key.slice('file://'.length));
        } catch {
          return key.slice('file://'.length);
        }
      }
      return key;
    },

    /** 連続する空白を潰して比較用に正規化する */
    normalize(text) {
      return (text || '').replace(/\s+/g, ' ').trim();
    },

    /** 表示用に長い文字列を切り詰める */
    truncate(text, max = 120) {
      const t = util.normalize(text);
      return t.length <= max ? t : t.slice(0, max - 1) + '…';
    },

    /** 2026-09-06 14:03 形式のローカル時刻 */
    formatTime(ts) {
      const d = new Date(ts);
      const p = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    },

    debounce(fn, ms) {
      let t = null;
      return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), ms);
      };
    }
  };

  RP.util = util;
})();
