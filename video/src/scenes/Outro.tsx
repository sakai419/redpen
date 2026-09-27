import {
  AbsoluteFill,
  Easing,
  interpolate,
  Interactive,
  useCurrentFrame,
} from "remotion";
import { sans } from "../fonts";
import { Logo } from "../parts";

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Outro"
      style={{
        backgroundColor: "#faf7f2",
        fontFamily: sans,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 60,
      }}
    >
      <Interactive.Div
        name="Brand row"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 44,
          opacity: interpolate(frame, [0, 16], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          scale: interpolate(frame, [0, 24], [0.9, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 200 }),
            output: "perceptual-scale",
          }),
        }}
      >
        <Logo size={170} />
        <div
          style={{
            fontSize: 170,
            fontWeight: 700,
            color: "#1f2328",
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          redpen
        </div>
      </Interactive.Div>

      <Interactive.Div
        name="Tagline"
        style={{
          fontSize: 80,
          fontWeight: 700,
          color: "#1f2328",
          opacity: interpolate(frame, [18, 34], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [18, 40], ["0px 24px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        Markdown / HTML に、赤ペンを。
      </Interactive.Div>

      <Interactive.Div
        name="Footnote"
        style={{
          fontSize: 46,
          color: "#59636e",
          opacity: interpolate(frame, [34, 50], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Chrome 拡張
      </Interactive.Div>
    </AbsoluteFill>
  );
};
