import {
  AbsoluteFill,
  Easing,
  interpolate,
  Interactive,
  useCurrentFrame,
} from "remotion";
import { mono, sans } from "../fonts";
import { Pointer, typed } from "../parts";

/** 拡張の --rp-ask と同じ色 */
const ASK = "#7c3aed";
const ASK_SOFT = "rgba(124, 58, 237, 0.09)";

/** 「質問」を押して切り替わるフレーム */
const SWITCH_AT = 47;

const QUESTION = "「将来的」はどの時期を想定していますか？";

export const Question: React.FC = () => {
  const frame = useCurrentFrame();
  const asking = frame >= SWITCH_AT;
  const body = typed(
    QUESTION,
    interpolate(frame, [58, 100], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  return (
    <AbsoluteFill
      name="Question"
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
        <div style={{ fontSize: 96, fontWeight: 700 }}>
          直さず、聞きたいだけのときも。
        </div>
        <div style={{ fontSize: 50, color: "#59636e", marginTop: 8 }}>
          指示と質問を切り替えて書ける
        </div>
      </Interactive.Div>

      <Interactive.Div
        name="Composer"
        style={{
          position: "absolute",
          left: 410,
          top: 350,
          width: 1100,
          padding: 32,
          borderRadius: 24,
          backgroundColor: "#ffffff",
          border: "2px solid #e6e8eb",
          boxShadow: "0 24px 60px rgba(16, 24, 40, 0.18)",
          opacity: interpolate(frame, [8, 18, 124, 130], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [8, 22], ["0px 24px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <div
          style={{
            display: "inline-flex",
            gap: 4,
            padding: 5,
            marginBottom: 22,
            borderRadius: 14,
            border: "2px solid #e6e8eb",
            backgroundColor: "#f6f8fa",
            fontSize: 34,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              padding: "4px 32px",
              borderRadius: 10,
              backgroundColor: asking ? "transparent" : "#ffffff",
              color: asking ? "#59636e" : "#2563eb",
              boxShadow: asking ? "none" : "0 2px 4px rgba(16, 24, 40, 0.1)",
            }}
          >
            指示
          </div>
          <Interactive.Div
            name="Question toggle"
            style={{
              padding: "4px 32px",
              borderRadius: 10,
              backgroundColor: asking ? "#ffffff" : "transparent",
              color: asking ? ASK : "#59636e",
              boxShadow: asking ? "0 2px 4px rgba(16, 24, 40, 0.1)" : "none",
              scale: interpolate(frame, [44, 47, 51], [1, 0.92, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                output: "perceptual-scale",
              }),
            }}
          >
            質問
          </Interactive.Div>
        </div>
        <div
          style={{
            borderLeft: "5px solid #eab308",
            paddingLeft: 18,
            marginBottom: 20,
            fontSize: 38,
            color: "#59636e",
          }}
        >
          Excel 形式は将来的な拡張とする。
        </div>
        <div
          style={{
            height: 130,
            padding: "18px 22px",
            borderRadius: 14,
            border: "3px solid",
            borderColor: asking ? ASK : "#2563eb",
            fontSize: 44,
            lineHeight: 1.5,
            color: body ? "#1f2328" : "#868f99",
          }}
        >
          {body ||
            (asking ? "内容について聞きたいことを書く…" : "修正してほしい内容を書く…")}
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
              backgroundColor: asking ? ASK : "#2563eb",
              fontSize: 36,
              fontWeight: 700,
              color: "#ffffff",
              scale: interpolate(frame, [116, 119, 123], [1, 0.92, 1], {
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
        name="Question card"
        style={{
          position: "absolute",
          left: 410,
          top: 350,
          width: 1100,
          padding: "30px 40px",
          borderRadius: 24,
          backgroundColor: "#ffffff",
          border: "3px solid #e6e8eb",
          opacity: interpolate(frame, [128, 140], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          scale: interpolate(frame, [128, 146], [0.96, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 200 }),
            output: "perceptual-scale",
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
              padding: "2px 14px",
              borderRadius: 10,
              border: `3px solid ${ASK}`,
              backgroundColor: ASK_SOFT,
              color: ASK,
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            質問
          </span>
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
            L20
          </span>
          3. 提案する仕様 &gt; 3.1 対応フォーマット
        </div>
        <div
          style={{
            borderLeft: "5px solid #eab308",
            paddingLeft: 18,
            marginBottom: 14,
            fontSize: 36,
            color: "#59636e",
          }}
        >
          Excel 形式は将来的な拡張とする。
        </div>
        <div style={{ fontSize: 46, color: "#1f2328" }}>{QUESTION}</div>
      </Interactive.Div>

      <Interactive.Div
        name="Exported heading"
        style={{
          position: "absolute",
          left: 410,
          top: 690,
          width: 1100,
          padding: "26px 32px",
          borderRadius: 20,
          backgroundColor: "#0f1216",
          boxShadow: "0 16px 40px rgba(16, 24, 40, 0.22)",
          fontFamily: mono,
          fontSize: 30,
          fontWeight: 700,
          color: "#6c9dff",
          whiteSpace: "nowrap",
          opacity: interpolate(frame, [152, 164], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [152, 170], ["0px 20px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        ## <span style={{ color: "#b197fc" }}>[質問]</span> L20 — 3. 提案する仕様 &gt; 3.1
        対応フォーマット
      </Interactive.Div>

      <Interactive.Div
        name="Cursor"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          translate: interpolate(
            frame,
            [0, 24, 52, 104, 112, 128, 150],
            [
              "1600px 1000px",
              "650px 400px",
              "650px 400px",
              "650px 400px",
              "1410px 740px",
              "1410px 740px",
              "1760px 1120px",
            ],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.45, 0, 0.2, 1),
            },
          ),
          scale: interpolate(frame, [44, 47, 51, 116, 119, 123], [1, 0.85, 1, 1, 0.85, 1], {
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
