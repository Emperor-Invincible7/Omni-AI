/**
 * Tiny focus event bus — the [+ NEW CHAT] button and any session switch
 * can request the InputBar to focus without prop-drilling.
 */

const listeners = new Set<() => void>();

export function requestFocusInput() {
  listeners.forEach((l) => l());
}

export function onFocusRequest(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}