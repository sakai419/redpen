/* redpen — 選択範囲 ⇄ 保存可能なアンカーの相互変換
 *
 * 保存するのは「レンダリング後の DOM 座標」ではなく
 *   1. 原文の行範囲（Markdown のとき）
 *   2. 見出しパス
 *   3. 引用文字列 + 前後の文脈
 * の三点。DOM 構造が変わっても、原文が編集されても、この三点があれば
 * 再度おおよその位置に貼り直せる（貼り直せなければ missing として扱う）。
 */
(function () {
  'use strict';
  const RP = (globalThis.RedPen = globalThis.RedPen || {});
  const util = RP.util;

  const CONTEXT_LEN = 48;

  /* ---------- テキストオフセット ⇄ DOM ---------- */

  function textWalker(root) {
    return document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.closest('script, style, .rp-ui, [data-rp-ignore]')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
  }

  /** root 配下の可視テキストを連結した文字列 */
  function fullText(root) {
    const w = textWalker(root);
    let out = '';
    let n;
    while ((n = w.nextNode())) out += n.nodeValue;
    return out;
  }

  /** (node, offset) が fullText 上の何文字目かを返す */
  function offsetOf(root, node, offset) {
    const w = textWalker(root);
    let total = 0;
    let n;
    while ((n = w.nextNode())) {
      if (n === node) return total + offset;
      total += n.nodeValue.length;
    }
    // node がテキストノードでない（要素境界を指している）場合の近似
    if (node.nodeType === Node.ELEMENT_NODE) {
      const child = node.childNodes[offset];
      if (child) {
        const r = document.createRange();
        r.selectNodeContents(root);
        r.setEnd(child, 0);
        return r.toString().length;
      }
    }
    return total;
  }

  /** root 配下のテキストノードを、fullText 上の範囲つきで列挙する */
  function textSpans(root) {
    const w = textWalker(root);
    const spans = [];
    let total = 0;
    let n;
    while ((n = w.nextNode())) {
      const len = n.nodeValue.length;
      spans.push({ node: n, start: total, end: total + len });
      total += len;
    }
    return spans;
  }

  /**
   * fullText 上の文字位置に対応する (node, offset) を返す。
   *
   * ブロック要素の間には markdown-it が出力した改行が独立したテキストノードとして
   * 挟まる。その空白ノードを端点に選ぶと、後で closest() を辿ったときに
   * 本文のブロックではなく親コンテナに当たってしまうので、
   * 端点は必ず「中身のあるテキストノード」に寄せる。
   *
   * @param {'start'|'end'} edge 範囲のどちら側の端点か
   */
  function positionAt(root, index, edge = 'start') {
    const spans = textSpans(root);
    if (spans.length === 0) return null;

    const inRange =
      edge === 'end'
        ? (sp) => sp.start < index && index <= sp.end
        : (sp) => index < sp.end;
    const order = edge === 'end' ? [...spans].reverse() : spans;

    for (const pass of [true, false]) {
      for (const sp of order) {
        if (pass && !sp.node.nodeValue.trim()) continue;
        if (!inRange(sp)) continue;
        const offset = Math.min(Math.max(index - sp.start, 0), sp.node.nodeValue.length);
        return { node: sp.node, offset };
      }
    }

    const last = spans[spans.length - 1];
    return { node: last.node, offset: last.node.nodeValue.length };
  }

  function rangeFromOffsets(root, start, end) {
    const s = positionAt(root, start, 'start');
    const e = positionAt(root, end, 'end');
    if (!s || !e) return null;
    const range = document.createRange();
    range.setStart(s.node, s.offset);
    // 端点の寄せ直しで start が end を追い越した場合は start に潰す
    if (e.node.compareDocumentPosition(s.node) & Node.DOCUMENT_POSITION_FOLLOWING) {
      range.setEnd(s.node, s.offset);
    } else {
      range.setEnd(e.node, e.offset);
    }
    return range;
  }

  /* ---------- 見出しパス ---------- */

  function headingPathFor(root, element) {
    if (!element) return [];
    const stack = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (el) =>
        /^H[1-6]$/.test(el.tagName) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
    });
    let h;
    while ((h = walker.nextNode())) {
      const pos = h.compareDocumentPosition(element);
      const isBefore = Boolean(pos & Node.DOCUMENT_POSITION_FOLLOWING) || h === element;
      if (!isBefore) break;
      const level = Number(h.tagName[1]);
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
      stack.push({ level, text: util.normalize(h.textContent) });
    }
    // 文書内に h1 が 1 つしかなければそれは文書タイトル。位置の手がかりにならないので落とす
    const titleOnly = root.querySelectorAll('h1').length === 1;
    return stack
      .filter((s) => !(titleOnly && s.level === 1))
      .map((s) => s.text)
      .filter(Boolean);
  }

  /* ---------- 原文行の推定 ---------- */

  /** Markdown の装飾記法を落として、レンダリング後テキストに近づける */
  function stripMarkdown(line) {
    return util.normalize(
      String(line)
        .replace(/^\s{0,3}(#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/, '')
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/(\*|_)(.*?)\1/g, '$2')
        .replace(/~~(.*?)~~/g, '$1')
        .replace(/^\s*\|/, '')
        .replace(/\|\s*$/, '')
    );
  }

  function parseLineAttr(el) {
    const raw = el?.getAttribute('data-rp-line');
    if (!raw) return null;
    const [a, b] = raw.split(',').map((n) => parseInt(n, 10));
    if (!Number.isFinite(a)) return null;
    return { start: a, end: Number.isFinite(b) ? b : a };
  }

  /** 選択範囲の端点から、最も内側の行情報付きブロックを探す */
  function blockOf(node) {
    const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return el?.closest('[data-rp-line]') || null;
  }

  /**
   * ブロックの行範囲を、引用文字列の実際の位置まで絞り込む。
   * 見つからなければブロックの行範囲をそのまま返す。
   */
  function refineLines(block, quote, sourceLines) {
    const span = parseLineAttr(block);
    if (!span || !sourceLines || sourceLines.length === 0) return span;
    if (span.end - span.start > 400) return span; // 巨大ブロックは諦める

    const needleHead = util.normalize(quote).slice(0, 24).toLowerCase();
    const needleTail = util.normalize(quote).slice(-24).toLowerCase();
    if (!needleHead) return span;

    let start = null;
    let end = null;
    for (let ln = span.start; ln <= span.end && ln <= sourceLines.length; ln++) {
      const plain = stripMarkdown(sourceLines[ln - 1]).toLowerCase();
      if (!plain) continue;
      if (start === null && plain.includes(needleHead)) start = ln;
      if (start !== null && plain.includes(needleTail)) end = ln;
    }
    if (start === null) return span;
    return { start, end: end !== null && end >= start ? end : start };
  }

  /* ---------- 生成 ---------- */

  /**
   * @param {Range} range 選択範囲
   * @param {{root: HTMLElement, mode: string, sourceLines: string[]}} ctx
   */
  function create(range, ctx) {
    const { root, sourceLines } = ctx;
    const text = fullText(root);
    const start = offsetOf(root, range.startContainer, range.startOffset);
    const end = offsetOf(root, range.endContainer, range.endOffset);
    const quote = range.toString();

    const startBlock = blockOf(range.startContainer);
    const endBlock = blockOf(range.endContainer);

    let startLine = null;
    let endLine = null;
    if (ctx.mode === 'html') {
      const lines = RP.htmlsource?.linesFor(range, ctx);
      if (lines) {
        startLine = lines.start;
        endLine = lines.end;
      }
    } else if (startBlock) {
      const refined = refineLines(startBlock, quote, sourceLines);
      if (refined) {
        startLine = refined.start;
        endLine = refined.end;
      }
      if (endBlock && endBlock !== startBlock) {
        const tail = parseLineAttr(endBlock);
        if (tail) endLine = Math.max(endLine ?? tail.end, tail.end);
      }
    }

    return {
      quote,
      prefix: text.slice(Math.max(0, start - CONTEXT_LEN), start),
      suffix: text.slice(end, end + CONTEXT_LEN),
      textStart: start,
      textEnd: end,
      startLine,
      endLine,
      headingPath: headingPathFor(root, startBlock || range.startContainer.parentElement),
      domOrder: start,
      missing: false
    };
  }

  /* ---------- 再解決 ---------- */

  function scoreCandidate(text, index, anchor) {
    let score = 0;
    const prefix = anchor.prefix || '';
    const suffix = anchor.suffix || '';
    if (prefix) {
      const actual = text.slice(Math.max(0, index - prefix.length), index);
      score += commonSuffixLength(actual, prefix);
    }
    if (suffix) {
      const actual = text.slice(index + anchor.quote.length, index + anchor.quote.length + suffix.length);
      score += commonPrefixLength(actual, suffix);
    }
    // 元の位置に近いほど加点（同じ文字列が何度も出る文書向け）
    if (anchor.textStart != null) {
      score += Math.max(0, 40 - Math.min(40, Math.abs(index - anchor.textStart) / 50));
    }
    return score;
  }

  function commonPrefixLength(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i;
  }

  function commonSuffixLength(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
    return i;
  }

  /**
   * 保存済みアンカーを現在の DOM 上の Range に復元する。
   * @returns {Range|null}
   */
  function resolve(anchor, ctx) {
    const { root } = ctx;
    if (!anchor?.quote) return null;
    const text = fullText(root);
    const quote = anchor.quote;

    // 1. 記録した位置がそのまま生きているか
    if (
      anchor.textStart != null &&
      text.slice(anchor.textStart, anchor.textStart + quote.length) === quote
    ) {
      return rangeFromOffsets(root, anchor.textStart, anchor.textStart + quote.length);
    }

    // 2. 引用文字列を全文から探し、前後の文脈が最も合うものを選ぶ
    let best = null;
    let bestScore = -1;
    let from = 0;
    for (;;) {
      const idx = text.indexOf(quote, from);
      if (idx === -1) break;
      const score = scoreCandidate(text, idx, anchor);
      if (score > bestScore) {
        bestScore = score;
        best = idx;
      }
      from = idx + 1;
    }
    if (best !== null) return rangeFromOffsets(root, best, best + quote.length);

    // 3. 空白の揺れを吸収して再挑戦
    const norm = util.normalize(quote);
    if (norm && norm !== quote) {
      const flat = text.replace(/\s+/g, ' ');
      const idx = flat.indexOf(norm);
      if (idx !== -1) {
        // 正規化前の位置に写像し直す
        let raw = 0;
        let seen = 0;
        while (raw < text.length && seen < idx) {
          const isSpace = /\s/.test(text[raw]);
          if (isSpace) {
            while (raw < text.length && /\s/.test(text[raw])) raw++;
            seen++;
          } else {
            raw++;
            seen++;
          }
        }
        return rangeFromOffsets(root, raw, Math.min(text.length, raw + quote.length));
      }
    }

    return null;
  }

  RP.anchor = {
    create,
    resolve,
    fullText,
    offsetOf,
    rangeFromOffsets,
    headingPathFor,
    stripMarkdown
  };
})();
