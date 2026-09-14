#!/usr/bin/env node
/* redpen — HTML 原文の行番号を DOM に対応づける経路の検証
 *   node scripts/test-html.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }
  else { failed++; console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? '\n      ' + detail : ''}`); }
}
const section = (t) => console.log(`\n${t}`);

/* ---------- 準備 ---------- */

const source = fs
  .readFileSync(path.join(ROOT, 'examples/sample-report.html'), 'utf8')
  .replace(/\r\n?/g, '\n');
const sourceLines = source.split('\n');

// 対象ページそのものを表示している状態を作る（ブラウザと同じく原文からパースする）
const dom = new JSDOM(source, { url: 'file:///tmp/sample-report.html' });
const { window } = dom;
for (const key of ['window', 'document', 'Node', 'NodeFilter', 'Range', 'DOMParser', 'HTMLElement']) {
  globalThis[key] = window[key];
}
globalThis.crypto = require('crypto').webcrypto;
globalThis.CSS = window.CSS || { escape: (s) => String(s).replace(/["\\]/g, '\\$&') };

for (const f of [
  'src/lib/util.js',
  'src/lib/exporter.js',
  'src/content/anchor.js',
  'src/content/htmlsource.js'
]) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
}
const RP = globalThis.RedPen;

/** 原文の中で needle を含む行番号（1 始まり） */
function lineOf(needle) {
  return sourceLines.findIndex((l) => l.includes(needle)) + 1;
}

/* ---------- 原文への焼き込み ---------- */

section('原文の開始タグに行番号を差し込む');

const stamped = RP.htmlsource.stamp(
  '<!doctype html>\n<main>\n  <p>あ</p>\n  <p>い <b>う</b></p>\n</main>\n'
);
check('開始タグに行番号が入る', /<main data-rp-line="2" data-rp-col="0">/.test(stamped), stamped);
check('同じ行の入れ子も桁で区別できる',
  /<p data-rp-line="4" data-rp-col="2">/.test(stamped) &&
  /<b data-rp-line="4" data-rp-col="\d+">/.test(stamped), stamped);
check('doctype と終了タグは触らない',
  stamped.startsWith('<!doctype html>') && stamped.includes('</main>') &&
  !/<\/\w+ data-rp/.test(stamped), stamped);

const rawText = RP.htmlsource.stamp('<body>\n<script>var s = "<p>x</p>";</script>\n<p>本文</p>\n</body>');
check('script の中身は書き換えない', rawText.includes('var s = "<p>x</p>";'), rawText);
check('script の後も行が合っている', /<p data-rp-line="3"/.test(rawText), rawText);

const already = RP.htmlsource.stamp('<p data-rp-line="99" data-rp-col="99">x</p>');
check('原文に紛れ込んだ data-rp-line は捨てる',
  already === '<p data-rp-line="1" data-rp-col="0">x</p>', already);

const selfClosed = RP.htmlsource.stamp('<img src="a.png"/>');
check('自己終了タグでも属性を壊さない',
  selfClosed === '<img src="a.png" data-rp-line="1" data-rp-col="0"/>', selfClosed);

const gtInAttr = RP.htmlsource.stamp('<a title="a > b">x</a>\n<p>y</p>');
check('属性値の中の > をタグの終わりと誤らない', /<p data-rp-line="2"/.test(gtInAttr), gtInAttr);

/* ---------- 表示中の DOM への転写 ---------- */

section('表示中の DOM に行番号を写す');

const count = RP.htmlsource.apply(source);
check('要素に行番号が付く', count > 5, `stamped=${count}`);

const h1 = document.querySelector('h1');
check('h1 の行が原文と一致する',
  h1.getAttribute('data-rp-line') === String(lineOf('<h1>')),
  `${h1.getAttribute('data-rp-line')} / 原文 ${lineOf('<h1>')}`);

const code = document.querySelector('code');
check('インライン要素にも行が付く',
  code.getAttribute('data-rp-line') === String(lineOf('429 Too Many Requests')),
  code.getAttribute('data-rp-line'));

/* ---------- 選択範囲 → 行番号 ---------- */

section('選択範囲から原文の行番号を求める');

const root = document.querySelector('main');
const ctx = { root, mode: 'html', sourceLines };

/** 本文中の文字列を選択した Range を作る */
function selectText(needle) {
  const text = RP.anchor.fullText(root);
  const i = text.indexOf(needle);
  if (i < 0) throw new Error('本文に見つからない: ' + needle);
  return RP.anchor.rangeFromOffsets(root, i, i + needle.length);
}

const a = RP.anchor.create(selectText('トークンバケット方式'), ctx);
check('段落の行が取れる', a.startLine === lineOf('トークンバケット方式'),
  `L${a.startLine} / 原文 L${lineOf('トークンバケット方式')}`);
check('同じ行で終わる', a.endLine === a.startLine, `L${a.startLine}-L${a.endLine}`);

const inCode = RP.anchor.create(selectText('429 Too Many Requests'), ctx);
check('インライン要素の中でも段落と同じ行になる',
  inCode.startLine === lineOf('429 Too Many Requests'), `L${inCode.startLine}`);

const heading = RP.anchor.create(selectText('3. 留意点'), ctx);
check('見出しの行が取れる', heading.startLine === lineOf('3. 留意点'), `L${heading.startLine}`);

// 複数の段落をまたぐ選択
const wide = (() => {
  const text = RP.anchor.fullText(root);
  const from = text.indexOf('2. 方針');
  const to = text.indexOf('3. 留意点');
  return RP.anchor.create(RP.anchor.rangeFromOffsets(root, from, to), ctx);
})();
check('またいだ選択は行範囲になる',
  wide.startLine === lineOf('2. 方針') && wide.endLine >= lineOf('トークンバケット方式'),
  `L${wide.startLine}-L${wide.endLine}`);

check('書き出しの位置表記に行番号が入る',
  RP.exporter.lineLabel(wide) === `L${wide.startLine}-L${wide.endLine}`,
  RP.exporter.lineLabel(wide));

/* ---------- 原文が読めないとき ---------- */

section('原文が読めないとき');

const noLines = RP.anchor.create(selectText('トークンバケット方式'), {
  root,
  mode: 'html',
  sourceLines: null
});
check('行番号なしでもアンカーは作れる', noLines.startLine === null && Boolean(noLines.quote));
check('位置表記は見出しパスだけになる',
  RP.exporter.lineLabel(noLines) === '' && RP.exporter.headingLabel(noLines) !== '',
  RP.exporter.headingLabel(noLines));

/* ---------- 別の文書で試す ---------- */

/**
 * 原文から文書を組み立て、その文書のグローバルに差し替えて調べる。
 * anchor.js は現在の document を使うので、対象文書に合わせる必要がある。
 */
function withDocument(src, fn, mutate) {
  const d = new JSDOM(src, { url: 'file:///tmp/case.html' });
  if (mutate) mutate(d.window.document);
  d.window.document.__rpSource = src.split('\n');
  RP.htmlsource.apply(src, d.window.document);
  const saved = {
    document: globalThis.document,
    Node: globalThis.Node,
    NodeFilter: globalThis.NodeFilter
  };
  globalThis.document = d.window.document;
  globalThis.Node = d.window.Node;
  globalThis.NodeFilter = d.window.NodeFilter;
  try {
    const doc = d.window.document;
    const lines = (el, from, to) => {
      const r = doc.createRange();
      if (from == null) r.selectNodeContents(el);
      else {
        const text = RP.anchor.fullText(el);
        r.setStart(...pick(el, text.indexOf(from)));
        const at = to == null ? text.length : text.indexOf(to) + to.length;
        r.setEnd(...pick(el, at));
      }
      return RP.htmlsource.linesFor(r, { root: doc.body, mode: 'html', sourceLines: src.split('\n') });
    };
    const pick = (el, index) => {
      const r = RP.anchor.rangeFromOffsets(el, index, index);
      return [r.startContainer, r.startOffset];
    };
    return fn({ doc, lines });
  } finally {
    Object.assign(globalThis, saved);
  }
}

section('同じ文が繰り返される文書');

withDocument(
  ['<!doctype html>', '<html><body><main>', '<p>要確認</p>', '<p>間の段落</p>', '<p>要確認</p>',
   '</main></body></html>', ''].join('\n'),
  ({ doc, lines }) => {
    const ps = doc.querySelectorAll('p');
    check('1 つめの「要確認」は L3', lines(ps[0])?.start === 3, JSON.stringify(lines(ps[0])));
    check('2 つめの「要確認」は L5（文字列一致では区別できない）',
      lines(ps[2])?.start === 5, JSON.stringify(lines(ps[2])));
  }
);

section('段落が原文で複数行に折り返されている文書');

withDocument(
  ['<!doctype html>', '<html><body><main>', '<p>', '  一行目のあたり。', '  二行目のあたり。',
   '  三行目のあたり。', '</p>', '</main></body></html>', ''].join('\n'),
  ({ doc, lines }) => {
    const p = doc.querySelector('p');
    check('段落の途中を選ぶとその行になる', lines(p, '二行目')?.start === 5,
      JSON.stringify(lines(p, '二行目')));
    check('末尾の行も取れる', lines(p, '三行目')?.start === 6,
      JSON.stringify(lines(p, '三行目')));
    check('折り返しをまたぐ選択は行範囲になる',
      JSON.stringify(lines(p, '一行目', '三行目')) === JSON.stringify({ start: 4, end: 6 }),
      JSON.stringify(lines(p, '一行目', '三行目')));
  }
);

section('ブラウザが構造を補う文書');

withDocument(
  ['<!doctype html>', '<html><body><main>', '<p>閉じ忘れた段落', '<table>',
   '  <tr><td>あ</td><td>い</td></tr>', '  <tr><td>う</td><td>え</td></tr>', '</table>',
   '</main></body></html>', ''].join('\n'),
  ({ doc, lines }) => {
    // <tbody> はパーサが補うので原文には無い。同じパーサを使う限り木はずれない
    check('補われた tbody があっても行がずれない',
      lines(doc.querySelectorAll('td')[2])?.start === 6,
      JSON.stringify(lines(doc.querySelectorAll('td')[2])));
    check('閉じ忘れた段落でも行が取れる',
      lines(doc.querySelector('p'))?.start === 3,
      JSON.stringify(lines(doc.querySelector('p'))));
  }
);

section('原文に無い要素が混ざっている文書');

withDocument(
  ['<!doctype html>', '<html><head><title>t</title></head><body><main>', '<h1>見出し</h1>',
   '<p>ひとつめの段落</p>', '<p>ふたつめの段落</p>', '</main></body></html>', ''].join('\n'),
  ({ doc, lines }) => {
    check('差し込まれた要素の前後どちらも行が取れる',
      lines(doc.querySelector('h1'))?.start === 3 &&
      lines(doc.querySelectorAll('p')[1])?.start === 5,
      JSON.stringify([lines(doc.querySelector('h1')), lines(doc.querySelectorAll('p')[1])]));
  },
  (doc) => {
    // ページのスクリプトや他の拡張が足したもの。原文には無い
    doc.head.appendChild(doc.createElement('script'));
    doc.querySelector('main').insertBefore(
      doc.createElement('div'),
      doc.querySelectorAll('p')[1]
    );
  }
);

section('原文に style や script が挟まっている文書');

withDocument(
  ['<!doctype html>', '<html><body>', '<style>', '  p { color: red; }', '</style>',
   '直に置かれた本文', '</body></html>', ''].join('\n'),
  ({ doc, lines }) => {
    // 囲む要素が無いので body から数え始める。style の中身を本文と数えると行がずれる
    const text = [...doc.body.childNodes].find((n) => n.nodeValue?.includes('直に置かれた'));
    const r = doc.createRange();
    r.setStart(text, text.nodeValue.indexOf('直に'));
    r.setEnd(text, text.nodeValue.indexOf('直に') + 2);
    const got = RP.htmlsource.linesFor(r, {
      root: doc.body,
      mode: 'html',
      sourceLines: [...doc.__rpSource]
    });
    check('style の中身は本文として数えない', got?.start === 6, JSON.stringify(got));
  }
);

/* ---------- 結果 ---------- */

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
