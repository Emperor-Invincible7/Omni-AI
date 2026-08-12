/**
 * Tiny event bus for cross-component messaging.
 *
 * ChatCanvas owns message state. The InputBar lives in a sibling
 * grid row and doesn't have access to that state directly. A subscription
 * model keeps the input component dumb and lets the canvas own the side
 * effects.
 */

import type { ParsedFile } from './file-parser';

export interface PromptEvent {
  text: string;
  /** Optional data context produced from an attached file. */
  attachment?: ParsedFile;
  /** When true, the AI is asked to ground its answer in the web search. */
  webSearch?: boolean;
}

type Listener = (e: PromptEvent) => void;

const listeners = new Set<Listener>();

export function emitPrompt(text: string, attachment?: ParsedFile, webSearch?: boolean) {
  const event: PromptEvent = { text };
  if (attachment) event.attachment = attachment;
  if (webSearch) event.webSearch = true;
  listeners.forEach((l) => l(event));
}

export function onPrompt(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}