import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import type { Area, ComplaintSummary } from "../types";
import { formatCategory, formatStatus } from "./StatusBadge";

interface HotspotPoint {
  latitude: number;
  longitude: number;
  category: string;
  occurrences: number;
  area_name?: string;
}

interface ComplaintMapProps {
  complaints?: ComplaintSummary[];
  areas?: Area[];
  hotspots?: HotspotPoint[];
  height?: string;
  center?: [number, number];
  zoom?: number;
  pickerMode?: boolean;
  pickedCoords?: [number, number] | null;
  onPickCoords?: (lat: number, lng: number) => void;
  showDensity?: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "#DC2626",
  High: "#EA580C",
  Medium: "#D97706",
  Low: "#0D9488",
};

const CATEGORY_BORDER: Record<string, string> = {
  potholes_road_damage: "#0F294A",
  garbage_accumulation: "#15803D",
  drainage_blockage: "#0284C7",
};

export const ComplaintMap: React.FC<ComplaintMapProps> = ({
  complaints = [],
  areas = [],
  hotspots = [],
  height = "420px",
  center = [12.9616, 77.6387],
  zoom = 12,
  pickerMode = false,
  pickedCoords = null,
  onPickCoords,
  showDensity = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const pickerMarkerRef = useRef<L.CircleMarker | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Handle click-to-pick mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (pickerMode && onPickCoords) {
        onPickCoords(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
      }
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [pickerMode, onPickCoords]);

  // Update picked marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (pickerMarkerRef.current) {
      pickerMarkerRef.current.remove();
      pickerMarkerRef.current = null;
    }
    if (pickerMode && pickedCoords) {
      const m = L.circleMarker(pickedCoords, {
        radius: 10,
        color: "#0F294A",
        weight: 3,
        fillColor: "#0D9488",
        fillOpacity: 0.9,
      }).addTo(map);
      m.bindTooltip("Selected Issue Location", { permanent: false, direction: "top" });
      pickerMarkerRef.current = m;
      map.panTo(pickedCoords, { animate: true });
    }
  }, [pickerMode, pickedCoords]);

  // Update overlays: pilot boundaries, hotspots, density, complaint markers
  useEffect(() => {
    const group = layerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    // Pilot area polygons (clearly labelled sample boundaries)
    areas.forEach((area) => {
      const poly = area.boundary_data?.polygon;
      if (poly && poly.length >= 3) {
        L.polygon(poly, {
          color: "#163660",
          weight: 1.5,
          dashArray: "5, 5",
          fillColor: "#1D4476",
          fillOpacity: 0.05,
        })
          .bindTooltip(`${area.area_name} (${area.ward_code}) — Sample Pilot Zone`, { sticky: true })
          .addTo(group);
      }
    });

    // Optional density circles
    if (showDensity) {
      complaints.forEach((c) => {
        L.circle([c.latitude, c.longitude], {
          radius: 260,
          stroke: false,
          fillColor: PRIORITY_COLORS[c.priority_level] || "#0D9488",
          fillOpacity: 0.14,
        }).addTo(group);
      });
    }

    // Recurring hotspots
    hotspots.forEach((h) => {
      L.circle([h.latitude, h.longitude], {
        radius: 180 + h.occurrences * 60,
        color: "#D97706",
        weight: 2,
        fillColor: "#F59E0B",
        fillOpacity: 0.22,
      })
        .bindPopup(
          `<div style="min-width:170px">
            <div style="font-weight:700;color:#92400E;font-size:12px;">RECURRING HOTSPOT</div>
            <div style="font-size:13px;font-weight:600;margin-top:2px;">${formatCategory(h.category)}</div>
            <div style="font-size:12px;color:#475569;">${h.area_name || ""} • ${h.occurrences} linked reports</div>
          </div>`
        )
        .addTo(group);
    });

    // Complaint markers
    complaints.forEach((c) => {
      const fill = PRIORITY_COLORS[c.priority_level] || "#0D9488";
      const border = CATEGORY_BORDER[c.category] || "#0F294A";
      const marker = L.circleMarker([c.latitude, c.longitude], {
        radius: c.priority_level === "Critical" ? 9 : 7.5,
        color: border,
        weight: 2.5,
        fillColor: fill,
        fillOpacity: 0.9,
      });

      const popupEl = document.createElement("div");
      popupEl.style.minWidth = "205px";
      popupEl.innerHTML = `
        <div style="font-size:11px;font-weight:700;color:#163660;">${c.reference_code} • ${c.priority_level.toUpperCase()}</div>
        <div style="font-size:13px;font-weight:600;color:#0F172A;margin:3px 0;">${formatCategory(c.category)}</div>
        <div style="font-size:12px;color:#475569;margin-bottom:4px;">${c.address_hint || c.area_name || ""}</div>
        <div style="font-size:11px;color:#0F766E;font-weight:600;margin-bottom:8px;">Status: ${formatStatus(c.status)} • Support: ${c.support_count}</div>
        <button type="button" data-cid="${c.complaint_id}" style="background:#0F294A;color:#fff;border:none;border-radius:6px;padding:5px 10px;font-size:12px;font-weight:600;cursor:pointer;width:100%;">
          View Details
        </button>
      `;
      const btn = popupEl.querySelector("button");
      if (btn) {
        btn.addEventListener("click", () => navigate(`/complaints/${c.complaint_id}`));
      }
      marker.bindPopup(popupEl);
      marker.addTo(group);
    });
  }, [complaints, areas, hotspots, showDensity, navigate]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
      <div ref={containerRef} style={{ height }} className="w-full" />
      <div className="px-3 py-2 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> Critical
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> High
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Medium
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-civicTeal-600 inline-block" /> Low
          </span>
        </div>
        <span className="text-slate-500">
          {pickerMode ? "Click anywhere on the map to set exact issue coordinates" : "OpenStreetMap • Sample Bengaluru Pilot Boundaries"}
        </span>
      </div>
    </div>
  );
};
