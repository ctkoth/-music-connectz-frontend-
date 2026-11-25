// Gives OUR site — and only our site — the VST3 bridge (window.mczVst). Any other page the app ever
// shows gets nothing: a plugin host is native code on the member's PC, and only Music ConnectZ's own
// DAWs may drive it.
const { contextBridge, ipcRenderer } = require("electron");

const OURS = new Set(["https://musicconnectz.net", "https://www.musicconnectz.net"]);
if (OURS.has(window.location.origin)) {
  contextBridge.exposeInMainWorld("mczVst", {
    version: 1,
    scan: () => ipcRenderer.invoke("vst:scan"),
    params: (file, uid, state) => ipcRenderer.invoke("vst:params", { file, uid, state }),
    render: (file, uid, wav, state, params) => ipcRenderer.invoke("vst:render", { file, uid, wav, state, params }),
    editor: (file, uid, state) => ipcRenderer.invoke("vst:editor", { file, uid, state }),
  });
  // Clean ConnectZ's file bridge. Paths never cross: the page gets a token for a folder the member chose in the
  // OS dialog and names files relative to it (see files.cjs).
  contextBridge.exposeInMainWorld("mczFiles", {
    version: 1,
    pick: () => ipcRenderer.invoke("files:pick"),
    scan: (token) => ipcRenderer.invoke("files:scan", { token }),
    dupes: (token, files) => ipcRenderer.invoke("files:dupes", { token, files }),
    cancel: () => ipcRenderer.invoke("files:cancel"),
    remove: (token, paths, permanent) => ipcRenderer.invoke("files:remove", { token, paths, permanent: !!permanent }),
    onProgress: (fn) => {
      const h = (_e, p) => fn(p);
      ipcRenderer.on("files:progress", h);
      return () => ipcRenderer.removeListener("files:progress", h);
    },
  });
}
