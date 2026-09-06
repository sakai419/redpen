/* redpen — Markdown を「原文の行番号を保ったまま」HTML に変換する
 *
 * markdown-it の token.map（ブロックの原文行範囲）をそのまま
 * data-rp-line 属性として DOM に持ち込むのが肝。これがあるので
 * 「レンダリング後の選択範囲 → 原文の行番号」を後から復元できる。
 */
(function () {
  'use strict';
  const RP = (globalThis.RedPen = globalThis.RedPen || {});

  let mdInstance = null;

  function createRenderer() {
    if (mdInstance) return mdInstance;

    const hljs = globalThis.hljs;

    const md = globalThis.markdownit({
      html: true,
      linkify: true,
      breaks: false,
      typographer: false,
      highlight(code, lang) {
        if (!hljs || !lang) return '';
        const name = lang.trim().toLowerCase();
        if (!hljs.getLanguage(name)) return '';
        try {
          return hljs.highlight(code, { language: name, ignoreIllegals: true }).value;
        } catch {
          return '';
        }
      }
    });

    // すべてのブロックトークンに原文の行範囲を焼き込む。
    // token.map は [開始行, 終了行) の 0 始まり。属性は 1 始まりの閉区間にする。
    md.core.ruler.push('rp_source_lines', (state) => {
      for (const token of state.tokens) {
        if (!token.map) continue;
        const isOpen = token.type.endsWith('_open');
        const isSelfContained = token.nesting === 0 && token.type !== 'inline';
        if (!isOpen && !isSelfContained) continue;
        const start = token.map[0] + 1;
        const end = Math.max(start, token.map[1]);
        token.attrSet('data-rp-line', `${start},${end}`);
      }
      return true;
    });

    // fence / code_block は attrs が <code> 側に付くので、<pre> にも移しておく
    // （closest('[data-rp-line]') が常にブロック単位で当たるようにするため）。
    // ついでに言語名を data-lang に載せて、右上のラベルとして描けるようにする。
    for (const rule of ['fence', 'code_block']) {
      const original = md.renderer.rules[rule];
      md.renderer.rules[rule] = function (tokens, idx, options, env, self) {
        const token = tokens[idx];
        const html = original
          ? original(tokens, idx, options, env, self)
          : self.renderToken(tokens, idx, options);
        if (!html.startsWith('<pre')) return html;

        const parts = [];
        const line = token.attrGet('data-rp-line');
        if (line) parts.push(`data-rp-line="${line}"`);
        const lang = (token.info || '').trim().split(/\s+/)[0].toLowerCase();
        if (/^[a-z0-9+#._-]{1,20}$/.test(lang)) parts.push(`data-lang="${lang}"`);
        if (parts.length === 0) return html;
        return html.replace(/^<pre/, `<pre ${parts.join(' ')}`);
      };
    }

    mdInstance = md;
    return md;
  }

  /** チェックボックス記法 "- [ ]" を描画用のマークアップに変換する */
  function enhanceTaskLists(root) {
    for (const li of root.querySelectorAll('li')) {
      const first = li.firstElementChild?.tagName === 'P' ? li.firstElementChild : li;
      const text = first.firstChild;
      if (!text || text.nodeType !== Node.TEXT_NODE) continue;
      const m = /^\[([ xX])\]\s+/.exec(text.nodeValue);
      if (!m) continue;
      text.nodeValue = text.nodeValue.slice(m[0].length);
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.disabled = true;
      box.checked = m[1].toLowerCase() === 'x';
      box.className = 'rp-task-checkbox';
      first.insertBefore(box, first.firstChild);
      li.classList.add('rp-task-item');
    }
  }

  /**
   * Markdown 原文をレンダリングして container に流し込む。
   * @returns {string[]} 原文を行に分割した配列（1 行目が index 0）
   */
  function render(source, container) {
    const md = createRenderer();
    const dirty = md.render(source);
    const clean = globalThis.DOMPurify.sanitize(dirty, {
      ADD_ATTR: ['data-rp-line', 'data-lang', 'target', 'align'],
      ADD_TAGS: ['details', 'summary'],
      // ローカルファイルの相対画像を壊さない
      ALLOW_UNKNOWN_PROTOCOLS: false
    });
    container.innerHTML = clean;
    enhanceTaskLists(container);
    return source.replace(/\r\n?/g, '\n').split('\n');
  }

  /**
   * Chrome がプレーンテキストとして表示している .md ページから原文を取り出す。
   * 取り出せなければ null。
   */
  function extractSourceFromPlainTextPage() {
    const body = document.body;
    if (!body) return null;
    const pres = body.querySelectorAll('pre');
    if (pres.length === 1 && body.children.length <= 2) {
      return pres[0].textContent;
    }
    // pre が無くテキストノードだけのページ
    const onlyText =
      body.children.length === 0 && body.textContent && body.textContent.trim().length > 0;
    if (onlyText) return body.textContent;
    return null;
  }

  RP.markdown = { render, createRenderer, extractSourceFromPlainTextPage };
})();
