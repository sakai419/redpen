#!/usr/bin/env node
/* redpen — DOM を伴うロジック（アンカー生成・再解決・ハイライト）の検証
 *   node scripts/test-dom.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'file:///tmp/sample-report.md' });
const { window } = dom;

// 拡張のコードはブラウザのグローバルを前提にしているので、そのまま流し込む
for (const key of [
  'window', 'document', 'Node', 'NodeFilter', 'Range', 'CSS', 'getSelection', 'HTMLElement'
]) {
  globalThis[key] = window[key] !== undefined ? window[key] : window[key.toLowerCase()];
}
globalThis.window = window;
globalThis.document = window.document;
globalThis.crypto = require('crypto').webcrypto;
// jsdom には CSS.escape が無いので、Chrome と同じ挙動になる範囲で補う
globalThis.CSS = window.CSS || { escape: (s) => String(s).replace(/["\\]/g, '\\$&') };
globalThis.markdownit = require(path.join(ROOT, 'src/vendor/markdown-it.min.js'));
globalThis.hljs = require(path.join(ROOT, 'src/vendor/highlight.min.js'));
globalThis.DOMPurify = require(path.join(ROOT, 'src/vendor/purify.min.js'))(window);

for (const f of [
  'src/lib/util.js',
  'src/lib/exporter.js',
  'src/content/markdown.js',
  'src/content/outline.js',
  'src/content/anchor.js',
  'src/content/marks.js'
]) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
}
const RP = globalThis.RedPen;

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }
  else { failed++; console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? '\n      ' + detail : ''}`); }
}
const section = (t) => console.log(`\n${t}`);

/* ---------- 準備 ---------- */

const source = fs.readFileSync(path.join(ROOT, 'examples/sample-report.md'), 'utf8');
const article = document.createElement('article');
document.body.appendChild(article);
const sourceLines = RP.markdown.render(source, article);
const ctx = { root: article, mode: 'markdown', sourceLines };

/** 本文中の文字列を選択した Range を作る */
function selectText(needle) {
  const text = RP.anchor.fullText(article);
  const idx = text.indexOf(needle);
  if (idx === -1) throw new Error('本文に見つからない: ' + needle);
  return RP.anchor.rangeFromOffsets(article, idx, idx + needle.length);
}

section('レンダリング');
check('本文がレンダリングされる', article.querySelectorAll('h1,h2,h3,p').length > 8);
check('data-rp-line が DOM に残る', article.querySelectorAll('[data-rp-line]').length > 10);
check('DOMPurify が data-rp-line を落とさない',
  article.querySelector('h1')?.hasAttribute('data-rp-line'),
  article.querySelector('h1')?.outerHTML);
check('表が描画される', article.querySelectorAll('table td').length > 0);
check('コードブロックの pre に行番号が付く',
  article.querySelector('pre[data-rp-line]') !== null,
  article.querySelector('pre')?.outerHTML?.slice(0, 120));
check('コードブロックに言語ラベルが付く',
  article.querySelector('pre[data-lang="python"]') !== null,
  article.querySelector('pre')?.outerHTML?.slice(0, 160));
check('シンタックスハイライトが当たる',
  article.querySelector('pre .hljs-keyword') !== null,
  article.querySelector('pre code')?.innerHTML?.slice(0, 160));
check('ハイライトしてもコード本文は変わらない',
  article.querySelector('pre').textContent.includes('db.insert(row)'));

section('outline');
const outline = RP.outline.create(article, { anchorTo: article.parentElement, mode: 'markdown' });
check('目次が作られる', outline !== null);
check('見出しが列挙される',
  outline && outline.nav.querySelectorAll('.rp-outline-link').length === article.querySelectorAll('h1,h2,h3,h4').length,
  outline && String(outline.nav.querySelectorAll('.rp-outline-link').length));
check('見出しに id が振られる',
  [...article.querySelectorAll('h1,h2,h3,h4')].every((h) => h.id));
check('目次リンクが見出しを指す',
  outline && [...outline.nav.querySelectorAll('.rp-outline-link')].every((a) => article.querySelector(a.getAttribute('href'))));
check('見出しの階層がクラスに出る',
  outline && outline.nav.querySelector('.rp-lv3') !== null);
check('目次は本文テキストに混ざらない',
  !RP.anchor.fullText(article).includes('目次'));

/* ---------- アンカー生成 ---------- */

section('anchor.create');

