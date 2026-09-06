/* redpen — コメント集合を Markdown に書き出す
 *
 * 方針: 出力するのは「どこ」と「何を言ったか」だけ。
 * 表題・日時・件数・依頼文といった枠は付けない。
 * AI への指示の書き方はユーザーが決めるものであって、
 * この拡張が代わりに決めるものではないため。
 */
(function () {
  'use strict';
  const RP = (globalThis.RedPen = globalThis.RedPen || {});
  const util = RP.util;

  /** 引用は位置を特定できる長さで足りる。これを超えたら中略する */
  const QUOTE_MAX = 40;

  /** アンカーを "L42-L45" / "L42" / "" に整形する */
  function lineLabel(anchor) {
    if (!anchor || anchor.startLine == null) return '';
    const { startLine, endLine } = anchor;
    if (endLine == null || endLine === startLine) return `L${startLine}`;
    return `L${startLine}-L${endLine}`;
  }

  /** 見出しパスを "3. 設計 > 3.2 前提条件" に整形する */
  function headingLabel(anchor) {
    const path = anchor?.headingPath;
    if (!Array.isArray(path) || path.length === 0) return '';
    return path.join(' > ');
  }

  /** 行番号と見出しを併記した位置表記 */
  function locationLabel(anchor) {
    const line = lineLabel(anchor);
    const heading = headingLabel(anchor);
    if (line && heading) return `${line} — ${heading}`;
    return line || heading || '';
  }

  /**
   * 引用を 1 行に畳み、長すぎるものは頭だけ残す。
   * 選択範囲そのものではなく「場所が分かる最小限」を出すための処理。
   * 上限内に文の切れ目があればそこで切る（語の途中で切れると読みにくいため）。
   */
  function trimQuote(quote, max = QUOTE_MAX) {
    const line = util.normalize(quote);
    if (line.length <= max) return line;

    const head = line.slice(0, max);
    const stop = Math.max(head.lastIndexOf('。'), head.lastIndexOf('！'), head.lastIndexOf('？'));
    if (stop >= Math.floor(max * 0.4)) return head.slice(0, stop + 1) + ' …';
    return head.trimEnd() + ' …';
  }

  function sortComments(comments) {
    return comments.slice().sort((a, b) => {
      const al = a.anchor?.startLine ?? Number.MAX_SAFE_INTEGER;
      const bl = b.anchor?.startLine ?? Number.MAX_SAFE_INTEGER;
      if (al !== bl) return al - bl;
      const ao = a.anchor?.domOrder ?? Number.MAX_SAFE_INTEGER;
      const bo = b.anchor?.domOrder ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return a.createdAt - b.createdAt;
    });
  }

  /** 既定の形式: 位置見出し → 引用 → コメント、をコメントの数だけ */
  function renderQuoted(comments) {
    const out = [];
    for (const c of comments) {
      const location = locationLabel(c.anchor);
      if (location) out.push(`## ${location}`, '');
      const quote = trimQuote(c.anchor?.quote || '');
      if (quote) out.push(`> ${quote}`, '');
      out.push(String(c.body).trim(), '');
    }
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  /** 1 件 1 行の形式 */
  function renderCompact(comments) {
    return (
      comments
        .map((c) => {
          const location = locationLabel(c.anchor);
          const quote = trimQuote(c.anchor?.quote || '', 32);
          const head = [location, quote && `「${quote}」`].filter(Boolean).join(' ');
          return `- ${head ? head + ' — ' : ''}${util.normalize(c.body)}`;
        })
        .join('\n') + '\n'
    );
  }

  function renderJson(comments) {
    return (
      JSON.stringify(
        comments.map((c) => ({
          startLine: c.anchor?.startLine ?? null,
          endLine: c.anchor?.endLine ?? null,
          headingPath: c.anchor?.headingPath || [],
          quote: c.anchor?.quote || '',
          comment: c.body,
          status: c.status || 'open'
        })),
        null,
        2
      ) + '\n'
    );
  }

  /**
   * @param {object} doc  store の doc オブジェクト
   * @param {object} opts { style: 'quote'|'compact'|'json', includeResolved }
   */
  function build(doc, opts = {}) {
    const o = { style: 'quote', includeResolved: false, ...opts };
    let comments = doc.comments || [];
    if (!o.includeResolved) comments = comments.filter((c) => c.status !== 'resolved');
    comments = sortComments(comments);

    if (comments.length === 0) return '';
    if (o.style === 'json') return renderJson(comments);
    if (o.style === 'compact') return renderCompact(comments);
    return renderQuoted(comments);
  }

  function filename(doc, style) {
    const base = doc.title.replace(/\.(md|markdown|mdown|mkd|mdx|html?|txt)$/i, '');
    const ext = style === 'json' ? 'json' : 'md';
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${base}.comments-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.${ext}`;
  }

  RP.exporter = { build, filename, lineLabel, headingLabel, trimQuote, sortComments };
})();
