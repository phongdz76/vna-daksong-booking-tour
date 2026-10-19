import { useEffect, useRef, useState } from "react";
import { divIcon, latLngBounds, layerGroup, map, marker, polyline, tileLayer } from "leaflet";
import type { LayerGroup, Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import "../../styles/tour-locations.css";
import type { Coordinates, PlaceLocation } from "../../types/location";
import { placeMapUrl } from "../../utils/tourLocations";

export type MapPoint = PlaceLocation & { order?: number };

export default function LocationCanvas({ points, editable = false, showOrder = false, selectedId, onSelect, onChoose }: {
  points: MapPoint[];
  editable?: boolean;
  showOrder?: boolean;
  selectedId?: string;
  onSelect?: (id: string) => void;
  onChoose?: (coordinates: Coordinates) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const viewRef = useRef<LeafletMap | null>(null);
  const layersRef = useRef<LayerGroup | null>(null);
  const keepView = useRef(false);
  const markers = useRef(new Map<string, Marker>());
  const chooseRef = useRef(onChoose);
  const selectRef = useRef(onSelect);
  const retryTiles = useRef<(() => void) | null>(null);
  chooseRef.current = onChoose;
  selectRef.current = onSelect;
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    setTileError(false);
    const view = map(container.current, { scrollWheelZoom: false, doubleClickZoom: !editable });
    viewRef.current = view;
    layersRef.current = layerGroup().addTo(view);
    // This is the initial viewport, not an assigned destination or a boundary.
    view.setView([12.23, 107.68], 10);
    let loaded = 0;
    let reportedTileError = false;
    const tiles = tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      // OSM requires a Referer for web requests. Override restrictive WebView
      // defaults without disclosing the page path or query string.
      referrerPolicy: "strict-origin-when-cross-origin",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    });
    tiles.on("tileerror", () => {
      if (!loaded) setTileError(true);
      if (!reportedTileError) {
        reportedTileError = true;
        console.warn("[map] Could not load OpenStreetMap tiles. Check tile.openstreetmap.org in the device Network panel.", {
          origin: window.location.origin,
          referrerPolicy: tiles.options.referrerPolicy,
        });
      }
    });
    let deadline = window.setTimeout(() => { if (!loaded) setTileError(true); }, 10000);
    tiles.on("tileload", () => {
      loaded++;
      window.clearTimeout(deadline);
      setTileError(false);
    });
    retryTiles.current = () => {
      loaded = 0;
      reportedTileError = false;
      setTileError(false);
      window.clearTimeout(deadline);
      deadline = window.setTimeout(() => { if (!loaded) setTileError(true); }, 10000);
      // Keep the map and its pins alive, including any pending zoom animation.
      tiles.redraw();
    };
    tiles.addTo(view);
    if (editable) view.on("click", event => {
      keepView.current = true;
      chooseRef.current?.({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    });
    const observer = new ResizeObserver(() => view.invalidateSize());
    observer.observe(container.current);
    return () => {
      window.clearTimeout(deadline);
      retryTiles.current = null;
      observer.disconnect();
      markers.current.clear();
      layersRef.current = null;
      viewRef.current = null;
      view.remove();
    };
  }, [editable]);

  useEffect(() => {
    const view = viewRef.current;
    const layers = layersRef.current;
    if (!view || !layers) return;
    layers.clearLayers();
    markers.current.clear();
    const locations = points.map((place, index) => {
      const coordinates: [number, number] = [place.coordinates!.latitude, place.coordinates!.longitude];
      const order = place.order ?? index + 1;
      const content = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = `${order}. ${place.name}`;
      content.append(title);
      const address = document.createElement("p");
      address.textContent = place.address || place.locality || "";
      content.append(address);
      const link = document.createElement("a");
      link.href = placeMapUrl(place); link.target = "_blank"; link.rel = "noopener noreferrer";
      link.textContent = "Mở vị trí trên Google Maps";
      content.append(link);
      const pin = marker(coordinates, { title: place.name, alt: `Điểm ${order}: ${place.name}`, draggable: editable,
        icon: divIcon({ className: "tour-place-marker", html: `<span>${order}</span>`, iconSize: [32, 32], iconAnchor: [16, 32] }),
      }).addTo(layers).bindPopup(content);
      pin.on("click", () => selectRef.current?.(place._id));
      pin.on("dragend", () => {
        keepView.current = true;
        const point = pin.getLatLng();
        chooseRef.current?.({ latitude: point.lat, longitude: point.lng });
      });
      markers.current.set(place._id, pin);
      return coordinates;
    });
    if (showOrder && locations.length > 1) polyline(locations, { color: "#245b45", weight: 3, dashArray: "7 8", interactive: false }).addTo(layers);
    if (locations.length && !keepView.current) view.fitBounds(latLngBounds(locations), { padding: [35, 35], maxZoom: editable ? 16 : 14 });
    keepView.current = false;
  }, [points, editable, showOrder]);

  useEffect(() => {
    const pin = selectedId ? markers.current.get(selectedId) : undefined;
    if (pin) { pin.openPopup(); viewRef.current?.panTo(pin.getLatLng()); }
  }, [selectedId, points]);

  return <>
    {editable && <div className="map-editor-toolbar"><span>Khung xem mặc định: khu vực Đắk Song</span>
      <button type="button" className="map-retry" onClick={() => viewRef.current?.setView([12.23, 107.68], 10)}>Về khu vực Đắk Song</button>
    </div>}
    <div ref={container} className="tour-location-canvas" role="region" aria-label={editable ? "Bản đồ chọn vị trí địa điểm" : "Bản đồ các điểm trong tour"} />
    {tileError && <div className="tour-map-notice" role="status">
      <p>Chưa tải được nền bản đồ. Bạn vẫn có thể dùng tọa độ và các liên kết Google Maps.</p>
      <button type="button" className="map-retry" onClick={() => retryTiles.current?.()}>Tải lại bản đồ</button>
    </div>}
  </>;
}
