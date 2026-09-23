// ToolZ — the launcher for the app's utility tools, nested under one tab
// the way the blueprint's neon sign draws it (a lightbulb full of tool
// icons). Each tile is one of ToolZ's real, live sibling tabs; clicking it
// opens that tab's own existing route. See AppLauncher.jsx for why a tile
// is a link to an existing route rather than a new nested URL.
import AppLauncher from "../AppLauncher.jsx";

const TILES = [
  {
    icon: "imagez.png",
    label: "ImageZ",
    route: "/image",
    description: "Layer, adjust, crop. Stack as many image layers as you want, export one PNG. Free.",
  },
  {
    icon: "cleanconnectz.png",
    label: "Clean ConnectZ",
    route: "/cleanconnect",
    description: "See what's eating your storage and delete it — your uploads and, on this device, its own cache. Free.",
  },
  {
    icon: "keyconnectz.png",
    label: "KeyConnectZ",
    route: "/keyconnect",
    description: "Translate and hear it read back. Free at every tier — being understood isn't a luxury. Your daily transcribe and speak allowance is on the screen before you use it.",
  },
  {
    icon: "parcelprimate.png",
    label: "Parcel Primate",
    route: "/parcelprimate",
    description: "Build a mailing list and send a real campaign to it. Free up to 100 recipients/day, then it's priced on the button before you send — also reachable from MessageZ.",
  },
];

export default function ToolZ() {
  return (
    <div>
      <div className="border-b border-white/10 p-4">
        <h1 className="text-lg font-semibold text-white">ToolZ</h1>
        <p className="mt-1 text-[13px] text-white/50">
          Audio, visual and app tools. Pick one below.
        </p>
      </div>
      <AppLauncher tiles={TILES} />
    </div>
  );
}
