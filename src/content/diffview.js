/* redpen — 基準の版との差分を本文に描く／外す
 *
 * 基準として覚えておくのは原文ではなく、レンダリング後の各ブロックのテキスト。
 * Markdown でも HTML でも同じ形で取れ、原文が読めない HTML でも動く。
 *
 * 見せるのは「変わった場所」だけで、変わる前の中身は出さない。
 * 足された・書き換わった文字は mark で包み、文字が消えただけの場所には中身を持たない
 * 小さな印を置く。本文にテキストノードを足さないので、コメントの貼り直し
 * （anchor.js の文字オフセット）や書き出しの引用に混ざらない。
 */
(function () {
  'use strict';
  const RP = (globalThis.RedPen = globalThis.RedPen || {});

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const BLOCK_SELECTOR = [
    'p', 'li', 'dt', 'dd', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'td', 'th',
    'caption', 'figcaption', 'summary', 'legend', 'blockquote', 'div', 'section',
    'article', 'aside', 'header', 'footer', 'main', 'nav', 'details', 'figure',
    'table', 'ul', 'ol', 'dl', 'form', 'fieldset', 'address', 'body', 'text'
  ].join(', ');
  const INS = 'rp-diff-ins';
  const DEL = 'rp-diff-del';
  const GONE = 'rp-diff-gone';
  /** 丸ごと消えたブロックの印を、中ではなく隣に置くブロック（見出しの文字の大きさを引き継がないように） */
  const SIBLING_OK = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'blockquote', 'figure', 'table', 'details']);

  function textWalker(root) {
    return document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        // フォーム部品の中身は直下のテキストノードがそのまま値になるので、mark で包むと値が欠ける
        if (p.closest('script, style, noscript, textarea, select, .rp-ui, [data-rp-ignore]')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
  }

  /**
   * 本文をブロックに分ける。テキストノードを、それを直接持つブロック要素ごとにまとめる。
   * 入れ子のリストのように、ブロックの中に別のブロックがあっても混ざらない。
   */
  function collectBlocks(root) {
    const walker = textWalker(root);
    const blocks = [];
    const byOwner = new Map();
    let node;
    while ((node = walker.nextNode())) {
      let owner = node.parentElement.closest(BLOCK_SELECTOR);
      if (!owner || !root.contains(owner)) owner = root;
      let block = byOwner.get(owner);
      if (!block) {
        block = { owner, nodes: [], text: '' };
        byOwner.set(owner, block);
        blocks.push(block);
      }
      block.nodes.push({ node, start: block.text.length });
      block.text += node.nodeValue;
    }
    return blocks.filter((b) => b.text.trim());
  }

  const kindOf = (block) => block.owner.localName;

  /** 基準として保存する形（各ブロックのテキストと要素名） */
  function snapshot(root) {
    const blocks = collectBlocks(root);
    return { blocks: blocks.map((b) => b.text), kinds: blocks.map(kindOf) };
  }

  const inSvg = (node) => node.parentNode?.namespaceURI === SVG_NS;

  function createIns(parent, hunk) {
    const el =
      parent.namespaceURI === SVG_NS
        ? document.createElementNS(SVG_NS, 'tspan')
        : document.createElement('mark');
    el.setAttribute('class', INS);
    el.setAttribute('data-rp-hunk', hunk);
    return el;
  }

  /** 文字が消えた場所の印。何が消えたかは持たない */
  function createRemoved(className, hunk) {
    const el = document.createElement('span');
    el.className = className;
    el.setAttribute('data-rp-ignore', '');
    el.setAttribute('data-rp-hunk', hunk);
    el.title = 'ここにあった文言が削除されています';
    return el;
  }

  /** ブロック内の [start, end) を mark で包む。空白だけの部分は包まない */
  function wrap(block, start, end, hunk) {
    // 端の空白（HTML の改行・インデント）まで塗らない
    while (start < end && /\s/.test(block.text[start])) start++;
    while (end > start && /\s/.test(block.text[end - 1])) end--;
    for (let k = block.nodes.length - 1; k >= 0; k--) {
      const entry = block.nodes[k];
      const node = entry.node;
      const from = Math.max(start - entry.start, 0);
      const to = Math.min(end - entry.start, node.nodeValue.length);
      if (from >= to) continue;
      // 後ろから処理するので、node には常に先頭側が残る
      if (to < node.nodeValue.length) node.splitText(to);
      const target = from > 0 ? node.splitText(from) : node;
      if (!target.nodeValue.trim()) continue;
      const mark = createIns(target.parentNode, hunk);
      target.parentNode.insertBefore(mark, target);
      mark.appendChild(target);
    }
  }

  /** 差分の mark の外側まで出る（消えた文字の印を mark の中に入れないため） */
  function outside(node, edge) {
    let ref = node;
    while (
      ref.parentNode?.classList?.contains(INS) &&
      (edge === 'end' ? ref === ref.parentNode.lastChild : ref === ref.parentNode.firstChild)
    ) {
      ref = ref.parentNode;
    }
    return ref;
  }

  /** ブロック内の位置 at に要素を差し込む。前のテキストの末尾に付ける方を優先する */
  function insertAt(block, at, el) {
    const entry =
      block.nodes.find((e) => e.start < at && at <= e.start + e.node.nodeValue.length) ||
      block.nodes[0];
    const node = entry.node;
    if (inSvg(node)) {
      // SVG の中では生成コンテンツが描けないので、SVG の手前に出す
      const svg = node.parentNode.closest('svg');
      svg?.parentNode?.insertBefore(el, svg);
      return;
    }
    const offset = Math.max(0, at - entry.start);
    if (offset === 0) {
      const ref = outside(node, 'start');
      ref.parentNode.insertBefore(el, ref);
    } else if (offset >= node.nodeValue.length) {
      const ref = outside(node, 'end');
      ref.parentNode.insertBefore(el, ref.nextSibling);
    } else {
      node.splitText(offset);
      node.parentNode.insertBefore(el, node.nextSibling);
    }
  }

  /** 丸ごと消えたブロックの印を、今の版の j 番目のブロックの手前（末尾なら最後のブロックの後ろ）に置く */
  function placeGone(root, blocks, j, el) {
    const block = j < blocks.length ? blocks[j] : blocks[blocks.length - 1];
    if (!block) {
      root.appendChild(el);
      return;
    }
    const before = j < blocks.length;
    const owner = block.owner;
    if (owner !== root && SIBLING_OK.has(owner.localName)) {
      owner.parentNode.insertBefore(el, before ? owner : owner.nextSibling);
    } else {
      insertAt(block, before ? 0 : block.text.length, el);
    }
  }

  function paintChanged(block, changes, hunk) {
    // 書き換えは足された側を塗れば場所が分かるので、印を置くのは消えただけの場所に限る
    const inserted = new Set(changes.filter((c) => c.type === 'insert').map((c) => c.start));
    const marks = changes.filter((c) => c.type === 'insert' || !inserted.has(c.at));
    // 後ろから処理して、手前の位置がずれないようにする
    const pos = (c) => (c.type === 'insert' ? c.start : c.at);
    for (const c of marks.sort((a, b) => pos(b) - pos(a))) {
      if (c.type === 'insert') wrap(block, c.start, c.end, hunk);
      else insertAt(block, c.at, createRemoved(DEL, hunk));
    }
  }

  /**
   * 基準の版と見比べて、本文に差分を描く。
   * @param {{blocks: string[], kinds?: string[]}} base snapshot() で保存したもの
   * @returns {number} 変更箇所の数（隣り合うブロックの変更は 1 箇所に数える）
   */
  function paint(root, base) {
    clear(root);
    const blocks = collectBlocks(root);
    const result = RP.diff.diffBlocks(base.blocks, blocks.map((b) => b.text), {
      oldKinds: base.kinds,
      newKinds: blocks.map(kindOf)
    });

    let hunk = -1;
    let inHunk = false;
    const enter = () => {
      if (!inHunk) hunk++;
      inHunk = true;
      return hunk;
    };

    for (let j = 0; j <= blocks.length; j++) {
      const gone = result.removed.get(j);
      if (gone) placeGone(root, blocks, j, createRemoved(GONE, enter()));
      if (j === blocks.length) break;

      const info = result.blocks[j];
      if (!info) {
        inHunk = false;
        continue;
      }
      const h = enter();
      if (info.type === 'added') wrap(blocks[j], 0, blocks[j].text.length, h);
      else paintChanged(blocks[j], info.changes, h);
    }
    return hunk + 1;
  }

  function clear(root) {
    for (const el of Array.from(root.querySelectorAll(`.${DEL}, .${GONE}`))) el.remove();
    for (const mark of Array.from(root.querySelectorAll(`.${INS}`))) {
      const parent = mark.parentNode;
      if (!parent) continue;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    }
  }

  /** n 番目の変更箇所へ移動する */
  function scrollTo(root, n) {
    const els = root.querySelectorAll(`[data-rp-hunk="${n}"]`);
    if (els.length === 0) return false;
    els[0].scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    for (const el of els) {
      el.classList.remove('rp-diff-flash');
      // アニメーションを最初からやり直させる
      void el.getBoundingClientRect?.();
      el.classList.add('rp-diff-flash');
    }
    setTimeout(() => els.forEach((el) => el.classList.remove('rp-diff-flash')), 1200);
    return true;
  }

  RP.diffview = { collectBlocks, snapshot, paint, clear, scrollTo };
})();
