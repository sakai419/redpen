import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { CopyPaste } from "./scenes/CopyPaste";
import { Layout } from "./scenes/Layout";
import { LineNumbers } from "./scenes/LineNumbers";
import { Missing } from "./scenes/Missing";
import { Opening } from "./scenes/Opening";
import { Outro } from "./scenes/Outro";
import { Problem } from "./scenes/Problem";
import { SelectComment } from "./scenes/SelectComment";
import { WholeDocument } from "./scenes/WholeDocument";

export const RedpenIntro: React.FC = () => (
  <TransitionSeries>
    <TransitionSeries.Sequence name="Opening" durationInFrames={120}>
      <Opening />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={fade()}
      timing={linearTiming({ durationInFrames: 15 })}
    />
    <TransitionSeries.Sequence name="Problem" durationInFrames={165}>
      <Problem />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={fade()}
      timing={linearTiming({ durationInFrames: 15 })}
    />
    <TransitionSeries.Sequence name="Layout" durationInFrames={210}>
      <Layout />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={fade()}
      timing={linearTiming({ durationInFrames: 15 })}
    />
    <TransitionSeries.Sequence name="Select and comment" durationInFrames={240}>
      <SelectComment />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={fade()}
      timing={linearTiming({ durationInFrames: 15 })}
    />
    <TransitionSeries.Sequence name="Line numbers" durationInFrames={165}>
      <LineNumbers />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={fade()}
      timing={linearTiming({ durationInFrames: 15 })}
    />
    <TransitionSeries.Sequence name="Whole document" durationInFrames={195}>
      <WholeDocument />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={fade()}
      timing={linearTiming({ durationInFrames: 15 })}
    />
    <TransitionSeries.Sequence name="Copy and paste" durationInFrames={210}>
      <CopyPaste />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={fade()}
      timing={linearTiming({ durationInFrames: 15 })}
    />
    <TransitionSeries.Sequence name="Missing" durationInFrames={210}>
      <Missing />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={fade()}
      timing={linearTiming({ durationInFrames: 15 })}
    />
    <TransitionSeries.Sequence name="Outro" durationInFrames={150}>
      <Outro />
    </TransitionSeries.Sequence>
  </TransitionSeries>
);
