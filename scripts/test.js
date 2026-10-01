#!/usr/bin/env node
/* redpen — DOM を必要としないロジックの検証
 *   node scripts/test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
globalThis.markdownit = require(path.join(ROOT, 'src/vendor/markdown-it.min.js'));
globalThis.crypto = require('crypto').webcrypto;

for (const f of [
  'src/lib/util.js',
  'src/lib/exporter.js',
  'src/content/markdown.js',
  'src/content/anchor.js'
]) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
}
const RP = globalThis.RedPen;

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? '\n      ' + detail : ''}`);
  }
}
function section(title) {
  console.log(`\n${title}`);
}

/* ---------- 行番号の焼き込み ---------- */

section('Markdown → data-rp-line');
const source = fs.readFileSync(path.join(ROOT, 'examples/sample-report.md'), 'utf8');
const lines = source.split('\n');
const html = RP.markdown.createRenderer().render(source);

const attrs = [...html.matchAll(/<(\w+)[^>]*data-rp-line="(\d+),(\d+)"/g)].map((m) => ({
  tag: m[1],
  start: Number(m[2]),
  end: Number(m[3])
}));

check('ブロック要素に行範囲が付く', attrs.length > 10, `見つかった数: ${attrs.length}`);
check(
  '行番号が原文の範囲に収まる',
  attrs.every((a) => a.start >= 1 && a.end <= lines.length && a.start <= a.end),
  JSON.stringify(attrs.filter((a) => a.start < 1 || a.end > lines.length || a.start > a.end))
);

const h1 = attrs.find((a) => a.tag === 'h1');
check('h1 は 1 行目を指す', h1 && h1.start === 1, JSON.stringify(h1));

// 「### 3.2 前提条件」の実際の行番号と、生成された h3 の行番号が一致するか
const idx32 = lines.findIndex((l) => l.startsWith('### 3.2'));
const h3s = attrs.filter((a) => a.tag === 'h3');
check(
  '見出し 3.2 の行番号が原文と一致する',
  h3s.some((a) => a.start === idx32 + 1),
  `原文 L${idx32 + 1} / 生成 ${JSON.stringify(h3s.map((a) => a.start))}`
);

// コードブロックの行範囲
const preIdx = lines.findIndex((l) => l.startsWith('```python'));
const pres = attrs.filter((a) => a.tag === 'pre');
check(
  'コードブロックの開始行が一致する',
  pres.some((a) => a.start === preIdx + 1),
  `原文 L${preIdx + 1} / 生成 ${JSON.stringify(pres.map((a) => a.start))}`
);

// 表
const tables = attrs.filter((a) => a.tag === 'table');
check('表にも行範囲が付く', tables.length === 1, JSON.stringify(tables));

/* ---------- Markdown 記法の除去 ---------- */

section('anchor.stripMarkdown');
const cases = [
  ['## 3.2 前提条件', '3.2 前提条件'],
  ['- **重要** な項目', '重要 な項目'],
  ['[リンク](https://example.com) を参照', 'リンク を参照'],
  ['`code` と ~~取り消し~~', 'code と 取り消し'],
  ['> 引用文', '引用文'],
  ['1. 番号付き', '番号付き']
];
for (const [input, expected] of cases) {
  const got = RP.anchor.stripMarkdown(input);
  check(`"${input}" → "${expected}"`, got === expected, `got: "${got}"`);
}

/* ---------- エクスポート ---------- */

