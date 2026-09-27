/* redpen — chrome.storage.local を扱う永続化レイヤ
 *
 * レイアウト:
 *   doc:<docKey>  … 1 ドキュメント分のコメント集合
 *   index         … ポップアップ用の一覧メタデータ
 */
(function () {
  'use strict';
  const RP = (globalThis.RedPen = globalThis.RedPen || {});
  const util = RP.util;

  const DOC_PREFIX = 'doc:';
  const INDEX_KEY = 'index';

  function emptyDoc(key, meta = {}) {
    const now = Date.now();
    return {
      key,
      title: meta.title || util.basename(key),
      path: meta.path || util.displayPath(key),
      mode: meta.mode || 'html',
      createdAt: now,
      updatedAt: now,
      comments: []
    };
  }

  async function get(keys) {
    return chrome.storage.local.get(keys);
  }

  async function loadDoc(key) {
    const res = await get(DOC_PREFIX + key);
    return res[DOC_PREFIX + key] || null;
  }

  async function saveDoc(doc) {
    doc.updatedAt = Date.now();
    if (doc.comments.length === 0) {
      // 空の文書を残すと storage が際限なく育つので消す
      await chrome.storage.local.remove(DOC_PREFIX + doc.key);
    } else {
      await chrome.storage.local.set({ [DOC_PREFIX + doc.key]: doc });
    }
    await touchIndex(doc);
    return doc;
  }

  async function touchIndex(doc) {
    const res = await get(INDEX_KEY);
    const index = res[INDEX_KEY] || {};
    if (doc.comments.length === 0) {
      delete index[doc.key];
    } else {
      index[doc.key] = {
        key: doc.key,
        title: doc.title,
        path: doc.path,
        mode: doc.mode,
        total: doc.comments.length,
        updatedAt: doc.updatedAt
      };
    }
    await chrome.storage.local.set({ [INDEX_KEY]: index });
  }

  async function listDocs() {
    const res = await get(INDEX_KEY);
    const index = res[INDEX_KEY] || {};
    return Object.values(index).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async function removeDoc(key) {
    await chrome.storage.local.remove(DOC_PREFIX + key);
    const res = await get(INDEX_KEY);
    const index = res[INDEX_KEY] || {};
    delete index[key];
    await chrome.storage.local.set({ [INDEX_KEY]: index });
  }

  RP.store = {
    DOC_PREFIX,
    INDEX_KEY,
    emptyDoc,
    loadDoc,
    saveDoc,
    listDocs,
    removeDoc
  };
})();
