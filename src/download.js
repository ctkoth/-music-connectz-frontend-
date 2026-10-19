// Saving a file the server built. The endpoints answer {filename, content_type, text} as
// JSON rather than streaming a file, because a plain download link cannot carry the login
// header — so the browser makes the file itself from the text it was given.
//
// A CSV gets a byte-order mark: the header row carries emoji (Flow 🌊), and Excel reads a
// BOM-less file as the local code page and shows them as mojibake.

export const BOM = "﻿";

/** The parts of the Blob for a file's text; pure so it runs under plain node. */
export const blobParts = (text, type) => [/csv/.test(type || "") ? BOM + text : text];

/** A filename a download will keep, whatever the server sent. */
export const safeName = (name, fallback = "download.txt") =>
  String(name || fallback).replace(/[^\w.\-]+/g, "_").slice(0, 120) || fallback;

export function saveText({ filename, text, content_type: type = "text/plain" }) {
  const blob = new Blob(blobParts(text, type), { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeName(filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
