import {
  AbsoluteFill,
  Easing,
  interpolate,
  Interactive,
  useCurrentFrame,
} from "remotion";
import { sans } from "../fonts";
import { Pointer, typed } from "../parts";

export const SelectComment: React.FC = () => {
  const frame = useCurrentFrame();
  const saved = frame >= 172;

  return (
    <AbsoluteFill
      name="Select and comment"
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
        選んで、書くだけ。
      </Interactive.Div>

      <Interactive.Div
        name="Document"
        style={{
          position: "absolute",
          left: 210,
          top: 300,
          width: 1500,
          padding: "56px 64px",
          borderRadius: 28,
          backgroundColor: "#ffffff",
          boxShadow: "0 18px 50px rgba(16, 24, 40, 0.08)",
          color: "#1f2328",
        }}
      >
        <div style={{ fontSize: 56, fontWeight: 700, marginBottom: 28 }}>
          3.2 前提条件
        </div>
        <div style={{ fontSize: 52, lineHeight: 1.75 }}>
          <span
            style={{
              backgroundImage: saved
                ? "linear-gradient(rgba(250, 204, 21, 0.5), rgba(250, 204, 21, 0.5))"
                : "linear-gradient(rgba(37, 99, 235, 0.24), rgba(37, 99, 235, 0.24))",
              backgroundRepeat: "no-repeat",
              // カーソルのドラッグと同じ速さで伸ばす
              backgroundSize: `${interpolate(frame, [22, 60], [0, 100], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.45, 0, 0.2, 1),
              })}% 100%`,
              borderBottom: saved
                ? "4px solid rgba(180, 120, 10, 0.55)"
                : "4px solid transparent",
            }}
          >
            本システムは常時オンラインであることを前提とする。
          </span>
          インポート処理は同期的に実行し、完了までブラウザを閉じないようユーザーに案内する。
        </div>
      </Interactive.Div>

      <Interactive.Div
        name="Launcher"
        style={{
          position: "absolute",
          left: 1250,
          top: 372,
          padding: "14px 30px",
          borderRadius: 14,
          backgroundColor: "#1f2328",
          color: "#ffffff",
          fontSize: 42,
          fontWeight: 700,
          boxShadow: "0 12px 32px rgba(16, 24, 40, 0.2)",
          opacity: interpolate(frame, [62, 68, 86, 88], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          scale: interpolate(frame, [62, 70, 80, 83, 86], [0.8, 1, 1, 0.92, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            output: "perceptual-scale",
          }),
        }}
      >
        ✎ コメント
      </Interactive.Div>

      <Interactive.Div
        name="Composer"
        style={{
          position: "absolute",
          left: 620,
          top: 600,
          width: 1080,
          padding: 32,
          borderRadius: 24,
          backgroundColor: "#ffffff",
          border: "2px solid #e6e8eb",
          boxShadow: "0 24px 60px rgba(16, 24, 40, 0.18)",
          opacity: interpolate(frame, [88, 96, 166, 172], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [88, 100], ["0px 24px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <div
          style={{
            borderLeft: "5px solid #eab308",
            paddingLeft: 18,
            marginBottom: 20,
            fontSize: 36,
            color: "#59636e",
          }}
        >
          本システムは常時オンラインであることを前提とする。
        </div>
        <div
          style={{
            height: 140,
            padding: "18px 22px",
            borderRadius: 14,
            border: "3px solid #2563eb",
            fontSize: 44,
            lineHeight: 1.5,
            color: "#1f2328",
          }}
        >
          {typed(
            "オフライン時の挙動が未定義。扱いを追記してください。",
            interpolate(frame, [100, 148], [0, 1], {
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
              scale: interpolate(frame, [158, 161, 165], [1, 0.92, 1], {
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
        name="Toast"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 860,
          display: "flex",
          justifyContent: "center",
          opacity: interpolate(frame, [176, 184, 226, 236], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [176, 190], ["0px 20px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <div
          style={{
            padding: "18px 36px",
            borderRadius: 16,
            backgroundColor: "#1f2328",
            color: "#ffffff",
            fontSize: 44,
          }}
        >
          L30 にコメントを追加しました
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
            [0, 16, 22, 60, 64, 78, 140, 154, 176, 200],
            [
              "1500px 950px",
              "278px 482px",
              "278px 482px",
              "1572px 482px",
              "1572px 482px",
              "1330px 398px",
              "1330px 398px",
              "1590px 890px",
              "1590px 890px",
              "1760px 1010px",
            ],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.45, 0, 0.2, 1),
            },
          ),
          scale: interpolate(frame, [80, 83, 86, 158, 161, 165], [1, 0.85, 1, 1, 0.85, 1], {
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
