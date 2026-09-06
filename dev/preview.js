/* redpen — dev プレビューの起動スクリプト */
(function () {
  'use strict';
  const RP = globalThis.RedPen;
  const KEY = 'file:///Users/example/reports/sample-report.md';

  const source = document.getElementById('source').textContent.replace(/^\n/, '');
  const article = document.getElementById('rp-doc');
  const lines = RP.markdown.render(source, article);
  RP.outline.create(article, article.parentElement);

  const ctx = { root: article, mode: 'markdown', sourceLines: lines };

  /** 本文の文字列からアンカーを作る（サンプル投入用） */
  function anchorFor(needle) {
    const text = RP.anchor.fullText(article);
    const i = text.indexOf(needle);
    if (i < 0) return null;
    return RP.anchor.create(RP.anchor.rangeFromOffsets(article, i, i + needle.length), ctx);
  }

  document.getElementById('seed').addEventListener('click', async () => {
    const seeds = [
      ['本システムは常時オンラインであることを前提とする。', 'オフライン時の挙動が未定義。ネットワーク断で処理が落ちた場合の扱いを追記してください。', 'open'],
      ['db.insert(row)', 'ロールバック無しは受け入れられません。トランザクション内で一括投入し、失敗時は全件戻す設計にしてください。', 'open'],
      ['導入により、データ移行にかかる工数は 3 分の 1 になる。', '「3 分の 1」の根拠がありません。前提となる単価と件数を明示してください。', 'open'],
      ['Excel 形式は将来的な拡張とする。', 'この判断の理由を一行入れてください。', 'resolved']
    ];
    const doc = RP.store.emptyDoc(KEY, { title: 'sample-report.md', path: '/Users/example/reports/sample-report.md', mode: 'markdown' });
    for (const [needle, body, status] of seeds) {
      const anchor = anchorFor(needle);
      if (!anchor) continue;
      doc.comments.push({
        id: RP.util.uid(),
        body,
        status,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        anchor
      });
    }
    await RP.store.saveDoc(doc);
    location.reload();
  });

  document.getElementById('reset').addEventListener('click', async () => {
    await RP.store.removeDoc(KEY);
    location.reload();
  });

  RP.app.start({
    root: article,
    mode: 'markdown',
    sourceLines: lines,
    key: KEY,
    title: 'sample-report.md',
    path: '/Users/example/reports/sample-report.md'
  });
})();
