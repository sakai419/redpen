import {
  AbsoluteFill,
  Easing,
  interpolate,
  Interactive,
  useCurrentFrame,
} from "remotion";
import { sans } from "../fonts";
import { Logo } from "../parts";

export const Opening: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Opening"
      style={{
        backgroundColor: "#faf7f2",
        fontFamily: sans,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 56,
      }}
    >
      <Interactive.Div
        name="Brand row"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 48,
          opacity: interpolate(frame, [0, 18], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          scale: interpolate(frame, [0, 24], [0.86, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 200 }),
            output: "perceptual-scale",
          }),
        }}
      >
        <Logo size={200} />
        <Interactive.Div
          name="Wordmark"
          style={{
            fontSize: 190,
            fontWeight: 700,
            color: "#1f2328",
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          redpen
        </Interactive.Div>
      </Interactive.Div>

      <Interactive.Div
        name="Tagline"
        style={{
          position: "relative",
          fontSize: 88,
          fontWeight: 700,
          color: "#1f2328",
          opacity: interpolate(frame, [26, 44], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [26, 50], ["0px 30px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        AI が書いた文書に、
        <span style={{ position: "relative", color: "#c0392b" }}>
          赤を入れる。
          <svg
            width="560"
            height="40"
            viewBox="0 0 560 40"
            style={{ position: "absolute", left: -10, bottom: -30 }}
          >
            <Interactive.Path
              name="Pen stroke"
              d="M 8 26 C 140 10, 300 34, 548 14"
              fill="none"
              stroke="#c0392b"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray="600"
              strokeDashoffset={interpolate(frame, [52, 76], [600, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.65, 0, 0.35, 1),
              })}
            />
          </svg>
        </span>
      </Interactive.Div>
    </AbsoluteFill>
  );
};
