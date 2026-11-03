/** Input types where typing does not happen, so the editor keys still apply. */
const NON_TEXT_INPUTS = new Set(["checkbox", "radio", "range", "button", "submit", "reset", "file", "color"]);

/** Whether a key event is going into a control that expects text. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) return true;
  return target instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(target.type);
}

/** Takes focus off a button, so Space and Enter are not also clicks. */
export function releaseFocus() {
  if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur();
}

const KEY_CODES: Record<string, string> = {
  " ": "Space",
  "[": "BracketLeft",
  "]": "BracketRight",
  ",": "Comma",
  ".": "Period",
  ";": "Semicolon",
  "'": "Quote",
};

/**
 * The physical key. Some input sources and automation send no `code`; `key`
 * names the same key on every layout for the keys used here. Punctuation is
 * mapped by its character, so `[` still steps the speed when no code arrives.
 */
export function codeOf(event: KeyboardEvent): string {
  if (event.code) return event.code;
  return KEY_CODES[event.key] ?? event.key;
}
