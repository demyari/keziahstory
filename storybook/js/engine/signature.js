// A progression signature describes what MEANINGFULLY happened in a story:
// the world, the goal, the companion, every place visited in order, the event
// that happened there, any decision taken, how the finale was reached and
// which ending was earned.
//
// Deliberately left OUT (cosmetic): wording, counts chosen for the child's
// level, which letter was practised, which picture was counted, the seed.
// Two stories that differ only in those count as the SAME progression.

export function signature(state) {
  const steps = state.log.map((e) => `${e.loc}:${e.ev || '-'}${e.opt ? `>${e.opt}` : ''}`);
  return [state.worldId, state.goal, state.companion, ...steps, `via:${state.travelMode}`, `end:${state.ending}`].join('|');
}

/** A coarser signature: only the events, decisions and ending (no places, no companion). */
export function coarseSignature(state) {
  const steps = state.log.map((e) => `${e.ev || '-'}${e.opt ? `>${e.opt}` : ''}`);
  return [state.worldId, state.goal, ...steps, `end:${state.ending}`].join('|');
}
