import "./index.css";
import { Composition, Folder } from "remotion";
import { RedpenIntro } from "./RedpenIntro";
import { CopyPaste } from "./scenes/CopyPaste";
import { Layout } from "./scenes/Layout";
import { LineNumbers } from "./scenes/LineNumbers";
import { Missing } from "./scenes/Missing";
import { Opening } from "./scenes/Opening";
import { Outro } from "./scenes/Outro";
import { Problem } from "./scenes/Problem";
import { Question } from "./scenes/Question";
import { SelectComment } from "./scenes/SelectComment";
import { WholeDocument } from "./scenes/WholeDocument";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="RedpenIntro-Scenes">
        <Composition id="Opening" component={Opening} width={1920} height={1080} fps={30} durationInFrames={120} />
        <Composition id="Problem" component={Problem} width={1920} height={1080} fps={30} durationInFrames={165} />
        <Composition id="Layout" component={Layout} width={1920} height={1080} fps={30} durationInFrames={210} />
        <Composition id="SelectComment" component={SelectComment} width={1920} height={1080} fps={30} durationInFrames={240} />
        <Composition id="LineNumbers" component={LineNumbers} width={1920} height={1080} fps={30} durationInFrames={165} />
        <Composition id="WholeDocument" component={WholeDocument} width={1920} height={1080} fps={30} durationInFrames={195} />
        <Composition id="Question" component={Question} width={1920} height={1080} fps={30} durationInFrames={210} />
        <Composition id="CopyPaste" component={CopyPaste} width={1920} height={1080} fps={30} durationInFrames={210} />
        <Composition id="Missing" component={Missing} width={1920} height={1080} fps={30} durationInFrames={210} />
        <Composition id="Outro" component={Outro} width={1920} height={1080} fps={30} durationInFrames={150} />
      </Folder>
      {/* 10 シーンの合計 1875 フレームから、15 フレームのフェード 9 回分を引いた長さ */}
      <Composition
        id="RedpenIntro"
        component={RedpenIntro}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={1740}
      />
    </>
  );
};
