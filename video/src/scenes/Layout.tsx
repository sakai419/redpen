import {
  AbsoluteFill,
  Easing,
  interpolate,
  Interactive,
  useCurrentFrame,
} from "remotion";
import { mono, sans } from "../fonts";

const OUTLINE: [string, number][] = [
  ["新機能「一括インポート」導入検討…", 0],
  ["1. 概要", 1],
  ["2. 現状の課題", 1],
  ["3. 提案する仕様", 1],
  ["3.1 対応フォーマット", 2],
  ["3.2 前提条件", 2],
  ["4. 期待効果", 1],
  ["5. まとめ", 1],
];

const TABLE = [
  ["項目", "必須", "型", "備考"],
  ["顧客名", "○", "文字列", "255 文字まで"],
  ["メールアドレス", "○", "文字列", "重複チェックあり"],
  ["契約開始日", "", "日付", "YYYY-MM-DD"],
];

/** 画面全体の構成（目次・本文・レビューパネル）を見せる */
export const Layout: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Layout"
      style={{ backgroundColor: "#eef1f5", fontFamily: sans }}
    >
      <Interactive.Div
        name="Caption"
        style={{
          position: "absolute",
          top: 64,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 92,
          fontWeight: 700,
          color: "#1f2328",
          opacity: interpolate(frame, [0, 14], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        読む・指す・渡すが 1 画面で。
      </Interactive.Div>

      <Interactive.Div
        name="Browser window"
        style={{
          position: "absolute",
          left: 80,
          top: 230,
          width: 1760,
          height: 590,
          borderRadius: 22,
          overflow: "hidden",
          backgroundColor: "#ffffff",
          boxShadow: "0 24px 70px rgba(16, 24, 40, 0.16)",
          color: "#1f2328",
          display: "flex",
          flexDirection: "column",
          opacity: interpolate(frame, [4, 18], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          scale: interpolate(frame, [4, 26], [0.96, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 200 }),
            output: "perceptual-scale",
          }),
        }}
      >
        {/* アドレスバー */}
        <div
          style={{
            height: 58,
            flex: "none",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 22px",
            backgroundColor: "#e9ecf1",
            borderBottom: "1px solid #d8dde4",
          }}
        >
          <span style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: "#ff5f57" }} />
          <span style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: "#febc2e" }} />
          <span style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: "#28c840" }} />
          <div
            style={{
              marginLeft: 20,
              flex: 1,
              padding: "6px 18px",
              borderRadius: 10,
              backgroundColor: "#ffffff",
              fontFamily: mono,
              fontSize: 20,
              color: "#59636e",
            }}
          >
            file:///Users/you/reports/sample-report.md
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* 目次 */}
          <div
            style={{
              width: 330,
              flex: "none",
              padding: "18px 22px",
              backgroundColor: "#f6f8fa",
              borderRight: "1px solid #e6e8eb",
              fontSize: 20,
            }}
          >
            <div style={{ fontSize: 17, color: "#868f99", marginBottom: 14 }}>目次</div>
            {OUTLINE.map(([label, depth]) => (
              <div
                key={label}
                style={{
                  padding: "5px 12px",
                  paddingLeft: 12 + Math.max(0, depth - 1) * 20,
                  borderRadius: 8,
                  marginBottom: 2,
                  fontWeight: depth === 0 ? 700 : 400,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: label === "3.2 前提条件" ? "#2563eb" : "#1f2328",
                  backgroundColor:
                    label === "3.2 前提条件" ? "rgba(37, 99, 235, 0.1)" : "transparent",
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* 本文 */}
          <div
            style={{
              flex: 1,
              padding: "22px 56px",
              fontSize: 21,
              lineHeight: 1.75,
              overflow: "hidden",
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 700, borderBottom: "1px solid #e6e8eb", paddingBottom: 8, marginBottom: 14 }}>
              3. 提案する仕様
            </div>
            <div style={{ fontSize: 21, fontWeight: 700, marginBottom: 6 }}>3.1 対応フォーマット</div>
            <div style={{ marginBottom: 14 }}>
              CSV（UTF-8, カンマ区切り）のみを対象とする。Excel 形式は将来的な拡張とする。
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 0.6fr 0.8fr 1.4fr",
                width: 720,
                border: "1px solid #e6e8eb",
                borderRadius: 8,
                overflow: "hidden",
                fontSize: 18,
                marginBottom: 22,
              }}
            >
              {TABLE.flatMap((row, r) =>
                row.map((cell, c) => (
                  <div
                    key={`${r}-${c}`}
                    style={{
                      padding: "5px 12px",
                      borderTop: r > 0 ? "1px solid #e6e8eb" : "none",
                      backgroundColor: r === 0 ? "#f6f8fa" : "#ffffff",
                      fontWeight: r === 0 ? 700 : 400,
                    }}
                  >
                    {cell}
                  </div>
                )),
              )}
            </div>
            <div style={{ fontSize: 21, fontWeight: 700, marginBottom: 6 }}>3.2 前提条件</div>
            <div>
              <span
                style={{
                  backgroundColor: "rgba(250, 204, 21, 0.5)",
                  borderBottom: "2px solid rgba(180, 120, 10, 0.55)",
                }}
              >
                本システムは常時オンラインであることを前提とする。
              </span>
              インポート処理は同期的に実行し、完了までブラウザを閉じないようユーザーに案内する。
            </div>
          </div>

          {/* レビューパネル */}
          <div
            style={{
              width: 460,
              flex: "none",
              display: "flex",
              flexDirection: "column",
              borderLeft: "1px solid #e6e8eb",
              fontSize: 18,
            }}
          >
            <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #e6e8eb" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#2563eb", fontWeight: 700, fontSize: 17 }}>
                <span style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#2563eb" }} />
                redpen
              </div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>sample-report.md</div>
              <div style={{ fontSize: 15, color: "#59636e" }}>/Users/you/reports/sample-report.md</div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 22px",
                borderBottom: "1px solid #e6e8eb",
              }}
            >
              <span style={{ color: "#59636e" }}>
                <b style={{ color: "#1f2328" }}>2</b> 件
              </span>
              <span style={{ fontSize: 15, padding: "2px 10px", border: "1px solid #e6e8eb", borderRadius: 6, color: "#59636e" }}>
                全件削除
              </span>
            </div>
            <div style={{ flex: 1, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ padding: "9px 14px", border: "2px dashed #d8dde4", borderRadius: 12, color: "#59636e" }}>
                ＋ 文書全体へのコメント
              </div>
              <div style={{ padding: "12px 16px", border: "1px solid #e6e8eb", borderRadius: 12 }}>
                <span style={{ fontSize: 14, padding: "0 8px", border: "1.5px solid #2563eb", borderRadius: 5, color: "#2563eb", fontWeight: 700 }}>
                  文書全体
                </span>
                <div style={{ marginTop: 6 }}>結論を冒頭に移してください。</div>
              </div>
              <div
                style={{
                  padding: "12px 16px",
                  border: "2px solid #2563eb",
                  borderRadius: 12,
                  backgroundColor: "rgba(37, 99, 235, 0.07)",
                }}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 15, color: "#59636e" }}>
                  <span style={{ fontFamily: mono, fontSize: 14, padding: "0 7px", border: "1px solid #e6e8eb", borderRadius: 5, backgroundColor: "#f6f8fa" }}>
                    L30
                  </span>
                  3. 提案する仕様 &gt; 3.2 前提条件
                </div>
                <div style={{ borderLeft: "3px solid #eab308", paddingLeft: 10, margin: "8px 0", color: "#59636e" }}>
                  本システムは常時オンラインで…
                </div>
                <div>オフライン時の挙動が未定義。</div>
              </div>
            </div>
            <div style={{ padding: "12px 14px", backgroundColor: "#f6f8fa", borderTop: "1px solid #e6e8eb" }}>
              <div style={{ padding: "9px 0", borderRadius: 9, backgroundColor: "#2563eb", color: "#ffffff", textAlign: "center", fontWeight: 700 }}>
                コピー
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8, fontSize: 14, color: "#59636e" }}>
                <span>形式</span>
                <span>引用 + コメント ▾</span>
              </div>
            </div>
          </div>
        </div>
      </Interactive.Div>

      {/* 領域ごとの注記。目次 → 本文 → レビューパネルの順に出す */}
      <Interactive.Div
        name="Outline frame"
        style={{
          position: "absolute",
          left: 80,
          top: 288,
          width: 330,
          height: 532,
          borderRadius: "0 0 0 22px",
          border: "5px solid #c0392b",
          opacity: interpolate(frame, [34, 44], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
      <Interactive.Div
        name="Outline label"
        style={{
          position: "absolute",
          left: 88,
          top: 846,
          width: 314,
          padding: "12px 0",
          borderRadius: 16,
          backgroundColor: "#c0392b",
          color: "#ffffff",
          textAlign: "center",
          boxShadow: "0 12px 30px rgba(192, 57, 43, 0.35)",
          opacity: interpolate(frame, [36, 46], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          scale: interpolate(frame, [36, 52], [0.8, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 200 }),
            output: "perceptual-scale",
          }),
        }}
      >
        <div style={{ fontSize: 54, fontWeight: 700, lineHeight: 1.25 }}>目次</div>
        <div style={{ fontSize: 32 }}>見出しと現在位置</div>
      </Interactive.Div>

      <Interactive.Div
        name="Document frame"
        style={{
          position: "absolute",
          left: 410,
          top: 288,
          width: 970,
          height: 532,
          border: "5px solid #c0392b",
          opacity: interpolate(frame, [70, 80], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
      <Interactive.Div
        name="Document label"
        style={{
          position: "absolute",
          left: 418,
          top: 846,
          width: 954,
          padding: "12px 0",
          borderRadius: 16,
          backgroundColor: "#c0392b",
          color: "#ffffff",
          textAlign: "center",
          boxShadow: "0 12px 30px rgba(192, 57, 43, 0.35)",
          opacity: interpolate(frame, [72, 82], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          scale: interpolate(frame, [72, 88], [0.8, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 200 }),
            output: "perceptual-scale",
          }),
        }}
      >
        <div style={{ fontSize: 54, fontWeight: 700, lineHeight: 1.25 }}>本文</div>
        <div style={{ fontSize: 32 }}>選んだ箇所がハイライトされる</div>
      </Interactive.Div>

      <Interactive.Div
        name="Panel frame"
        style={{
          position: "absolute",
          left: 1380,
          top: 288,
          width: 460,
          height: 532,
          borderRadius: "0 0 22px 0",
          border: "5px solid #c0392b",
          opacity: interpolate(frame, [106, 116], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
      <Interactive.Div
        name="Panel label"
        style={{
          position: "absolute",
          left: 1388,
          top: 846,
          width: 444,
          padding: "12px 0",
          borderRadius: 16,
          backgroundColor: "#c0392b",
          color: "#ffffff",
          textAlign: "center",
          boxShadow: "0 12px 30px rgba(192, 57, 43, 0.35)",
          opacity: interpolate(frame, [108, 118], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          scale: interpolate(frame, [108, 124], [0.8, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 200 }),
            output: "perceptual-scale",
          }),
        }}
      >
        <div style={{ fontSize: 54, fontWeight: 700, lineHeight: 1.25 }}>レビューパネル</div>
        <div style={{ fontSize: 32 }}>コメントの一覧と書き出し</div>
      </Interactive.Div>
    </AbsoluteFill>
  );
};
