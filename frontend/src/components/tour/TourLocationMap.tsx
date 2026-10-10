import { useEffect, useMemo, useRef, useState } from "react";
import { divIcon, latLngBounds, map, marker, tileLayer } from "leaflet";
import "leaflet/dist/leaflet.css";
import "../../styles/tour-locations.css";
import type { Tour } from "../../types/api";
import type { PlaceLocation } from "../../types/location";
import { buildRouteLinks, getRoutePoints, hasCoordinates, placeMapUrl } from "../../utils/tourLocations";
import AppLink from "../common/AppLink";
import Icon from "../common/Icon";

function LocationCanvas({ points }: { points: PlaceLocation[] }) {
  const container = useRef<HTMLDivElement>(null);
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    if (!container.current || !points.length) return;
    setTileError(false);
    const view = map(container.current, { scrollWheelZoom: false });
    let loaded = 0;
    const tiles = tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    }).addTo(view);
    tiles.on("tileerror", () => { if (!loaded) setTileError(true); });
    tiles.on("tileload", () => { loaded++; setTileError(false); });
    const locations = points.map((place, index) => {
      const coordinates: [number, number] = [place.coordinates!.latitude, place.coordinates!.longitude];
      const content = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = `${index + 1}. ${place.name}`;
      content.append(title);
      const address = document.createElement("p");
      address.textContent = place.address || place.locality || "";
      content.append(address);
      const link = document.createElement("a");
      link.href = placeMapUrl(place); link.target = "_blank"; link.rel = "noopener noreferrer";
      link.textContent = "Mở trên Google Maps"; content.append(link);
      marker(coordinates, { title: place.name, alt: `Điểm ${index + 1}: ${place.name}`,
        icon: divIcon({ className: "tour-place-marker", html: `<span>${index + 1}</span>`,
          iconSize: [32, 32], iconAnchor: [16, 32] }),
      }).addTo(view).bindPopup(content);
      return coordinates;
    });
    view.fitBounds(latLngBounds(locations), { padding: [35, 35], maxZoom: 14 });
    const observer = new ResizeObserver(() => view.invalidateSize());
    observer.observe(container.current);
    return () => { observer.disconnect(); view.remove(); };
  }, [points]);
  return <>
    <div ref={container} className="tour-location-canvas" role="region" aria-label="Bản đồ các điểm trong tour" />
    {tileError && <p className="tour-map-notice" role="status">Chưa tải được nền bản đồ. Bạn vẫn có thể xem vị trí và chỉ đường bằng các liên kết bên dưới.</p>}
  </>;
}

export default function TourLocationMap({ tour }: { tour: Tour }) {
  const places = tour.routeDestinations;
  const meeting = tour.meetingDestination;
  const points = useMemo(() => getRoutePoints(places || [], meeting), [places, meeting]);
  const links = useMemo(() => buildRouteLinks(points), [points]);
  const ordered = meeting ? [meeting, ...(places || []).filter(place => place._id !== meeting._id)] : places || [];
  const missing = ordered.filter(place => !hasCoordinates(place));
  return <section className="section detail-section tour-location">
    <div className="tour-location-heading"><h2><Icon name="map" size={20} /> Vị trí & Cung đường</h2></div>
    <p className="tour-meeting-location"><strong>Điểm tập trung:</strong> {tour.meetingPoint}</p>
    {points.length > 0 ? <LocationCanvas points={points} /> :
      <div className="tour-map-empty"><Icon name="pin" size={24} /><p>Các điểm trong tour chưa có tọa độ đã xác định. Xem thông tin điểm tập trung và lịch trình bên dưới.</p></div>}
    {ordered.length > 0 && <ol className="tour-map-places">
      {ordered.map(place => <li key={place._id}>
        <span className="tour-map-order">{hasCoordinates(place) ? points.findIndex(point => point._id === place._id) + 1 : "—"}</span>
        <div><AppLink to={`/destinations/${place._id}`}><strong>{place.name}</strong></AppLink>
          {place._id === meeting?._id && <small>Điểm tập trung</small>}
          <small>{place.locality || place.address || ""}</small>
          {!hasCoordinates(place) && <small>Chưa xác định vị trí bản đồ</small>}
        </div>
        {hasCoordinates(place) && <a href={placeMapUrl(place)} target="_blank" rel="noopener noreferrer" aria-label={`Xem vị trí ${place.name}`}><Icon name="pin" size={18} /></a>}
      </li>)}
    </ol>}
    {missing.length > 0 && <p className="tour-map-notice">{missing.length} điểm chưa có tọa độ nên chưa xuất hiện trên bản đồ hoặc cung đường.</p>}
    {!hasCoordinates(meeting) && points.length > 0 && <p className="tour-map-notice">Cung đường dưới đây bắt đầu từ địa điểm đầu tiên đã có tọa độ. Xem điểm tập trung ở trên trước khi khởi hành.</p>}
    <div className="tour-map-directions">
      {links.map((link, index) => <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="tour-directions-link">
        <Icon name="navigation" size={18} /><span>{links.length === 1 ? "Xem cung đường trên Google Maps" : `Chặng ${index + 1}: ${link.from} → ${link.to}`}</span>
      </a>)}
      {points.length === 1 && <a className="tour-directions-link" href={placeMapUrl(points[0])} target="_blank" rel="noopener noreferrer"><Icon name="pin" size={18} />Xem vị trí trên Google Maps</a>}
    </div>
  </section>;
}
