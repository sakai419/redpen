/* redpen — dev プレビューの起動スクリプト */
(function () {
  'use strict';
  const RP = globalThis.RedPen;
  const KEY = 'file:///Users/example/reports/sample-report.md';

  const source = document.getElementById('source').textContent.replace(/^\n/, '');
  const article = document.getElementById('rp-doc');
  const lines = RP.markdown.render(source, article);
  const outline = RP.outline.create(article, { anchorTo: article.parentElement, mode: 'markdown' });

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
      ['本システムは常時オンラインであることを前提とする。', 'オフライン時の挙動が未定義。ネットワーク断で処理が落ちた場合の扱いを追記してください。'],
      ['db.insert(row)', 'ロールバック無しは受け入れられません。トランザクション内で一括投入し、失敗時は全件戻す設計にしてください。'],
      ['導入により、データ移行にかかる工数は 3 分の 1 になる。', '「3 分の 1」の根拠がありません。前提となる単価と件数を明示してください。'],
      ['Excel 形式は将来的な拡張とする。', '「将来的」はどの時期を想定していますか？', 'question']
    ];
    const doc = RP.store.emptyDoc(KEY, { title: 'sample-report.md', path: '/Users/example/reports/sample-report.md', mode: 'markdown' });
    for (const [needle, body, kind = 'instruction'] of seeds) {
      const anchor = anchorFor(needle);
      if (!anchor) continue;
      doc.comments.push({
        id: RP.util.uid(),
        kind,
        body,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        anchor
      });
    }
    doc.comments.push({
      id: RP.util.uid(),
      body: '結論を冒頭に移し、各節はその根拠として読めるように並べ替えてください。',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      anchor: null
    });
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
    outline,
    canDisable: true,
    onDisable: () => {
      document.body.classList.remove('rp-md-page');
      document.documentElement.style.paddingRight = '';
    },
    key: KEY,
    title: 'sample-report.md',
    path: '/Users/example/reports/sample-report.md'
  });
})();
