import {
  AbsoluteFill,
  Easing,
  interpolate,
  Interactive,
  useCurrentFrame,
} from "remotion";
import { mono, sans } from "../fonts";
import { Pointer, typed } from "../parts";

export const WholeDocument: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Whole document"
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
        <div style={{ fontSize: 96, fontWeight: 700 }}>資料全体への指示も。</div>
        <div style={{ fontSize: 50, color: "#59636e", marginTop: 8 }}>
          範囲を選ばずに書ける
        </div>
      </Interactive.Div>

      <Interactive.Div
        name="Whole document button"
        style={{
          position: "absolute",
          left: 410,
          top: 350,
          width: 1100,
          padding: "22px 36px",
          borderRadius: 22,
          border: "3px dashed",
          borderColor: frame >= 18 ? "#2563eb" : "#c9ced6",
          backgroundColor: frame >= 18 ? "rgba(37, 99, 235, 0.08)" : "transparent",
          color: frame >= 18 ? "#2563eb" : "#59636e",
          fontSize: 46,
          fontWeight: 700,
          scale: interpolate(frame, [26, 29, 33], [1, 0.97, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            output: "perceptual-scale",
          }),
        }}
      >
        ＋ 文書全体へのコメント
      </Interactive.Div>

      <Interactive.Div
        name="New card"
        style={{
          position: "absolute",
          left: 410,
          top: 500,
          width: 1100,
          padding: "30px 40px",
          borderRadius: 24,
          backgroundColor: "rgba(37, 99, 235, 0.07)",
          border: "3px solid #2563eb",
          opacity: interpolate(frame, [122, 134], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          scale: interpolate(frame, [122, 140], [0.96, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 200 }),
            output: "perceptual-scale",
          }),
        }}
      >
        <span
          style={{
            display: "inline-block",
            padding: "2px 14px",
            borderRadius: 10,
            border: "3px solid #2563eb",
            color: "#2563eb",
            fontSize: 32,
            fontWeight: 700,
            marginBottom: 14,
          }}
        >
          文書全体
        </span>
        <div style={{ fontSize: 46, color: "#1f2328" }}>
          結論を冒頭に移してください。
        </div>
      </Interactive.Div>

      <Interactive.Div
        name="Existing card"
        style={{
          position: "absolute",
          left: 410,
          top: 500,
          width: 1100,
          padding: "30px 40px",
          borderRadius: 24,
          backgroundColor: "#ffffff",
          border: "3px solid #e6e8eb",
          translate: interpolate(frame, [118, 140], ["0px 0px", "0px 236px"], {
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
            gap: 16,
            fontSize: 30,
            color: "#59636e",
            marginBottom: 14,
          }}
        >
          <span
            style={{
              fontFamily: mono,
              fontSize: 32,
              padding: "2px 12px",
              borderRadius: 10,
              border: "2px solid #e6e8eb",
              backgroundColor: "#f6f8fa",
            }}
          >
            L30
          </span>
          3. 提案する仕様 &gt; 3.2 前提条件
        </div>
        <div style={{ fontSize: 46, color: "#1f2328" }}>
          オフライン時の挙動が未定義。
        </div>
      </Interactive.Div>

      <Interactive.Div
        name="Composer"
        style={{
          position: "absolute",
          left: 410,
          top: 480,
          width: 1100,
          padding: 32,
          borderRadius: 24,
          backgroundColor: "#ffffff",
          border: "2px solid #e6e8eb",
          boxShadow: "0 24px 60px rgba(16, 24, 40, 0.18)",
          opacity: interpolate(frame, [34, 42, 112, 118], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [34, 46], ["0px 24px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <div
          style={{
            borderLeft: "5px solid #2563eb",
            paddingLeft: 18,
            marginBottom: 20,
            fontSize: 38,
            fontWeight: 700,
            color: "#2563eb",
          }}
        >
          文書全体へのコメント
        </div>
        <div
          style={{
            height: 130,
            padding: "18px 22px",
            borderRadius: 14,
            border: "3px solid #2563eb",
            fontSize: 44,
            lineHeight: 1.5,
            color: "#1f2328",
          }}
        >
          {typed(
            "結論を冒頭に移してください。",
            interpolate(frame, [48, 82], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          )}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 16,
            marginTop: 24,
          }}
        >
          <div
            style={{
              padding: "10px 30px",
              borderRadius: 12,
              border: "2px solid #e6e8eb",
              fontSize: 36,
              fontWeight: 700,
              color: "#1f2328",
            }}
          >
            取消
          </div>
          <Interactive.Div
            name="Save button"
            style={{
              padding: "10px 34px",
              borderRadius: 12,
              backgroundColor: "#2563eb",
              fontSize: 36,
              fontWeight: 700,
              color: "#ffffff",
              scale: interpolate(frame, [104, 107, 111], [1, 0.92, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                output: "perceptual-scale",
              }),
            }}
          >
            保存
          </Interactive.Div>
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
            [0, 20, 84, 100, 120, 150],
            [
              "1600px 1000px",
              "940px 390px",
              "940px 390px",
              "1410px 812px",
              "1410px 812px",
              "1700px 1000px",
            ],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.45, 0, 0.2, 1),
            },
          ),
          scale: interpolate(frame, [26, 29, 33, 104, 107, 111], [1, 0.85, 1, 1, 0.85, 1], {
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