const QUOTE = '本システムは常時オンラインであることを前提とする。';
const range1 = selectText(QUOTE);
const anchor1 = RP.anchor.create(range1, ctx);

const expectedLine = sourceLines.findIndex((l) => l.includes('本システムは常時オンライン')) + 1;
check('引用文字列が保存される', anchor1.quote === QUOTE, anchor1.quote);
check(`原文の行番号を特定する (L${expectedLine})`, anchor1.startLine === expectedLine,
  `got L${anchor1.startLine}-L${anchor1.endLine}`);
check('見出しパスを持つ',
  JSON.stringify(anchor1.headingPath) === JSON.stringify(['3. 提案する仕様', '3.2 前提条件']),
  JSON.stringify(anchor1.headingPath));
check('前後の文脈を保存する', anchor1.suffix.length > 0 && anchor1.prefix.length >= 0);

// 見出しの中を選択
const h3Range = selectText('3.2 前提条件');
const h3Anchor = RP.anchor.create(h3Range, ctx);
const h3Line = sourceLines.findIndex((l) => l.startsWith('### 3.2')) + 1;
check(`見出しの行番号を特定する (L${h3Line})`, h3Anchor.startLine === h3Line, `got L${h3Anchor.startLine}`);

// 表のセル
const cellRange = selectText('重複チェックあり');
const cellAnchor = RP.anchor.create(cellRange, ctx);
const cellLine = sourceLines.findIndex((l) => l.includes('重複チェックあり')) + 1;
check(`表のセルの行番号を特定する (L${cellLine})`, cellAnchor.startLine === cellLine, `got L${cellAnchor.startLine}`);

// 太字を含む段落（記法があってもズレないか）
const boldSource = '# 見出し\n\n通常の文と **強調された語** を含む段落です。\n';
const boldArticle = document.createElement('article');
document.body.appendChild(boldArticle);
const boldLines = RP.markdown.render(boldSource, boldArticle);
const boldCtx = { root: boldArticle, mode: 'markdown', sourceLines: boldLines };
const boldText = RP.anchor.fullText(boldArticle);
const bIdx = boldText.indexOf('強調された語');
const boldRange = RP.anchor.rangeFromOffsets(boldArticle, bIdx, bIdx + '強調された語'.length);
const boldAnchor = RP.anchor.create(boldRange, boldCtx);
check('装飾記法を含む行でも行番号が合う', boldAnchor.startLine === 3, `got L${boldAnchor.startLine}`);

// 複数ブロックにまたがる選択
const multiText = RP.anchor.fullText(article);
const s = multiText.indexOf('新規顧客のデータ移行');
const e = multiText.indexOf('サポート工数の 3 割') + 5;
const multiRange = RP.anchor.rangeFromOffsets(article, s, e);
const multiAnchor = RP.anchor.create(multiRange, ctx);
check('複数ブロックの選択で行範囲が広がる',
  multiAnchor.endLine > multiAnchor.startLine,
  `L${multiAnchor.startLine}-L${multiAnchor.endLine}`);

/* ---------- ハイライト ---------- */

section('highlight');
const marks = RP.marks.apply(article, selectText(QUOTE), 'c1');
check('mark 要素が挿入される', marks.length >= 1);
check('mark に id が入る', marks[0].dataset.rpId === 'c1');
check('ハイライトしても本文テキストは変わらない',
  RP.anchor.fullText(article).includes(QUOTE));
check('marksOf で引ける', RP.marks.marksOf(article, 'c1').length === marks.length);

// 重なるハイライト
const overlap = RP.marks.apply(article, selectText('常時オンライン'), 'c2');
check('重なる範囲にもハイライトできる', overlap.length >= 1);
check('本文テキストは依然として変わらない', RP.anchor.fullText(article).includes(QUOTE));

RP.marks.remove(article, 'c2');
check('ハイライトを外せる', RP.marks.marksOf(article, 'c2').length === 0);
check('外した後も本文が壊れない', RP.anchor.fullText(article).includes(QUOTE));

RP.marks.removeAll(article);
check('すべて外せる', article.querySelectorAll('mark.rp-hl').length === 0);

/* ---------- 再解決 ---------- */

section('anchor.resolve');

const resolved = RP.anchor.resolve(anchor1, ctx);
check('同じ文書なら元の位置に戻せる', resolved?.toString() === QUOTE, resolved?.toString());