section('exporter.build');
const doc = {
  key: 'file:///tmp/sample-report.md',
  title: 'sample-report.md',
  path: '/tmp/sample-report.md',
  mode: 'markdown',
  comments: [
    {
      id: 'b',
      body: '年間 1,200 万円の根拠が示されていません。積算を追記してください。',
      createdAt: 2,
      updatedAt: 2,
      anchor: {
        quote: '導入により、データ移行にかかる工数は 3 分の 1 になる。年間で約 1,200 万円のコスト削減が見込まれる。',
        startLine: 48,
        endLine: 48,
        headingPath: ['4. 期待効果'],
        missing: false
      }
    },
    {
      id: 'a',
      body: 'オフライン時の挙動が未定義です。フォールバック仕様を追記してください。',
      createdAt: 1,
      updatedAt: 1,
      anchor: {
        quote: '本システムは常時オンラインであることを前提とする。',
        startLine: 38,
        endLine: 39,
        headingPath: ['3. 提案する仕様', '3.2 前提条件'],
        missing: false
      }
    },
    {
      // 「対応済み」があった頃に保存されたコメント
      id: 'c',
      body: '以前は対応済みにしていた指摘。',
      status: 'resolved',
      createdAt: 3,
      updatedAt: 3,
      anchor: { quote: '早期の実装を推奨する。', startLine: 52, endLine: 52, headingPath: ['5. まとめ'] }
    }
  ]
};

const md = RP.exporter.build(doc, {});

// 出力に含めてはいけないもの（指示の書き方はユーザーが決める）
for (const noise of ['レビューコメント', '出力日時', '対象:', '指摘:', '## 依頼', '該当箇所', '**指摘**', '---']) {
  check(`余計な枠 "${noise}" を付けない`, !md.includes(noise), md.slice(0, 240));
}
check('先頭がいきなり位置見出しで始まる', md.startsWith('## L38-L39 — 3. 提案する仕様 > 3.2 前提条件'), JSON.stringify(md.slice(0, 60)));
check('引用とコメントだけが並ぶ',
  md.includes('> 本システムは常時オンラインであることを前提とする。') &&
  md.includes('オフライン時の挙動が未定義です。'), md);
check('行番号順に並ぶ', md.indexOf('L38-L39') < md.indexOf('L48'));
check('以前の「対応済み」もふつうのコメントとして出る', md.includes('以前は対応済みにしていた指摘。'), md);

section('引用の切り詰め');
check('40 文字までは丸ごと出る',
  RP.exporter.trimQuote('あ'.repeat(40)) === 'あ'.repeat(40));
const long = RP.exporter.trimQuote('あ'.repeat(200));
check('長い選択は頭だけ残る', long === 'あ'.repeat(40) + ' …', `${long.length}: ${long}`);
check('上限内の最後の文末まで残す',
  RP.exporter.trimQuote('一つ目の文です。二つ目の文はここから始まって、ずっと続いていきます。三つ目もあります。')
    === '一つ目の文です。二つ目の文はここから始まって、ずっと続いていきます。 …',
  RP.exporter.trimQuote('一つ目の文です。二つ目の文はここから始まって、ずっと続いていきます。三つ目もあります。'));
check('文末が早すぎるときは字数で切る',
  RP.exporter.trimQuote('短。' + 'あ'.repeat(100)) === '短。' + 'あ'.repeat(38) + ' …',
  RP.exporter.trimQuote('短。' + 'あ'.repeat(100)));
check('改行は 1 行に畳まれる',
  RP.exporter.trimQuote('一行目\n二行目') === '一行目 二行目',
  RP.exporter.trimQuote('一行目\n二行目'));
check('長い引用は本文にも短縮された形で出る',
  md.includes(' …') && !md.includes('年間で約 1,200 万円のコスト削減が見込まれる。'),
  md);

section('形式');
const compact = RP.exporter.build(doc, { style: 'compact' });
check('1 行ずつの形式', compact.startsWith('- L38-L39 — 3. 提案する仕様 > 3.2 前提条件 「'), compact);
check('1 行ずつでもコメントが載る', compact.includes('— オフライン時の挙動が未定義です。'), compact);

const json = JSON.parse(RP.exporter.build(doc, { style: 'json' }));
check('JSON は 3 件', json.length === 3);
check('JSON に状態の項目は無い', json.every((c) => !('status' in c)), JSON.stringify(json[2]));
check('JSON に行番号が入る', json[0].startLine === 38);
check('JSON の引用は切り詰めない',
  json[1].quote.endsWith('コスト削減が見込まれる。'), json[1].quote);
