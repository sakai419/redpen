/* redpen — dev/preview.html 用の chrome API スタブ
 * 拡張として読み込まずに UI を確認するためのもの。製品コードからは参照しない。
 */
(function () {
  'use strict';
  const PREFIX = 'redpen-preview:';
  const listeners = [];

  // file:// では localStorage が使えないことがある（jsdom もそう）。その場合はメモリに置く。
  let memory = {};
  function read() {
    try {
      return JSON.parse(localStorage.getItem(PREFIX) || '{}');
    } catch {
      return memory;
    }
  }
  function write(obj) {
    memory = obj;
    try {
      localStorage.setItem(PREFIX, JSON.stringify(obj));
    } catch {
      /* メモリ側に持っているのでこのまま続ける */
    }
  }

  globalThis.chrome = {
    runtime: {
      id: 'preview',
      getURL: (p) => new URL('../' + p, location.href).href,
      onMessage: { addListener: (fn) => listeners.push(fn) }
    },
    storage: {
      local: {
        async get(keys) {
          const all = read();
          if (keys == null) return all;
          const list = Array.isArray(keys) ? keys : [keys];
          const out = {};
          for (const k of list) if (k in all) out[k] = all[k];
          return out;
        },
        async set(items) {
          write({ ...read(), ...items });
        },
        async remove(keys) {
          const all = read();
          for (const k of Array.isArray(keys) ? keys : [keys]) delete all[k];
          write(all);
        }
      },
      onChanged: { addListener() {} }
    }
  };
})();
