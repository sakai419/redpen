/* redpen — コメントに紐づくハイライト（mark 要素）を DOM に描く／外す
 * ファイル名を marks.js としているのは、シンタックスハイライトの
 * vendor/highlight.min.js と読み違えないようにするため。 */
(function () {
  'use strict';
  const RP = (globalThis.RedPen = globalThis.RedPen || {});

  const MARK_SELECTOR = 'mark.rp-hl';

  function isSkippable(node) {
    const p = node.parentElement;
    if (!p) return true;
    return Boolean(p.closest('script, style, .rp-ui, [data-rp-ignore]'));
  }

  /** range を覆うテキストノード群を、端点で分割したうえで集める */
  function textNodesIn(root, range) {
    let startNode = range.startContainer;
    let startOffset = range.startOffset;
    let endNode = range.endContainer;
    let endOffset = range.endOffset;

    if (startNode.nodeType === Node.TEXT_NODE && startOffset > 0) {
      const tail = startNode.splitText(startOffset);
      if (endNode === startNode) {
        endNode = tail;
        endOffset -= startOffset;
      }
      startNode = tail;
    }
    if (endNode.nodeType === Node.TEXT_NODE && endOffset < endNode.nodeValue.length) {
      endNode.splitText(endOffset);
    }

    if (startNode.nodeType !== Node.TEXT_NODE) {
      const w = document.createTreeWalker(startNode, NodeFilter.SHOW_TEXT);
      startNode = w.nextNode() || startNode;
    }
    if (endNode.nodeType !== Node.TEXT_NODE) {
      const w = document.createTreeWalker(endNode, NodeFilter.SHOW_TEXT);
      let last = null;
      let n;
      while ((n = w.nextNode())) last = n;
      endNode = last || endNode;
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const collected = [];
    let node = startNode;
    walker.currentNode = startNode;
    let guard = 0;
    while (node && guard++ < 100000) {
      if (node.nodeValue.length > 0 && !isSkippable(node)) collected.push(node);
      if (node === endNode) break;
      node = walker.nextNode();
    }
    return collected;
  }

  /**
   * range を mark 要素で包む。
   * @returns {HTMLElement[]} 生成した mark の配列（失敗時は空配列）
   */
  function apply(root, range, id, opts = {}) {
    if (!range || range.collapsed) return [];
    let nodes;
    try {
      nodes = textNodesIn(root, range);
    } catch {
      return [];
    }
    const marks = [];
    for (const node of nodes) {
      if (!node.parentNode) continue;
      if (!node.nodeValue.trim() && nodes.length > 1) continue;
      const mark = document.createElement('mark');
      mark.className = 'rp-hl';
      mark.dataset.rpId = id;
      if (opts.resolved) mark.classList.add('rp-hl-resolved');
      node.parentNode.insertBefore(mark, node);
      mark.appendChild(node);
      marks.push(mark);
    }
    return marks;
  }

  const escapeId = (id) =>
    typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : String(id).replace(/["\\]/g, '\\$&');

  function marksOf(root, id) {
    return Array.from(root.querySelectorAll(`${MARK_SELECTOR}[data-rp-id="${escapeId(id)}"]`));
  }

  function remove(root, id) {
    for (const mark of marksOf(root, id)) {
      const parent = mark.parentNode;
      if (!parent) continue;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    }
  }

  function removeAll(root) {
    for (const mark of Array.from(root.querySelectorAll(MARK_SELECTOR))) {
      const parent = mark.parentNode;
      if (!parent) continue;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    }
  }

  function setResolved(root, id, resolved) {
    for (const mark of marksOf(root, id)) mark.classList.toggle('rp-hl-resolved', resolved);
  }

  function setActive(root, id) {
    for (const mark of Array.from(root.querySelectorAll(MARK_SELECTOR))) {
      mark.classList.toggle('rp-hl-active', mark.dataset.rpId === id);
    }
  }

  function scrollTo(root, id) {
    const [first] = marksOf(root, id);
    if (!first) return false;
    first.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    first.classList.add('rp-hl-flash');
    setTimeout(() => first.classList.remove('rp-hl-flash'), 1200);
    return true;
  }

  RP.marks = { apply, remove, removeAll, marksOf, setActive, setResolved, scrollTo };
})();
