import { loadFont as loadSans } from "@remotion/google-fonts/NotoSansJP";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

export const sans = loadSans("normal", {
  weights: ["400", "700"],
  subsets: ["japanese", "latin"],
}).fontFamily;

const monoLatin = loadMono("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
}).fontFamily;

// 等幅にない日本語は Noto Sans JP で描く
export const mono = `${monoLatin}, ${sans}`;
