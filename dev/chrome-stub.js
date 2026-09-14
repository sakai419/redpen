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

  // テストから service worker 発のメッセージを模擬できるようにしておく
  globalThis.__rpDispatch = (message) => {
    for (const fn of listeners) fn(message, {}, () => {});
  };

  globalThis.chrome = {
    runtime: {
      id: 'preview',
      getURL: (p) => new URL('../' + p, location.href).href,
      onMessage: { addListener: (fn) => listeners.push(fn) },
      // 単体で開いているので、タブの有効・無効は常に「有効」で応答する
      async sendMessage(msg) {
        if (msg?.type === 'rp-should-run') return { enabled: true };
        // 拡張なら service worker が代わりに読む。ここでは自分で取りに行く
        if (msg?.type === 'rp-fetch-source') {
          try {
            const res = await fetch(msg.url);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return { ok: true, text: await res.text() };
          } catch (err) {
            return { ok: false, error: String(err?.message || err) };
          }
        }
        return { ok: true };
      }
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
