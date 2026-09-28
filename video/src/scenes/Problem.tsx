import {
  AbsoluteFill,
  Easing,
  interpolate,
  Interactive,
  useCurrentFrame,
} from "remotion";
import { mono, sans } from "../fonts";
import { typed } from "../parts";

export const Problem: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Problem"
      style={{
        backgroundColor: "#faf7f2",
        fontFamily: sans,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 90,
      }}
    >
      <Interactive.Div
        name="Terminal"
        style={{
          width: 1480,
          borderRadius: 26,
          backgroundColor: "#0f1216",
          boxShadow: "0 24px 60px rgba(16, 24, 40, 0.28)",
          overflow: "hidden",
          fontFamily: mono,
          color: "#e3e8ee",
          opacity: interpolate(frame, [0, 12, 96, 116], [0, 1, 1, 0.4], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
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
        <div
          style={{
            display: "flex",
            minHeight: 290,
            padding: "36px 48px",
            fontSize: 48,
            lineHeight: 1.65,
          }}
        >
          <span style={{ color: "#6e7a87", marginRight: 24 }}>&gt;</span>
          <span style={{ fontFamily: sans }}>
            {typed(
              "report.md の 3 章、前提条件に「常時オンライン」と書いた一文があるはず。その一文の、オフライン時の扱いを……",
              interpolate(frame, [10, 92], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            )}
            <span
              style={{
                display: "inline-block",
                width: 22,
                height: 50,
                marginLeft: 6,
                verticalAlign: "-8px",
                backgroundColor: "#e3e8ee",
                opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0,
              }}
            />
          </span>
        </div>
      </Interactive.Div>

      <Interactive.Div
        name="Headline"
        style={{
          fontSize: 100,
          fontWeight: 700,
          lineHeight: 1.35,
          textAlign: "center",
          color: "#1f2328",
          opacity: interpolate(frame, [100, 118], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [100, 124], ["0px 30px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        その「どこ」の説明、
        <br />
        毎回していませんか。
      </Interactive.Div>
    </AbsoluteFill>
  );
};
