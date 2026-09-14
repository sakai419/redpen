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
  check('書き出しボタンがある', Boolean(shadow?.getElementById('copyBtn') && shadow?.getElementById('saveBtn')));
  check('形式の選択肢が新しい', shadow?.getElementById('optStyle')?.value === 'quote',
    shadow?.getElementById('optStyle')?.innerHTML);
  check('空のときは案内が出る',
    shadow?.querySelector('.list .empty') !== null,
    shadow?.querySelector('.list')?.innerHTML?.slice(0, 200));
  check('パネルは文書のテキストに混ざらない',
    !window.RedPen.anchor.fullText(article).includes('未対応'));

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
  check('未対応の件数が増える', shadow.getElementById('nOpen').textContent === '1');

  const stored = await window.chrome.storage.local.get('doc:' + 'file:///Users/example/reports/sample-report.md');
  const savedDoc = stored['doc:file:///Users/example/reports/sample-report.md'];
  check('保存される', savedDoc?.comments?.length === 1);
  check('書き出しが枠なしで出る',
    RP.exporter.build(savedDoc, {}) ===
      '## L30 — 3. 提案する仕様 > 3.2 前提条件\n\n> 本システムは常時オンラインであることを前提とする。\n\nオフライン時の挙動が未定義です。\n',
    JSON.stringify(RP.exporter.build(savedDoc, {})));

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
