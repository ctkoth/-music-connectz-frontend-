// Is this status line a "you've hit your plan's limit" message? If so the screen puts a See plans button beside it, so the limit and the way
// past it are one place. Matches the wording the limit messages use (the DAW's track cap, the stems cap, a transpose range, a preset or plugin
// ceiling) and nothing else; a message that merely mentions a plan in passing still gets the button, which costs nothing and points at the
// plans page. The numbers themselves come from the server; this only recognises the sentence.
export function isLimitMessage(text) {
  return typeof text === "string" && /plan's limit|your plan|your tier|Premium (has|keeps|\d)|StatZ (has|is|unlimited)/i.test(text);
}
