import {
  AbsoluteFill,
  Easing,
  interpolate,
  Interactive,
  useCurrentFrame,
} from "remotion";
import { mono, sans } from "../fonts";
import { Pointer, typed } from "../parts";

/** redpen が実際に書き出す形（位置・引用・コメントだけ） */
const EXPORTED = [
  "## 文書全体",
  "",
  "結論を冒頭に移してください。",
  "",
  "## L30 — 3. 提案する仕様 > 3.2 前提条件",
  "",
  "> 本システムは常時オンラインであることを前提とする。",
  "",
  "オフライン時の挙動が未定義。",
];

const PASTE_AT = 62;

export const CopyPaste: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Copy and paste"
      style={{ backgroundColor: "#eef1f5", fontFamily: sans }}
    >
      <Interactive.Div
        name="Caption"
        style={{
          position: "absolute",
          top: 96,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 96,
          fontWeight: 700,
          color: "#1f2328",
          opacity: interpolate(frame, [0, 14], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        コピーして、そのまま AI へ。
      </Interactive.Div>

      <Interactive.Div
        name="Copy button"
        style={{
          position: "absolute",
          left: 130,
          top: 520,
          width: 440,
          padding: "26px 0",
          borderRadius: 20,
          backgroundColor: "#2563eb",
          color: "#ffffff",
          fontSize: 50,
          fontWeight: 700,
          textAlign: "center",
          boxShadow: "0 16px 40px rgba(37, 99, 235, 0.3)",
          scale: interpolate(frame, [26, 29, 33], [1, 0.94, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            output: "perceptual-scale",
          }),
        }}
      >
        コピー
      </Interactive.Div>

      <Interactive.Div
        name="Toast"
        style={{
          position: "absolute",
          left: 90,
          top: 680,
          width: 520,
          padding: "18px 0",
          borderRadius: 16,
          backgroundColor: "#1f2328",
          color: "#ffffff",
          fontSize: 36,
          textAlign: "center",
          opacity: interpolate(frame, [34, 42, 90, 100], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [34, 46], ["0px 16px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        Markdown をコピーしました
      </Interactive.Div>

      <Interactive.Div
        name="Terminal"
        style={{
          position: "absolute",
          left: 690,
          top: 280,
          width: 1110,
          height: 700,
          borderRadius: 26,
          backgroundColor: "#0f1216",
          boxShadow: "0 24px 60px rgba(16, 24, 40, 0.28)",
          overflow: "hidden",
          fontFamily: mono,
          color: "#e3e8ee",
          opacity: interpolate(frame, [8, 22], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [8, 30], ["40px 0px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "20px 28px",
            borderBottom: "2px solid #262c34",
          }}
        >
          <span style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#ff5f57" }} />
          <span style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#febc2e" }} />
          <span style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#28c840" }} />
          <span style={{ marginLeft: 18, fontSize: 26, color: "#6e7a87" }}>
            AI エージェント
          </span>
        </div>
        <div style={{ padding: "26px 36px", fontSize: 32, lineHeight: 1.6 }}>
          {EXPORTED.map((line, i) => (
            <div
              key={i}
              style={{
                minHeight: "1.6em",
                whiteSpace: "nowrap",
                color: line.startsWith("##")
                  ? "#6c9dff"
                  : line.startsWith(">")
                    ? "#facc15"
                    : "#e3e8ee",
                fontWeight: line.startsWith("##") ? 700 : 400,
                opacity: frame >= PASTE_AT + i * 3 ? 1 : 0,
              }}
            >
              {i === 0 ? (
                <span style={{ color: "#6e7a87", marginRight: 18 }}>&gt;</span>
              ) : (
                <span style={{ display: "inline-block", width: 38 }} />
              )}
              {line}
            </div>
          ))}
          <div style={{ marginTop: 18, color: "#e3e8ee" }}>
            <span style={{ display: "inline-block", width: 38 }} />
            <span style={{ fontFamily: sans }}>
              {typed(
                "上の指摘を反映して。",
                interpolate(frame, [120, 150], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              )}
            </span>
            <span
              style={{
                display: "inline-block",
                width: 16,
                height: 38,
                marginLeft: 4,
                verticalAlign: "-7px",
                backgroundColor: "#e3e8ee",
                opacity: frame >= PASTE_AT && Math.floor(frame / 8) % 2 === 0 ? 1 : 0,
              }}
            />
          </div>
        </div>
      </Interactive.Div>

      <Interactive.Div
        name="Cursor"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          translate: interpolate(
            frame,
            [0, 20, 44, 60],
            ["900px 980px", "360px 575px", "360px 575px", "1180px 820px"],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.45, 0, 0.2, 1),
            },
          ),
          scale: interpolate(frame, [26, 29, 33], [1, 0.85, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          opacity: interpolate(frame, [56, 62], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <Pointer />
      </Interactive.Div>
    </AbsoluteFill>
  );
};