check('JSON にコメント本文が入る', json[0].comment.startsWith('オフライン時'));

check('コメントが無ければ空文字を返す',
  RP.exporter.build({ ...doc, comments: [] }, {}) === '');


section('文書全体へのコメント');
const withWhole = {
  ...doc,
  comments: [
    ...doc.comments,
    { id: 'w2', body: '結論を冒頭に移してください。', createdAt: 5, updatedAt: 5, anchor: null },
    { id: 'w1', body: '全体に敬体で統一してください。', createdAt: 4, updatedAt: 4, anchor: null }
  ]
};
const wholeMd = RP.exporter.build(withWhole, {});
check('文書全体へのコメントが先頭に来る',
  wholeMd.startsWith('## 文書全体\n\n全体に敬体で統一してください。\n\n## 文書全体\n\n結論を冒頭に移してください。\n\n## L38-L39'),
  JSON.stringify(wholeMd.slice(0, 120)));
check('文書全体へのコメントには引用が付かない',
  !/## 文書全体\n\n>/.test(wholeMd), wholeMd);
check('1 行ずつでも位置が「文書全体」になる',
  RP.exporter.build(withWhole, { style: 'compact' }).startsWith('- 文書全体 — 全体に敬体で統一してください。\n'),
  RP.exporter.build(withWhole, { style: 'compact' }));
const wholeJson = JSON.parse(RP.exporter.build(withWhole, { style: 'json' }));
check('JSON では scope で区別できる',
  wholeJson[0].scope === 'document' && wholeJson[0].startLine === null && wholeJson[0].quote === '' &&
    wholeJson[2].scope === 'selection',
  JSON.stringify(wholeJson.slice(0, 3)));

section('質問');
const withQuestion = {
  ...doc,
  comments: [
    ...doc.comments,
    {
      id: 'q1', kind: 'question', body: '1,200 万円は何年分の想定ですか？', createdAt: 6, updatedAt: 6,
      anchor: { quote: '年間で約 1,200 万円', startLine: 49, endLine: 49, headingPath: ['4. 期待効果'] }
    },
    { id: 'q2', kind: 'question', body: '想定読者は誰ですか？', createdAt: 7, updatedAt: 7, anchor: null }
  ]
};
const questionMd = RP.exporter.build(withQuestion, {});
check('質問は位置見出しに印が付く',
  questionMd.includes('## [質問] L49 — 4. 期待効果\n\n> 年間で約 1,200 万円\n\n1,200 万円は何年分の想定ですか？'),
  questionMd);
check('文書全体への質問にも印が付く', questionMd.startsWith('## [質問] 文書全体\n\n想定読者は誰ですか？'),
  JSON.stringify(questionMd.slice(0, 60)));
check('kind の無い既存コメントは指示のまま（印なし）',
  questionMd.includes('## L38-L39 — 3. 提案する仕様') && (questionMd.match(/\[質問\]/g) || []).length === 2,
  questionMd);
check('1 行ずつでも印が付く',
  RP.exporter.build(withQuestion, { style: 'compact' }).includes('- [質問] L49 — 4. 期待効果 「年間で約 1,200 万円」 — 1,200 万円は何年分'),
  RP.exporter.build(withQuestion, { style: 'compact' }));
const questionJson = JSON.parse(RP.exporter.build(withQuestion, { style: 'json' }));
check('JSON では kind で区別できる',
  questionJson[0].kind === 'question' && questionJson.filter((c) => c.kind === 'instruction').length === 3,
  JSON.stringify(questionJson.map((c) => c.kind)));

section('util');
check('docKey はクエリとハッシュを落とす',
  RP.util.docKey('file:///a/b/report.md?x=1#sec') === 'file:///a/b/report.md');
check('basename', RP.util.basename('file:///a/b/report.md') === 'report.md');
check('displayPath', RP.util.displayPath('file:///a/b/report.md') === '/a/b/report.md');
check('normalize は連続空白を畳む', RP.util.normalize('  a  \n b ') === 'a b');

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