// 文書の前方に段落が挿入された（＝オフセットがずれた）状況
const shiftedSource = '# 追記された前書き\n\nここに新しい段落が入った。\n\n' + source;
const shiftedArticle = document.createElement('article');
document.body.appendChild(shiftedArticle);
const shiftedLines = RP.markdown.render(shiftedSource, shiftedArticle);
const shiftedCtx = { root: shiftedArticle, mode: 'markdown', sourceLines: shiftedLines };
const reResolved = RP.anchor.resolve(anchor1, shiftedCtx);
check('前方に加筆されても引用文字列で追従する',
  reResolved?.toString() === QUOTE, reResolved?.toString());

// 指摘どおり修正されて該当箇所が消えた状況
const fixedSource = source.replace(QUOTE, 'オフライン時はローカルに退避し、復帰時に再送する。');
const fixedArticle = document.createElement('article');
document.body.appendChild(fixedArticle);
const fixedLines = RP.markdown.render(fixedSource, fixedArticle);
const fixedCtx = { root: fixedArticle, mode: 'markdown', sourceLines: fixedLines };
check('修正済みの箇所は見つからない（missing 判定できる）',
  RP.anchor.resolve(anchor1, fixedCtx) === null);

// 同じ語が複数回出るとき、文脈が近いほうを選ぶ
const dupSource = '# 見出し\n\nAAA 対象 BBB\n\nCCC 対象 DDD\n';
const dupArticle = document.createElement('article');
document.body.appendChild(dupArticle);
const dupLines = RP.markdown.render(dupSource, dupArticle);
const dupCtx = { root: dupArticle, mode: 'markdown', sourceLines: dupLines };
const dupText = RP.anchor.fullText(dupArticle);
const secondIdx = dupText.indexOf('対象', dupText.indexOf('対象') + 1);
const dupRange = RP.anchor.rangeFromOffsets(dupArticle, secondIdx, secondIdx + 2);
const dupAnchor = RP.anchor.create(dupRange, dupCtx);
check('2 つ目の「対象」の行を特定する', dupAnchor.startLine === 5, `got L${dupAnchor.startLine}`);
const dupResolved = RP.anchor.resolve(dupAnchor, dupCtx);
check('同じ語が複数あっても文脈で 2 つ目に戻る',
  dupResolved && RP.anchor.offsetOf(dupArticle, dupResolved.startContainer, dupResolved.startOffset) === secondIdx);

/* ---------- HTML モード ---------- */

section('HTML モード');
const htmlSource = fs.readFileSync(path.join(ROOT, 'examples/sample-report.html'), 'utf8');
const htmlDom = new JSDOM(htmlSource, { url: 'file:///tmp/sample-report.html' });
const htmlRoot = htmlDom.window.document.querySelector('main');
// jsdom のドキュメントを差し替えて同じ API を使う
globalThis.document = htmlDom.window.document;
globalThis.window = htmlDom.window;
const htmlCtx = { root: htmlRoot, mode: 'html', sourceLines: null };
const htmlText = RP.anchor.fullText(htmlRoot);
const hNeedle = 'レート制限のカウンタはアプリケーションのメモリ上に保持する。';
const hIdx = htmlText.indexOf(hNeedle);
const htmlRange = RP.anchor.rangeFromOffsets(htmlRoot, hIdx, hIdx + hNeedle.length);
const htmlAnchor = RP.anchor.create(htmlRange, htmlCtx);
check('HTML でも引用を保存する', htmlAnchor.quote === hNeedle);
check('HTML では行番号を持たない', htmlAnchor.startLine === null);
check('HTML でも見出しパスを取れる',
  JSON.stringify(htmlAnchor.headingPath) === JSON.stringify(['3. 留意点']),
  JSON.stringify(htmlAnchor.headingPath));
check('HTML でも再解決できる',
  RP.anchor.resolve(htmlAnchor, htmlCtx)?.toString() === hNeedle);

const htmlDoc = {
  title: 'sample-report.html', path: '/tmp/sample-report.html', mode: 'html',
  comments: [{ id: 'x', body: '単一サーバー前提になっています。', createdAt: 1, anchor: htmlAnchor }]
};
const htmlMd = RP.exporter.build(htmlDoc, {});
check('HTML の書き出しは見出しで位置を示す', htmlMd.startsWith('## 3. 留意点'), htmlMd);
check('HTML の書き出しにも枠が付かない',
  !htmlMd.includes('レビューコメント') && !htmlMd.includes('---'), htmlMd);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
