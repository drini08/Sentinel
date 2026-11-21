import { useEffect, useRef, useState } from "react";
import { Check, Eraser, Pentagon, RotateCcw, Undo2, X } from "lucide-react";
import type { Coordinate } from "./types";
import "leaflet/dist/leaflet.css";

const defaultPolygon: Coordinate[] = [
  [21.3007, 42.8145], [21.3204, 42.8072], [21.3418, 42.8168],
  [21.3365, 42.8348], [21.3132, 42.8391], [21.2981, 42.8270],
];

export function SatelliteMap({ polygon, onChange }: { polygon: Coordinate[]; onChange: (polygon: Coordinate[]) => void }) {
  const element = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const shapeRef = useRef<import("leaflet").Polyline | import("leaflet").Polygon | null>(null);
  const verticesRef = useRef<import("leaflet").LayerGroup | null>(null);
  const draftRef = useRef<Coordinate[] | null>(null);
  const onChangeRef = useRef(onChange);
  const [draft, setDraft] = useState<Coordinate[] | null>(null);
  const drawing = draft !== null;
  const points = draft ?? polygon;

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { draftRef.current = draft; }, [draft]);

  useEffect(() => {
    if (!element.current || mapRef.current) return;
    let active = true;
    void import("leaflet").then((L) => {
      if (!active || !element.current) return;
      const map = L.map(element.current, { zoomControl: true }).setView([42.823, 21.32], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors", maxZoom: 18,
      }).addTo(map);
      map.on("click", (event: import("leaflet").LeafletMouseEvent) => {
        const current = draftRef.current;
        if (current === null) return;
        setDraft([...current, [event.latlng.lng, event.latlng.lat]]);
      });
      mapRef.current = map;
      const initial = L.polygon(defaultPolygon.map(([lng, lat]) => [lat, lng] as import("leaflet").LatLngTuple));
      map.fitBounds(initial.getBounds(), { padding: [55, 55] });
    });
    return () => { active = false; mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    let active = true;
    void import("leaflet").then((L) => {
      const map = mapRef.current;
      if (!active || !map) return;
      shapeRef.current?.remove();
      verticesRef.current?.remove();
      const latLngs: import("leaflet").LatLngTuple[] = points.map(([lng, lat]) => [lat, lng]);
      if (points.length >= 3) {
        shapeRef.current = L.polygon(latLngs, {
          color: drawing ? "#f5a742" : "#355f79", fillColor: "#67a7c2",
          fillOpacity: drawing ? 0.18 : 0.25, weight: 3, dashArray: drawing ? "8 6" : undefined,
        }).addTo(map);
      } else if (points.length >= 2) {
        shapeRef.current = L.polyline(latLngs, { color: "#f5a742", weight: 3, dashArray: "8 6" }).addTo(map);
      }
      const vertices = L.layerGroup().addTo(map);
      points.forEach(([lng, lat], index) => {
        const marker = L.marker([lat, lng], {
          draggable: true, keyboard: true,
          title: drawing && index === 0 && points.length >= 3 ? "Click to close polygon" : `Vertex ${index + 1}`,
          icon: L.divIcon({
            className: `satellite-vertex ${drawing && index === 0 ? "is-first" : ""}`,
            html: `<span>${index + 1}</span>`, iconSize: [24, 24], iconAnchor: [12, 12],
          }),
        }).addTo(vertices);
        marker.on("dragend", () => {
          const next = [...(draftRef.current ?? polygon)] as Coordinate[];
          const position = marker.getLatLng();
          next[index] = [position.lng, position.lat];
          if (draftRef.current !== null) setDraft(next); else onChangeRef.current(next);
        });
        if (drawing && index === 0 && points.length >= 3) {
          marker.on("click", (event) => {
            L.DomEvent.stopPropagation(event.originalEvent);
            onChangeRef.current(points);
            setDraft(null);
          });
        }
      });
      verticesRef.current = vertices;
    });
    return () => { active = false; };
  }, [drawing, points, polygon]);

  const finishDrawing = () => {
    if (!draft || draft.length < 3) return;
    onChange(draft);
    setDraft(null);
  };

  return <div className={`satellite-map-shell ${drawing ? "is-drawing" : ""}`}>
    <div ref={element} className="satellite-map" aria-label="Reservoir polygon map" />
    <div className="satellite-map-tools">
      {!drawing && <button type="button" onClick={() => setDraft([])}><Pentagon size={14} />Draw new polygon</button>}
      {drawing && <>
        <button type="button" className="is-primary" onClick={finishDrawing} disabled={points.length < 3}><Check size={14} />Finish polygon</button>
        <button type="button" onClick={() => setDraft((current) => current?.slice(0, -1) ?? null)} disabled={points.length === 0}><Undo2 size={14} />Undo point</button>
        <button type="button" onClick={() => setDraft(null)}><X size={14} />Cancel</button>
      </>}
      <button type="button" onClick={() => { setDraft(null); onChange(defaultPolygon); }}>{drawing ? <RotateCcw size={14} /> : <Eraser size={14} />}Reset area</button>
    </div>
    <div className="satellite-map-readout">
      {drawing
        ? points.length < 3 ? `${points.length} vertices · add ${3 - points.length} more` : `${points.length} vertices · finish or click point 1`
        : `${points.length} vertices · drag points to adjust`}
    </div>
  </div>;
}

export { defaultPolygon };
