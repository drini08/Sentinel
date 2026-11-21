import { useEffect, useRef, useState } from "react";
import { Eraser, Pentagon } from "lucide-react";
import type { Coordinate } from "./types";
import "leaflet/dist/leaflet.css";

const defaultPolygon: Coordinate[] = [
  [21.3007, 42.8145], [21.3204, 42.8072], [21.3418, 42.8168],
  [21.3365, 42.8348], [21.3132, 42.8391], [21.2981, 42.8270],
];

export function SatelliteMap({ polygon, onChange }: { polygon: Coordinate[]; onChange: (polygon: Coordinate[]) => void }) {
  const element = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").Polygon | null>(null);
  const drawingRef = useRef(false);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    if (!element.current || mapRef.current) return;
    let active = true;
    void import("leaflet").then((L) => {
      if (!active || !element.current) return;
      const map = L.map(element.current, { zoomControl: true }).setView([42.823, 21.32], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);
      map.on("click", (event: import("leaflet").LeafletMouseEvent) => {
        if (!drawingRef.current) return;
        onChange([...polygonRef.current, [event.latlng.lng, event.latlng.lat]]);
      });
      mapRef.current = map;
    });
    return () => { active = false; mapRef.current?.remove(); mapRef.current = null; };
  }, [onChange]);

  const polygonRef = useRef(polygon);
  useEffect(() => { polygonRef.current = polygon; }, [polygon]);

  useEffect(() => {
    let active = true;
    void import("leaflet").then((L) => {
      if (!active || !mapRef.current) return;
      layerRef.current?.remove();
      if (polygon.length >= 3) {
        const latLngs: import("leaflet").LatLngTuple[] = polygon.map(([lng, lat]) => [lat, lng]);
        layerRef.current = L.polygon(latLngs, {
          color: "#355f79", fillColor: "#67a7c2", fillOpacity: 0.25, weight: 2,
        }).addTo(mapRef.current);
        mapRef.current.fitBounds(layerRef.current.getBounds(), { padding: [40, 40] });
      }
    });
    return () => { active = false; };
  }, [polygon]);

  const toggleDrawing = () => {
    const next = !drawing;
    setDrawing(next);
    drawingRef.current = next;
    if (next) onChange([]);
  };

  const reset = () => {
    setDrawing(false); drawingRef.current = false; onChange(defaultPolygon);
  };

  return <div className="satellite-map-shell">
    <div ref={element} className="satellite-map" aria-label="Reservoir polygon map" />
    <div className="satellite-map-tools">
      <button type="button" className={drawing ? "is-active" : ""} onClick={toggleDrawing}><Pentagon size={14} />{drawing ? "Click map points" : "Draw polygon"}</button>
      <button type="button" onClick={reset}><Eraser size={14} />Reset area</button>
    </div>
    <div className="satellite-map-readout">{polygon.length} vertices · {drawing ? "drawing active" : "analysis boundary ready"}</div>
  </div>;
}

export { defaultPolygon };
