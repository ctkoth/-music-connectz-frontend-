import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Free OpenStreetMap tiles — no API key required.
export default function OfferMap({ offers, center }) {
  const el = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!el.current) return;
    if (!mapRef.current) {
      mapRef.current = L.map(el.current).setView(center || [39.5, -98.35], center ? 10 : 4);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }
    const map = mapRef.current;
    const layer = L.layerGroup().addTo(map);
    const pts = [];
    offers.forEach((o) => {
      if (o.latitude == null || o.longitude == null) return;
      pts.push([o.latitude, o.longitude]);
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:#0b0a14;border:2px solid #22e6ff;border-radius:9999px;
               padding:4px 10px;color:#fff;font-size:11px;font-weight:700;white-space:nowrap;
               box-shadow:0 0 12px rgba(34,230,255,.6)">$${o.price}${o.pricing_mode === "per_hour" ? "/hr" : ""}</div>`,
      });
      L.marker([o.latitude, o.longitude], { icon })
        .addTo(layer)
        .bindPopup(`<b>${o.title}</b><br/>${o.teacher_username} · ${o.skill} · ${o.rating_snapshot}★`);
    });
    if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 12 });
    return () => { layer.remove(); };
  }, [offers, center]);

  return <div ref={el} className="h-80 w-full overflow-hidden rounded-2xl border border-white/10" />;
}
