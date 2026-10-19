#!/usr/bin/env node
/* redpen — 差分ハイライトを手で確かめるための例を用意する
 *   node scripts/diff-example.js reset    … 修正前の版を examples/diff/report.{md,html} に置く
 *   node scripts/diff-example.js revise   … 修正後の版で上書きする（AI が直した状態の代わり）
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'examples', 'diff');
const STAGES = { reset: 'before', revise: 'after' };

const stage = STAGES[process.argv[2]];
if (!stage) {
  console.error('使い方: node scripts/diff-example.js <reset|revise>');
  process.exit(1);
}

for (const ext of ['md', 'html']) {
  const from = path.join(DIR, `report.${stage}.${ext}`);
  const to = path.join(DIR, `report.${ext}`);
  fs.copyFileSync(from, to);
  console.log(`${path.relative(process.cwd(), from)} → ${path.relative(process.cwd(), to)}`);
}
