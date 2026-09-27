import {
  AbsoluteFill,
  Easing,
  interpolate,
  Interactive,
  useCurrentFrame,
} from "remotion";
import { sans } from "../fonts";
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
        name="Chat bubble"
        style={{
          width: 1480,
          minHeight: 300,
          padding: "44px 56px",
          borderRadius: 36,
          backgroundColor: "#ffffff",
          border: "2px solid #e6e8eb",
          boxShadow: "0 18px 50px rgba(16, 24, 40, 0.08)",
          fontSize: 54,
          lineHeight: 1.65,
          color: "#1f2328",
          opacity: interpolate(frame, [0, 12, 96, 116], [0, 1, 1, 0.4], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {typed(
          "3 章の前提条件のところに「常時オンライン」って書いてある一文があると思うんですけど、そこのオフライン時の扱いが……",
          interpolate(frame, [10, 92], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        )}
        <span
          style={{
            display: "inline-block",
            width: 4,
            height: 58,
            marginLeft: 6,
            verticalAlign: "-8px",
            backgroundColor: "#2563eb",
            opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0,
          }}
        />
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
