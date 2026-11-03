import { useCallback, useState } from 'react';
import type { Layer } from '../lib/emojiParts';

type H = { past: Layer[][]; present: Layer[]; future: Layer[][] };

export function useLayerHistory() {
  const [h, setH] = useState<H>({ past: [], present: [], future: [] });

  // Commit a new state as one undo step.
  const commit = useCallback((next: Layer[]) => setH(s => ({ past: [...s.past, s.present].slice(-60), present: next, future: [] })), []);
  // Live update without an undo step (dragging); `before` is pushed once on finish.
  const preview = useCallback((next: Layer[]) => setH(s => ({ ...s, present: next })), []);
  const finish = useCallback((before: Layer[]) => setH(s => (before === s.present ? s : { past: [...s.past, before].slice(-60), present: s.present, future: [] })), []);
  const undo = useCallback(() => setH(s => (s.past.length ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] } : s)), []);
  const redo = useCallback(() => setH(s => (s.future.length ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) } : s)), []);

  return { layers: h.present, canUndo: h.past.length > 0, canRedo: h.future.length > 0, commit, preview, finish, undo, redo };
}
