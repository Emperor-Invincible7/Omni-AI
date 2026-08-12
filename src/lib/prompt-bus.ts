/**
 * Tiny event bus for cross-component messaging.
 *
 * ChatCanvas owns message state. The InputBar lives in a sibling grid row
 * and doesn't have access to that state directly. A subscription model keeps
 * the input component dumb and lets the canvas own the side effects.
 */

export interface PromptEvent {
  text: string;
}

type Listener = (e: PromptEvent) => void;

const listeners = new Set<Listener>();

export function emitPrompt(text: string) {
  const event = { text };
  listeners.forEach((l) => l(event));
}

export function onPrompt(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
