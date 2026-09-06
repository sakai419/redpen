#!/usr/bin/env node
/* highlight.js の github テーマ 2 種を、配色スキームで切り替わる 1 枚にまとめる。
 *   node scripts/make-hljs-theme.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, 'src/vendor', f), 'utf8').trim();

/* テーマ側が持つレイアウトと地の色は page.css の組版と競合するので落とす:
 *   pre code.hljs / code.hljs … padding と overflow
 *   .hljs                     … 前景色と背景色
 * 残すのはトークンの配色だけ。 */
function stripBase(css) {
  return css
    .replace(/(^|\})\s*pre code\.hljs\s*\{[^}]*\}/, '$1')
    .replace(/(^|\})\s*code\.hljs\s*\{[^}]*\}/, '$1')
    .replace(/(^|\}|\/)\s*\.hljs\s*\{[^}]*\}/, '$1')
    .trim();
}

const light = stripBase(read('highlight-github.css'));
const dark = stripBase(read('highlight-github-dark.css'));

const out = `/* 自動生成 — scripts/make-hljs-theme.js
 * highlight.js github / github-dark テーマ (BSD-3-Clause, src/vendor/highlight.LICENSE)
 */
${light}

@media (prefers-color-scheme: dark) {
${dark}
}
`;

const dest = path.join(ROOT, 'src/content/hljs-theme.css');
fs.writeFileSync(dest, out);
console.log('wrote', path.relative(process.cwd(), dest), `(${out.length} bytes)`);
