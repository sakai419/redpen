import {
  AbsoluteFill,
  Easing,
  interpolate,
  Interactive,
  useCurrentFrame,
} from "remotion";
import { mono, sans } from "../fonts";
import { Pointer } from "../parts";

export const Missing: React.FC = () => {
  const frame = useCurrentFrame();
  const flagged = frame >= 78;

  return (
    <AbsoluteFill
      name="Missing"
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
        <div style={{ fontSize: 96, fontWeight: 700 }}>直ったかどうかも分かる。</div>
        <div style={{ fontSize: 50, color: "#59636e", marginTop: 8 }}>
          引用した文が消えたら「本文で未検出」
        </div>
      </Interactive.Div>

      <Interactive.Div
        name="Document"
        style={{
          position: "absolute",
          left: 110,
          top: 400,
          width: 980,
          padding: "44px 52px",
          borderRadius: 28,
          backgroundColor: "#ffffff",
          boxShadow: "0 18px 50px rgba(16, 24, 40, 0.08)",
          color: "#1f2328",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 22,
          }}
        >
          <span style={{ fontSize: 50, fontWeight: 700 }}>3.2 前提条件</span>
          <Interactive.Span
            name="Edited badge"
            style={{
              padding: "4px 18px",
              borderRadius: 999,
              backgroundColor: "rgba(26, 127, 55, 0.12)",
              color: "#1a7f37",
              fontSize: 30,
              fontWeight: 700,
              opacity: interpolate(frame, [24, 34], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            AI が修正
          </Interactive.Span>
        </div>
        <div style={{ position: "relative", fontSize: 46, lineHeight: 1.7, minHeight: 160 }}>
          <Interactive.Div
            name="Old sentence"
            style={{
              position: "absolute",
              inset: 0,
              textDecoration: "line-through",
              textDecorationColor: frame >= 26 ? "#c0392b" : "transparent",
              textDecorationThickness: 4,
              opacity: interpolate(frame, [36, 50], [1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            <span
              style={{
                backgroundColor: "rgba(250, 204, 21, 0.5)",
                borderBottom: "4px solid rgba(180, 120, 10, 0.55)",
              }}
            >
              本システムは常時オンラインであることを前提とする。
            </span>
          </Interactive.Div>
          <Interactive.Div
            name="New sentence"
            style={{
              position: "absolute",
              inset: 0,
              opacity: interpolate(frame, [46, 60], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              translate: interpolate(frame, [46, 64], ["0px 16px", "0px 0px"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              }),
            }}
          >
            オフライン時は変更を端末に保持し、復帰後に再送する。
          </Interactive.Div>
        </div>
      </Interactive.Div>

      <Interactive.Div
        name="Prune button"
        style={{
          position: "absolute",
          left: 1170,
          top: 400,
          padding: "12px 26px",
          borderRadius: 14,
          border: "3px solid #b45309",
          backgroundColor: "#ffffff",
          color: "#b45309",
          fontSize: 36,
          fontWeight: 700,
          opacity: interpolate(frame, [90, 100, 150, 160], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          scale: interpolate(frame, [134, 137, 141], [1, 0.93, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            output: "perceptual-scale",
          }),
        }}
      >
        未検出 1 件を削除
      </Interactive.Div>

      <Interactive.Div
        name="Comment card"
        style={{
          position: "absolute",
          left: 1170,
          top: 500,
          width: 640,
          padding: "30px 34px",
          borderRadius: 24,
          backgroundColor: "#ffffff",
          border: "3px solid #e6e8eb",
          borderLeft: flagged ? "10px solid #b45309" : "3px solid #e6e8eb",
          opacity: interpolate(frame, [140, 158], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          scale: interpolate(frame, [140, 158], [1, 0.94], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            output: "perceptual-scale",
          }),
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 16,
          }}
        >
          <span
            style={{
              fontFamily: mono,
              fontSize: 30,
              padding: "2px 12px",
              borderRadius: 10,
              border: "2px solid #e6e8eb",
              backgroundColor: "#f6f8fa",
              color: "#59636e",
            }}
          >
            L30
          </span>
          <Interactive.Span
            name="Missing chip"
            style={{
              fontSize: 30,
              fontWeight: 700,
              padding: "2px 14px",
              borderRadius: 10,
              border: "3px solid #b45309",
              backgroundColor: "rgba(234, 179, 8, 0.16)",
              color: "#b45309",
              opacity: interpolate(frame, [78, 84], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              scale: interpolate(frame, [78, 86, 94], [0.6, 1.12, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                output: "perceptual-scale",
              }),
            }}
          >
            本文で未検出
          </Interactive.Span>
        </div>
        <div
          style={{
            borderLeft: "5px solid #eab308",
            paddingLeft: 16,
            fontSize: 32,
            lineHeight: 1.6,
            color: "#59636e",
            marginBottom: 14,
          }}
        >
          本システムは常時オンラインであることを前提とする。
        </div>
        <div style={{ fontSize: 38, color: "#1f2328" }}>
          オフライン時の挙動が未定義。
        </div>
      </Interactive.Div>

      <Interactive.Div
        name="Toast"
        style={{
          position: "absolute",
          left: 1110,
          top: 600,
          width: 760,
          padding: "18px 0",
          borderRadius: 16,
          backgroundColor: "#1f2328",
          color: "#ffffff",
          fontSize: 36,
          textAlign: "center",
          opacity: interpolate(frame, [158, 166, 200, 210], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        未検出のコメントを 1 件削除しました
      </Interactive.Div>

      <Interactive.Div
        name="Cursor"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          translate: interpolate(
            frame,
            [0, 104, 126, 150, 176],
            [
              "1500px 1000px",
              "1500px 1000px",
              "1330px 430px",
              "1330px 430px",
              "1650px 980px",
            ],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.45, 0, 0.2, 1),
            },
          ),
          scale: interpolate(frame, [134, 137, 141], [1, 0.85, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          opacity: interpolate(frame, [96, 104], [0, 1], {
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
