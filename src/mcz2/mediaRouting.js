// OCC media-export routing. When OCC exports a file, it's routed to the matching
// Intelligence app by media type. Every image type is supported — including .ico.
// `app` matches the IntelligencePage sub-app id so exports land in the right tab.

export const MEDIA_ROUTES = [
  {
    category: "image",
    app: "image",
    label: "ImageConnectZ",
    emoji: "🖼️",
    exts: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "tiff", "tif", "ico", "heic", "heif", "avif", "psd", "raw"],
  },
  {
    category: "video",
    app: "video",
    label: "VideoConnectZ",
    emoji: "🎬",
    exts: ["mp4", "mov", "webm", "avi", "mkv", "m4v", "flv", "wmv"],
  },
  {
    category: "audio",
    app: "instrumental",
    label: "InstrumentalConnectZ",
    emoji: "🎹",
    exts: ["mp3", "wav", "flac", "ogg", "m4a", "aac", "aiff", "aif", "opus", "mid", "midi"],
  },
  {
    category: "text",
    app: "sentence",
    label: "SentenceConnectZ",
    emoji: "✍️",
    exts: ["txt", "md", "doc", "docx", "pdf", "rtf", "csv", "json", "lyrics"],
  },
  {
    category: "code",
    app: "occ",
    label: "OCC",
    emoji: "👁️‍🗨️",
    exts: ["js", "jsx", "ts", "tsx", "py", "cpp", "cc", "c", "h", "cs", "java", "go", "rs", "rb", "php", "html", "css", "lua", "gd", "sh", "sql"],
  },
];

export function extOf(name) {
  const m = String(name || "").toLowerCase().trim().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

// Route a filename (or bare extension) to its Intelligence app. Unknown types
// route to SentenceConnectZ (text) as a safe default.
export function routeForFile(name) {
  const ext = name && name.includes(".") ? extOf(name) : String(name || "").toLowerCase().trim();
  const route = MEDIA_ROUTES.find((r) => r.exts.includes(ext));
  return route || MEDIA_ROUTES.find((r) => r.category === "text");
}

export const ROUTE_BY_APP = Object.fromEntries(MEDIA_ROUTES.map((r) => [r.app, r]));
