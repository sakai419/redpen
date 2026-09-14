/* redpen — HTML 原文の行番号を、表示中の DOM に対応づける
 *
 * Markdown は markdown-it の token.map から行範囲が取れるが、HTML には
 * それに当たるものが無い。DOM は「パース済みの木」であって、原文の
 * どこから来たかという情報を一切持たない。
 *
 * そこで原文をもう一度読み直し、開始タグに data-rp-line / data-rp-col を
 * 差し込んだうえで DOMParser に食わせる。ブラウザ本体と同じパーサなので、
 * 閉じ忘れた <p> や省略された <tbody> といった補正まで同じ形で入る。
 * あとは二つの木を突き合わせて、行番号を表示中の要素に写すだけ。
 *
 * 文字列一致ではなく木の位置で対応づけるので、同じ文章が何度も出てくる
 * 文書でも取り違えない。ページ側のスクリプトが差し込んだ要素のように
 * 原文に無いものは、階層ごとの対応づけで読み飛ばす。
 */
(function () {
  'use strict';
  const RP = (globalThis.RedPen = globalThis.RedPen || {});

  /** 中身をマークアップとして読まない要素。原文では終了タグまで素通しする */
  const RAW_TEXT = new Set([
    'script', 'style', 'textarea', 'title', 'xmp', 'noembed', 'noframes', 'plaintext'
  ]);

  /** redpen 自身が差し込んだ UI。原文には無いので突き合わせから外す */
  const OURS = '#redpen-root, .rp-ui, [data-rp-ignore]';

  /** 階層の対応づけで総当たりを諦める大きさ */
  const PAIR_LIMIT = 250000;

  /* ---------- タグの走査 ---------- */

  /** 属性値の中の '>' を数えないようにタグの終端（'>' の位置）を探す */
  function tagEnd(src, from) {
    let quote = null;
    for (let i = from; i < src.length; i++) {
      const ch = src[i];
      if (quote) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === '>') {
        return i;
      }
    }
    return src.length - 1;
  }

  function closeTagIndex(src, name, from) {
    const re = new RegExp('</' + name + '[\\s>/]', 'i');
    const m = re.exec(src.slice(from));
    return m ? from + m.index : src.length;
  }

  /** src[i] が '<' のとき、そのタグの名前と種類を返す */
  function tagAt(src, i) {
    const m = /^<(\/?)([a-zA-Z][^\s/>]*)/.exec(src.slice(i, i + 80));
    if (!m) return null;
    const end = tagEnd(src, i + m[0].length);
    return {
      name: m[2].toLowerCase(),
      closing: m[1] === '/',
      selfClosing: src[end - 1] === '/',
      end
    };
  }

  /* ---------- 原文に行番号を差し込む ---------- */

  /** 開始タグに行番号と桁を書き足す。既に付いていたものは捨てる（先勝ちで無視されるため） */
  function inject(tagText, line, col) {
    const cleaned = tagText.replace(/\s+data-rp-(?:line|col)="[^"]*"/gi, '');
    const at = cleaned.length - (/\/>$/.test(cleaned) ? 2 : 1);
    return (
      cleaned.slice(0, at) + ` data-rp-line="${line}" data-rp-col="${col}"` + cleaned.slice(at)
    );
  }

  /**
   * 原文の開始タグすべてに data-rp-line / data-rp-col を差し込む。
   * 改行は LF に正規化済みの文字列を渡すこと（行の数え方が split('\n') と揃う）。
   */
  function stamp(src) {
    const out = [];
    let i = 0;
    let line = 1;
    let lineStart = 0;

    /** src[i, to) をそのまま出しつつ行を数える */
    const pass = (to) => {
      out.push(src.slice(i, to));
      count(to);
    };
    /** 出力はせず、src[i, to) のぶんだけ行を数え進める */
    const count = (to) => {
      for (let p = src.indexOf('\n', i); p !== -1 && p < to; p = src.indexOf('\n', p + 1)) {
        line++;
        lineStart = p + 1;
      }
      i = to;
    };

    while (i < src.length) {
      const lt = src.indexOf('<', i);
      if (lt === -1) {
        pass(src.length);
        break;
      }
      pass(lt);

      if (src.startsWith('<!--', lt)) {
        const end = src.indexOf('-->', lt);
        pass(end === -1 ? src.length : end + 3);
        continue;
      }
      // <!doctype ...> / </p> / <?xml ...> / 単独の '<' は素通し
      const tag = tagAt(src, lt);
      if (!tag || tag.closing) {
        pass(lt + 1);
        continue;
      }

      out.push(inject(src.slice(lt, tag.end + 1), line, lt - lineStart));
      count(tag.end + 1);

      if (RAW_TEXT.has(tag.name) && !tag.selfClosing) {
        pass(closeTagIndex(src, tag.name, i));
      }
    }
    return out.join('');
  }

  /* ---------- 表示中の DOM に写す ---------- */

  function children(el) {
    const out = [];
    for (const c of el.children) if (!c.matches?.(OURS)) out.push(c);
    return out;
  }

  /**
   * 同じ階層の要素を突き合わせる。
   * 片方にしか無い要素（ページのスクリプトが足した script や、
   * 逆に消された要素）があっても、最長共通部分列で前後を拾い直す。
   */
  function pairs(live, ghost) {
    const n = live.length;
    const m = ghost.length;
    if (n === 0 || m === 0) return [];

    // ほとんどの場合はそのまま並ぶ
    if (n === m && live.every((el, k) => el.tagName === ghost[k].tagName)) {
      return live.map((el, k) => [el, ghost[k]]);
    }
    // 巨大な階層では総当たりを避け、頭から一致するところまでで打ち切る
    if (n * m > PAIR_LIMIT) {
      const out = [];
      for (let k = 0; k < Math.min(n, m) && live[k].tagName === ghost[k].tagName; k++) {
        out.push([live[k], ghost[k]]);
      }
      return out;
    }

    const w = m + 1;
    const dp = new Uint32Array((n + 1) * w);
    for (let a = n - 1; a >= 0; a--) {
      for (let b = m - 1; b >= 0; b--) {
        const at = a * w + b;
        dp[at] =
          live[a].tagName === ghost[b].tagName
            ? dp[at + w + 1] + 1
            : Math.max(dp[at + w], dp[at + 1]);
      }
    }
    const out = [];
    let a = 0;
    let b = 0;
    while (a < n && b < m) {
      if (live[a].tagName === ghost[b].tagName) {
        out.push([live[a], ghost[b]]);
        a++;
        b++;
      } else if (dp[(a + 1) * w + b] >= dp[a * w + b + 1]) {
        a++;
      } else {
        b++;
      }
    }
    return out;
  }

  /**
   * 原文から行番号を焼き込んだ影の文書を作り、表示中の文書に写す。
   * @returns {number} 行番号を付けられた要素の数（0 なら失敗）
   */
  function apply(src, doc = document) {
    const live = doc.documentElement;
    if (!live) return 0;

    let shadow;
    try {
      shadow = new DOMParser().parseFromString(stamp(src), 'text/html');
    } catch {
      return 0;
    }
    const ghost = shadow.documentElement;
    if (!ghost || ghost.tagName !== live.tagName) return 0;

    let stamped = 0;
    const queue = [[live, ghost]];
    while (queue.length > 0) {
      const [x, y] = queue.pop();
      const line = y.getAttribute('data-rp-line');
      if (line) {
        x.setAttribute('data-rp-line', line);
        x.setAttribute('data-rp-col', y.getAttribute('data-rp-col') || '0');
        stamped++;
      }
      for (const pair of pairs(children(x), children(y))) queue.push(pair);
    }
    return stamped;
  }

  /* ---------- 選択範囲 → 原文の行 ---------- */

  /** 非空白文字の数。HTML の空白の畳まれ方に左右されずに位置を数えるための単位 */
  function countInk(text) {
    let n = 0;
    for (let i = 0; i < text.length; i++) if (/\S/.test(text[i])) n++;
    return n;
  }

  /** 行番号を引くための索引。同じ sourceLines なら作り直さない */
  function indexOf(ctx) {
    if (ctx.__rpIndex?.lines === ctx.sourceLines) return ctx.__rpIndex;
    const text = ctx.sourceLines.join('\n');
    const starts = [0];
    for (let i = text.indexOf('\n'); i !== -1; i = text.indexOf('\n', i + 1)) starts.push(i + 1);
    const index = { lines: ctx.sourceLines, text, starts };
    try {
      ctx.__rpIndex = index;
    } catch {
      /* 凍結されたオブジェクトなら毎回作り直す */
    }
    return index;
  }

  function lineAt(starts, at) {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= at) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  }

  /**
   * 原文の from 文字目から数え始めて、want 番目の非空白文字がある行を返す。
   * タグは数えず、実体参照は 1 文字として数え、script / style の中身は飛ばす。
   */
  function lineOfInk(index, from, want) {
    const { text, starts } = index;
    let ink = 0;
    let i = Math.max(0, Math.min(from, text.length));
    let last = i;

    while (i < text.length) {
      const ch = text[i];
      if (ch === '<') {
        const tag = tagAt(text, i);
        if (!tag) {
          i++;
          continue;
        }
        i =
          !tag.closing && !tag.selfClosing && RAW_TEXT.has(tag.name)
            ? closeTagIndex(text, tag.name, tag.end + 1)
            : tag.end + 1;
        continue;
      }
      if (!/\S/.test(ch)) {
        i++;
        continue;
      }
      if (ink === want) return lineAt(starts, i);
      if (ch === '&') {
        const semi = text.indexOf(';', i);
        i = semi !== -1 && semi - i <= 10 ? semi + 1 : i + 1;
      } else {
        i++;
      }
      ink++;
      last = i - 1;
    }
    return lineAt(starts, last);
  }

  function positionOf(el) {
    const line = parseInt(el?.getAttribute('data-rp-line') || '', 10);
    if (!Number.isFinite(line)) return null;
    const col = parseInt(el.getAttribute('data-rp-col') || '0', 10);
    return { line, col: Number.isFinite(col) ? col : 0 };
  }

  /**
   * 選択範囲を原文の行範囲に写す。
   *
   * 起点は「選択の開始位置を含む最も内側の要素」の原文位置。そこから
   * 非空白文字を数えて選択の頭と末尾に届いた行を求める。位置を数えて
   * いるだけなので、同じ文章が繰り返される文書でも取り違えない。
   *
   * @returns {{start: number, end: number}|null}
   */
  function linesFor(range, ctx) {
    const sourceLines = ctx?.sourceLines;
    if (!sourceLines || sourceLines.length === 0) return null;
    const node = range.startContainer;
    const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    const block = el?.closest('[data-rp-line]');
    const pos = positionOf(block);
    if (!pos) return null;

    const index = indexOf(ctx);
    const from = (index.starts[pos.line - 1] ?? 0) + pos.col;
    const anchor = RP.anchor;
    const head = countInk(
      anchor.fullText(block).slice(0, anchor.offsetOf(block, node, range.startOffset))
    );
    const ink = countInk(range.toString());

    const start = lineOfInk(index, from, head);
    const end = ink > 1 ? lineOfInk(index, from, head + ink - 1) : start;
    return { start, end: Math.max(start, end) };
  }

  /* ---------- 原文の取得 ---------- */

  /** file:// は content script から直接 fetch できないので service worker に頼む */
  async function fetchSource(url) {
    const res = await chrome.runtime.sendMessage({ type: 'rp-fetch-source', url });
    if (!res?.ok) throw new Error(res?.error || '応答がありません');
    return res.text;
  }

  /**
   * 原文を読み直して行番号を焼き込む。
   * 読めない・木がまるで違うなどで対応づけられなければ null を返し、
   * 呼び出し側は行番号なし（見出しパスだけ）で動き続ける。
   *
   * @returns {Promise<string[]|null>} 原文を行に分割した配列
   */
  async function load(url = location.href) {
    let src;
    try {
      src = await fetchSource(url);
    } catch {
      return null;
    }
    if (!src || !src.trim()) return null;
    src = src.replace(/\r\n?/g, '\n');
    return apply(src) > 0 ? src.split('\n') : null;
  }

  RP.htmlsource = { stamp, apply, linesFor, load };
})();
