#!/usr/bin/env node
/* redpen — dev/preview.html を丸ごと読み込み、
 * レンダリング・目次・レビューパネルが一式立ち上がることを確かめる。
 *   node scripts/test-smoke.js
 */
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const errors = [];

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }
  else { failed++; console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? '\n      ' + detail : ''}`); }
}

const virtualConsole = new (require('jsdom').VirtualConsole)();
virtualConsole.on('jsdomError', (e) => errors.push(e.message + (e.detail ? '\n' + e.detail : '')));
virtualConsole.on('error', (...args) => errors.push(args.join(' ')));

(async () => {
  const dom = await JSDOM.fromFile(path.join(ROOT, 'dev/preview.html'), {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole
  });
  const { window } = dom;
  await new Promise((r) => window.addEventListener('load', r, { once: true }));
  // app.start は非同期（storage 読み出し）なので落ち着くまで待つ
  await new Promise((r) => setTimeout(r, 400));

  const doc = window.document;

  console.log('\nページの起動');
  check('スクリプトが例外を出さない', errors.length === 0, errors.join('\n---\n').slice(0, 800));
  check('RedPen が読み込まれる', Boolean(window.RedPen));
  check('markdown-it / DOMPurify / hljs が揃う',
    Boolean(window.markdownit && window.DOMPurify && window.hljs));

  console.log('\n本文');
  const article = doc.getElementById('rp-doc');
  check('本文がレンダリングされる', article.querySelectorAll('h2').length >= 4);
  check('行番号が焼き込まれる', article.querySelectorAll('[data-rp-line]').length > 10);
  check('コードがハイライトされる', article.querySelector('pre .hljs-keyword') !== null);
  check('コードブロックに言語ラベル', article.querySelector('pre[data-lang="python"]') !== null);
  check('表が組まれる', article.querySelectorAll('table th').length === 4);

  console.log('\n目次');
  const nav = doc.querySelector('.rp-outline');
  check('目次が出る', nav !== null);
  check('見出しの数だけ項目がある',
    nav && nav.querySelectorAll('.rp-outline-link').length === article.querySelectorAll('h1,h2,h3,h4').length);
  check('本文に余白クラスが付く', doc.body.classList.contains('rp-has-outline'));
  check('現在位置が示される', nav && nav.querySelector('.rp-outline-link.is-active') !== null);

  console.log('\nレビューパネル');
  const host = doc.getElementById('redpen-root');
  check('パネルのホストが挿入される', host !== null);
  check('Shadow DOM に閉じている', Boolean(host && host.shadowRoot));
  const shadow = host?.shadowRoot;
  check('パネル本体がある', Boolean(shadow?.querySelector('.panel')));
  check('書き出しはコピーだけ', Boolean(shadow?.getElementById('copyBtn')) && !shadow?.getElementById('saveBtn'));
  check('状態で分けるタブは無い', shadow?.querySelector('.tab') === null);
  check('形式の選択肢が新しい', shadow?.getElementById('optStyle')?.value === 'quote',
    shadow?.getElementById('optStyle')?.innerHTML);
  check('空のときは案内が出る',
    shadow?.querySelector('.list .empty') !== null,
    shadow?.querySelector('.list')?.innerHTML?.slice(0, 200));
  check('パネルは文書のテキストに混ざらない',
    !window.RedPen.anchor.fullText(article).includes('全件削除'));

  console.log('\nコメントを 1 件付ける');
  const RP = window.RedPen;
  const text = RP.anchor.fullText(article);
  const needle = '本システムは常時オンラインであることを前提とする。';
  const i = text.indexOf(needle);
  const range = RP.anchor.rangeFromOffsets(article, i, i + needle.length);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);
  doc.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 60));
  check('選択すると起動ボタンが出る',
    shadow?.getElementById('launcher')?.classList.contains('show'),
    shadow?.getElementById('launcher')?.className);

  shadow.getElementById('launcher').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 60));
  check('入力欄が開く', shadow.getElementById('composer').classList.contains('show'));
  check('引用が入力欄に出る',
    shadow.getElementById('composerQuote').textContent.includes('常時オンライン'));

  shadow.getElementById('composerInput').value = 'オフライン時の挙動が未定義です。';
  shadow.getElementById('composerSave').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 200));

  check('本文がハイライトされる', article.querySelector('mark.rp-hl') !== null);
  check('一覧にカードが並ぶ', shadow.querySelectorAll('.list .card').length === 1);
  check('カードに行番号が出る',
    shadow.querySelector('.list .card .chip')?.textContent === 'L30',
    shadow.querySelector('.list .card')?.textContent?.slice(0, 80));
  check('件数が増える', shadow.getElementById('nAll').textContent === '1');
  check('カードの操作は編集と削除だけ',
    Array.from(shadow.querySelectorAll('.list .card .mini')).map((b) => b.dataset.action).join(',') === 'edit,delete');

  const stored = await window.chrome.storage.local.get('doc:' + 'file:///Users/example/reports/sample-report.md');
  const savedDoc = stored['doc:file:///Users/example/reports/sample-report.md'];
  check('保存される', savedDoc?.comments?.length === 1);
  check('書き出しが枠なしで出る',
    RP.exporter.build(savedDoc, {}) ===
      '## L30 — 3. 提案する仕様 > 3.2 前提条件\n\n> 本システムは常時オンラインであることを前提とする。\n\nオフライン時の挙動が未定義です。\n',
    JSON.stringify(RP.exporter.build(savedDoc, {})));

  console.log('\nコピー');
  const copied = [];
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async (t) => { copied.push(t); } }
  });
  const toastText = () => shadow.getElementById('toast').textContent;
  const optStyle = shadow.getElementById('optStyle');
  for (const [style, label] of [['quote', 'Markdown'], ['compact', 'Markdown'], ['json', 'JSON']]) {
    optStyle.value = style;
    shadow.getElementById('copyBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 60));
    check(`${style} は「${label} をコピーしました」と出る`, toastText() === `${label} をコピーしました`, toastText());
  }
  check('JSON を選ぶと JSON がコピーされる', (() => {
    try { return Array.isArray(JSON.parse(copied.at(-1))); } catch { return false; }
  })(), copied.at(-1)?.slice(0, 60));
  optStyle.value = 'quote';

  console.log('\n文書全体へのコメント');
  window.getSelection().removeAllRanges();
  const docCommentBtn = shadow.getElementById('docCommentBtn');
  check('範囲を選ばずに書くボタンがある', docCommentBtn !== null);
  docCommentBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 60));
  check('選択なしで入力欄が開く', shadow.getElementById('composer').classList.contains('show'));
  check('入力欄に対象が文書全体と出る',
    shadow.getElementById('composerQuote').textContent === '文書全体へのコメント',
    shadow.getElementById('composerQuote').textContent);

  shadow.getElementById('composerInput').value = '全体に結論を先に書いてください。';
  shadow.getElementById('composerSave').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 200));

  const cards = shadow.querySelectorAll('.list .card');
  check('一覧の先頭に並ぶ',
    cards.length === 2 && cards[0].querySelector('.chip')?.textContent === '文書全体',
    Array.from(cards).map((c) => c.textContent.slice(0, 30)).join(' | '));
  check('文書全体のカードに引用は出ない', cards[0].querySelector('.card-quote') === null);
  check('本文のハイライトは増えない',
    new Set(Array.from(article.querySelectorAll('mark.rp-hl')).map((m) => m.dataset.rpId)).size === 1);

  cards[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 60));
  check('カードを押しても「見つかりません」と言わない',
    !shadow.getElementById('toast').textContent.includes('見つかりません'),
    shadow.getElementById('toast').textContent);

  const stored2 = (await window.chrome.storage.local.get(
    'doc:file:///Users/example/reports/sample-report.md'))['doc:file:///Users/example/reports/sample-report.md'];
  check('アンカーなしで保存される',
    stored2?.comments?.length === 2 && stored2.comments.some((c) => c.anchor === null));
  check('書き出しの先頭に文書全体として出る',
    RP.exporter.build(stored2, {}).startsWith('## 文書全体\n\n全体に結論を先に書いてください。\n\n## L30'),
    JSON.stringify(RP.exporter.build(stored2, {}).slice(0, 80)));

  window.RedPen.session.repaint();
  check('開き直しても消えず、未検出にもならない',
    shadow.querySelectorAll('.list .card').length === 2 &&
      shadow.querySelectorAll('.list .card.missing').length === 0);

  console.log('\n未検出をまとめて削除する');
  const prune = shadow.getElementById('pruneBtn');
  check('未検出が無いうちはボタンが出ない', prune.hidden);
  // 指摘どおりに原文が直され、引用した文が消えた状態を作る
  const para = Array.from(article.querySelectorAll('p')).find((p) => p.textContent.includes(needle));
  para.textContent = 'オフライン時は変更を端末に保持し、復帰後に再送する。';
  window.RedPen.session.repaint();
  check('引用が消えたカードに未検出が付く',
    shadow.querySelectorAll('.list .card.missing').length === 1);
  check('件数つきでボタンが出る',
    !prune.hidden && prune.textContent === '未検出 1 件を削除', prune.textContent);

  prune.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 200));
  const remaining = shadow.querySelectorAll('.list .card');
  check('未検出のものだけ消える',
    remaining.length === 1 && remaining[0].querySelector('.chip.scope') !== null,
    Array.from(remaining).map((c) => c.textContent.slice(0, 30)).join(' | '));
  check('ボタンが引っ込む', prune.hidden);
  const stored3 = (await window.chrome.storage.local.get(
    'doc:file:///Users/example/reports/sample-report.md'))['doc:file:///Users/example/reports/sample-report.md'];
  check('保存からも消える', stored3?.comments?.length === 1 && stored3.comments[0].anchor === null);

  console.log('\nコメントを一括で削除する');
  const clearBtn = shadow.getElementById('clearBtn');
  check('件数があるとボタンが出る', clearBtn && !clearBtn.hidden);

  clearBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 60));
  check('1 回目は確認になる', clearBtn.textContent === '本当に全件削除？', clearBtn.textContent);
  check('1 回目では消えない', shadow.querySelectorAll('.list .card').length === 1);

  clearBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 200));
  check('一覧が空になる', shadow.querySelectorAll('.list .card').length === 0);
  check('本文のハイライトも消える', article.querySelector('mark.rp-hl') === null);
  check('件数の表示が 0 に戻る', shadow.getElementById('nAll').textContent === '0');
  check('ボタンが引っ込む', clearBtn.hidden);
  check('ラベルが元に戻る', clearBtn.textContent === '全件削除', clearBtn.textContent);

  const after = await window.chrome.storage.local.get(
    'doc:file:///Users/example/reports/sample-report.md');
  check('保存からも消える',
    after['doc:file:///Users/example/reports/sample-report.md'] === undefined,
    JSON.stringify(after).slice(0, 120));
  check('文書一覧からも外れる', (await RP.store.listDocs()).length === 0);

  console.log(`\n${passed} passed, ${failed} failed\n`);
  window.close();
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
