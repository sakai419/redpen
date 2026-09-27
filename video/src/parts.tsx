import React from "react";

/** redpen のアイコン（拡張の icons/ と同じ意匠） */
export const Logo: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 128 128">
    <rect x="0" y="0" width="128" height="128" rx="28" fill="#c0392b" />
    <path
      d="M 38 86 L 86 32 Q 94 24 100 30 Q 105 36 97 43 L 45 92 Z"
      fill="#ffffff"
    />
    <rect x="26" y="100" width="76" height="9" rx="4.5" fill="#ffffff" />
  </svg>
);

/** マウスカーソル */
export const Pointer: React.FC = () => (
  <svg width="54" height="60" viewBox="0 0 18 20">
    <path
      d="M 1 1 L 1 16 L 5 12.4 L 7.8 18.6 L 10.4 17.4 L 7.7 11.4 L 13 11.4 Z"
      fill="#111418"
      stroke="#ffffff"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

/** 打鍵のように文字を出す */
export const typed = (text: string, progress: number) =>
  text.slice(0, Math.round(Math.max(0, Math.min(1, progress)) * text.length));
