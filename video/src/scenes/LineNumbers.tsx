import {
  AbsoluteFill,
  Easing,
  interpolate,
  Interactive,
  useCurrentFrame,
} from "remotion";
import { mono, sans } from "../fonts";

const SOURCE: [number, string][] = [
  [28, "### 3.2 前提条件"],
  [29, ""],
  [30, "本システムは常時オンラインで…"],
  [31, "完了までブラウザを閉じないよう…"],
  [32, ""],
  [33, "```python"],
];

export const LineNumbers: React.FC = () => {
  const frame = useCurrentFrame();
  const lit = interpolate(frame, [46, 62], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      name="Line numbers"
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
          color: "#1f2328",
          opacity: interpolate(frame, [0, 14], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700 }}>原文の行番号まで付く。</div>
        <div style={{ fontSize: 50, color: "#59636e", marginTop: 8 }}>
          Markdown でも HTML でも
        </div>
      </Interactive.Div>

      <Interactive.Div
        name="Comment card"
        style={{
          position: "absolute",
          left: 130,
          top: 400,
          width: 800,
          padding: "40px 44px",
          borderRadius: 26,
          backgroundColor: "#ffffff",
          border: "3px solid #2563eb",
          color: "#1f2328",
          opacity: interpolate(frame, [6, 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [6, 26], ["-40px 0px", "0px 0px"], {
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
            gap: 18,
            fontSize: 32,
            color: "#59636e",
            marginBottom: 22,
          }}
        >
          <Interactive.Span
            name="Line chip"
            style={{
              fontFamily: mono,
              fontSize: 36,
              fontWeight: 700,
              padding: "2px 14px",
              borderRadius: 10,
              border: "3px solid #eab308",
              backgroundColor: "rgba(250, 204, 21, 0.25)",
              color: "#1f2328",
              scale: interpolate(frame, [46, 54, 64], [1, 1.18, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                output: "perceptual-scale",
              }),
            }}
          >
            L30
          </Interactive.Span>
          3. 提案する仕様 &gt; 3.2 前提条件
        </div>
        <div
          style={{
            borderLeft: "5px solid #eab308",
            paddingLeft: 18,
            fontSize: 36,
            lineHeight: 1.6,
            color: "#59636e",
            marginBottom: 20,
          }}
        >
          本システムは常時オンラインであることを前提とする。
        </div>
        <div style={{ fontSize: 42, lineHeight: 1.55 }}>
          オフライン時の挙動が未定義。扱いを追記してください。
        </div>
      </Interactive.Div>

      <Interactive.Div
        name="Source"
        style={{
          position: "absolute",
          left: 1010,
          top: 400,
          width: 780,
          padding: "30px 0",
          borderRadius: 26,
          backgroundColor: "#0f1216",
          fontFamily: mono,
          fontSize: 36,
          lineHeight: 1.9,
          color: "#e3e8ee",
          overflow: "hidden",
          opacity: interpolate(frame, [18, 32], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [18, 38], ["40px 0px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <div
          style={{
            padding: "0 36px 18px",
            fontSize: 28,
            color: "#6e7a87",
          }}
        >
          sample-report.md
        </div>
        {SOURCE.map(([n, text]) => (
          <div
            key={n}
            style={{
              display: "flex",
              padding: "0 36px",
              whiteSpace: "nowrap",
              backgroundColor:
                n === 30 ? `rgba(250, 204, 21, ${0.28 * lit})` : "transparent",
              boxShadow:
                n === 30 ? `inset 6px 0 0 rgba(250, 204, 21, ${lit})` : "none",
            }}
          >
            <span
              style={{
                width: 80,
                flex: "none",
                color: n === 30 && lit > 0.5 ? "#facc15" : "#6e7a87",
              }}
            >
              {n}
            </span>
            <span>{text}</span>
          </div>
        ))}
      </Interactive.Div>
    </AbsoluteFill>
  );
};
