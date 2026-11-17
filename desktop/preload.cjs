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
}
