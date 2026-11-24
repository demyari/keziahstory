import { hashString } from '../engine/rng.js';

/** Splits narration into sentences (played and highlighted one at a time). */
export function splitSentences(text) {
  return String(text).split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}

/** Stable file id for a pre-recorded clip of `who` saying `text`. */
export function clipId(who, text) {
  return `${who}-${hashString(`${who}|${text.trim()}`).toString(36)}`;
}
