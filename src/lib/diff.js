/* redpen — 2 つの版の差分を取る（DOM に依存しない部分）
 *
 * 比べる単位は「ブロック」（段落・リスト項目・見出し・表のセル・コードブロックなど）の
 * テキスト。まずブロック同士を対応づけ、対応のつかなかったブロックのうち似ているもの同士は
 * 中身を文字単位で比べる。日本語は単語に区切れないので、英数字の連なり以外は 1 文字ずつ扱う。
 */
(function () {
  'use strict';
  const RP = (globalThis.RedPen = globalThis.RedPen || {});

  /** LCS の表の上限。これを超える組み合わせは対応づけを諦めて全部を変更扱いにする */
  const MAX_CELLS = 4e6;
  /** これ以上似ていれば「書き換えられた同じブロック」とみなす */
  const SIMILAR = 0.5;
  /** 並び順で組にしたブロックでも、これ以上似ていれば中身を文字単位で見せる（下回れば丸ごと置き換え） */
  const SOMEWHAT = 0.25;
  /** 対応のつかない区間で、似たブロックを探しにいく範囲 */
  const LOOKAHEAD = 8;
  /** 変更に挟まれた、この長さ以下の一致は変更に含める（「の」「は」だけ残って読みにくくなるため） */
  const ISLAND = 2;

  const TOKEN_RE = /\s+|[A-Za-z0-9_]+|[\s\S]/gu;

  const normalize = (text) => (text || '').replace(/\s+/g, ' ').trim();
  const inkLength = (text) => text.replace(/\s+/g, '').length;

  /**
   * 一致した要素の添字の対 [i, j] を、先頭から順に返す。
   * 共通の先頭・末尾を先に落としてから LCS を取る。
   */
  function matchPairs(a, b) {
    let head = 0;
    while (head < a.length && head < b.length && a[head] === b[head]) head++;
    let endA = a.length;
    let endB = b.length;
    while (endA > head && endB > head && a[endA - 1] === b[endB - 1]) {
      endA--;
      endB--;
    }

    const pairs = [];
    for (let i = 0; i < head; i++) pairs.push([i, i]);

    const n = endA - head;
    const m = endB - head;
    if (n > 0 && m > 0 && n * m <= MAX_CELLS) {
      // dp[i][j] = a[head+i..] と b[head+j..] の LCS 長。上限から min(n, m) <= 2000 なので 16 bit で足りる
      const w = m + 1;
      const dp = new Uint16Array((n + 1) * w);
      for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
          dp[i * w + j] =
            a[head + i] === b[head + j]
              ? dp[(i + 1) * w + j + 1] + 1
              : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
        }
      }
      let i = 0;
      let j = 0;
      while (i < n && j < m) {
        if (a[head + i] === b[head + j]) {
          pairs.push([head + i, head + j]);
          i++;
          j++;
        } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) {
          i++;
        } else {
          j++;
        }
      }
    }

    for (let k = 0; k < a.length - endA; k++) pairs.push([endA + k, endB + k]);
    return pairs;
  }

  function tokenize(text) {
    return text.match(TOKEN_RE) || [];
  }

  /**
   * ブロック 1 つ分の文字列を比べる。
   *
   * @returns {{similarity: number, changes: Array}}
   *   changes は新しい版の文字位置で表した変更の列。
   *   { type: 'insert', start, end }  … 新しい版の [start, end) が足された
   *   { type: 'delete', at, text }    … 新しい版の at の位置から text が消えた
   */
  function diffText(oldText, newText) {
    const oldTokens = tokenize(oldText);
    const newTokens = tokenize(newText);
    // 空白はどんな連なりでも同じものとして扱う（HTML の改行・インデントの揺れを拾わない）
    const key = (t) => (/^\s/.test(t) ? ' ' : t);
    const pairs = matchPairs(oldTokens.map(key), newTokens.map(key));

    const newOffsets = [0];
    for (const t of newTokens) newOffsets.push(newOffsets[newOffsets.length - 1] + t.length);

    // 一致した区間と変更の区間を交互に並べる
    const chunks = [];
    let oi = 0;
    let ni = 0;
    let same = 0;
    const pushChange = (oEnd, nEnd) => {
      if (oi === oEnd && ni === nEnd) return;
      chunks.push({
        equal: false,
        del: oldTokens.slice(oi, oEnd).join(''),
        start: newOffsets[ni],
        end: newOffsets[nEnd]
      });
    };
    for (const [i, j] of [...pairs, [oldTokens.length, newTokens.length]]) {
      pushChange(i, j);
      if (i < oldTokens.length) {
        same += inkLength(oldTokens[i]);
        const last = chunks[chunks.length - 1];
        if (last?.equal) {
          last.text += oldTokens[i];
          last.end = newOffsets[j + 1];
        } else {
          chunks.push({ equal: true, text: oldTokens[i], start: newOffsets[j], end: newOffsets[j + 1] });
        }
      }
      oi = i + 1;
      ni = j + 1;
    }

    // 変更に挟まれた短い一致は、前後の変更とまとめる
    const merged = [];
    for (let k = 0; k < chunks.length; k++) {
      const c = chunks[k];
      const prev = merged[merged.length - 1];
      const next = chunks[k + 1];
      if (c.equal && prev && !prev.equal && next && !next.equal && inkLength(c.text) <= ISLAND) {
        prev.del += c.text + next.del;
        prev.end = next.end;
        k++;
        continue;
      }
      if (!c.equal && prev && !prev.equal) {
        prev.del += c.del;
        prev.end = c.end;
        continue;
      }
      merged.push({ ...c });
    }

    const changes = [];
    for (const c of merged) {
      if (c.equal) continue;
      if (inkLength(c.del) > 0) changes.push({ type: 'delete', at: c.start, text: c.del });
      if (inkLength(newText.slice(c.start, c.end)) > 0) {
        changes.push({ type: 'insert', start: c.start, end: c.end });
      }
    }

    const total = inkLength(oldText) + inkLength(newText);
    return { similarity: total === 0 ? 1 : (2 * same) / total, changes };
  }

  /**
   * ブロックの並びを比べる。
   *
   * @param {string[]} oldBlocks 基準の版の各ブロックのテキスト
   * @param {string[]} newBlocks 今の版の各ブロックのテキスト
   * @param {{oldKinds?: string[], newKinds?: string[]}} [opts]
   *   各ブロックの種類（要素名）。あれば、似ていないブロック同士を置き換えとして組にするのは
   *   同じ種類どうしに限る（段落とリスト項目を組にしない）
   * @returns {{blocks: Array, removed: Map<number, string[]>}}
   *   blocks[j]     今の版の j 番目のブロックの状態。変わっていなければ null、
   *                 丸ごと足されたものは { type: 'added' }、
   *                 書き換え・置き換えられたものは { type: 'changed', changes }
   *   removed       消えたブロックのテキストを、今の版の何番目のブロックの直前に
   *                 あったかで引けるようにしたもの（末尾なら newBlocks.length）
   */
  function diffBlocks(oldBlocks, newBlocks, { oldKinds, newKinds } = {}) {
    const sameKind = (i, j) => !oldKinds || !newKinds || oldKinds[i] === newKinds[j];
    const pairs = matchPairs(oldBlocks.map(normalize), newBlocks.map(normalize));
    const blocks = new Array(newBlocks.length).fill(null);
    const removed = new Map();
    const remove = (before, texts) => {
      if (texts.length === 0) return;
      removed.set(before, [...(removed.get(before) || []), ...texts]);
    };

    // 対応のつかなかった区間 old[oFrom, oTo) と new[nFrom, nTo) を埋める。
    // 似たもの同士は書き換えとして中身を比べ、それ以外は先頭から同じ種類が続くあいだ
    // 並び順で「置き換え」として組にする。余った旧ブロックは「削除」として、
    // 区間の新ブロックの後ろ（次に対応のついたブロックの直前）に見せる
    function fillGap(oFrom, oTo, nFrom, nTo) {
      const similar = [];
      let oi = oFrom;
      for (let j = nFrom; j < nTo; j++) {
        for (let i = oi; i < oTo && i < oi + LOOKAHEAD; i++) {
          const r = diffText(oldBlocks[i], newBlocks[j]);
          if (r.similarity >= SIMILAR) {
            similar.push({ i, j, changes: r.changes });
            oi = i + 1;
            break;
          }
        }
      }

      let o = oFrom;
      let n = nFrom;
      for (const m of [...similar, { i: oTo, j: nTo, changes: null }]) {
        let pairs = 0;
        while (o + pairs < m.i && n + pairs < m.j && sameKind(o + pairs, n + pairs)) pairs++;
        for (let k = 0; k < pairs; k++) {
          const oldText = oldBlocks[o + k];
          const newText = newBlocks[n + k];
          const r = diffText(oldText, newText);
          blocks[n + k] = {
            type: 'changed',
            changes:
              r.similarity >= SOMEWHAT
                ? r.changes
                : [
                    { type: 'delete', at: 0, text: oldText },
                    { type: 'insert', start: 0, end: newText.length }
                  ]
          };
        }
        for (let j = n + pairs; j < m.j; j++) blocks[j] = { type: 'added' };
        remove(m.j, oldBlocks.slice(o + pairs, m.i));
        if (m.changes?.length) blocks[m.j] = { type: 'changed', changes: m.changes };
        o = m.i + 1;
        n = m.j + 1;
      }
    }

    let prevI = -1;
    let prevJ = -1;
    for (const [pi, pj] of [...pairs, [oldBlocks.length, newBlocks.length]]) {
      fillGap(prevI + 1, pi, prevJ + 1, pj);
      prevI = pi;
      prevJ = pj;
    }

    return { blocks, removed };
  }

  RP.diff = { diffBlocks, diffText, matchPairs, tokenize };
})();
