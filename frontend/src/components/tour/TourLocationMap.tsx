import { useMemo, useState } from "react";
import type { Tour } from "../../types/api";
import { buildRouteLinks, hasCoordinates, placeDirectionsUrl, placeMapUrl } from "../../utils/tourLocations";
import AppLink from "../common/AppLink";
import Icon from "../common/Icon";
import LocationCanvas from "../common/LocationCanvas";

export default function TourLocationMap({ tour }: { tour: Tour }) {
  const places = tour.routeDestinations;
  const meeting = tour.meetingDestination;
  const [selectedId, setSelectedId] = useState<string>();
  const ordered = useMemo(() => meeting ? [meeting, ...(places || []).filter(place => place._id !== meeting._id)] : places || [], [places, meeting]);
  const points = useMemo(() => ordered.map((place, index) => ({ ...place, order: index + 1 })).filter(hasCoordinates), [ordered]);
  const links = useMemo(() => buildRouteLinks(points), [points]);
  const missing = ordered.filter(place => !hasCoordinates(place));
  const meetingDirections = meeting ? placeDirectionsUrl(meeting) : null;
  const meetingSearch = "https://www.google.com/maps/search/?" + new URLSearchParams({ api: "1", query: tour.meetingPoint });
  return <section className="section detail-section tour-location">
    <div className="tour-location-heading"><h2><Icon name="map" size={20} /> Điểm hẹn & hành trình</h2></div>
    <div className="tour-meeting-card">
      <span className="map-eyebrow">1. ĐẾN ĐIỂM TẬP TRUNG</span>
      <p className="tour-meeting-location"><strong>{meeting?.name || tour.meetingPoint || "Liên hệ VNA để xác nhận điểm hẹn"}</strong></p>
      {meeting && <p className="tour-map-notice">{tour.meetingPoint}</p>}
      {meetingDirections ? <>
        <a className="tour-directions-link meeting-directions" href={meetingDirections} target="_blank" rel="noopener noreferrer"><Icon name="navigation" size={18} />Chỉ đường đến điểm tập trung</a>
        <p className="tour-map-notice">Google Maps sẽ cho bạn chọn điểm xuất phát hoặc dùng vị trí hiện tại nếu khả dụng.</p>
      </> : <>
        <p className="tour-map-notice">Điểm hẹn chưa có ghim chính xác. Hãy xác nhận địa chỉ với VNA trước khi đi.</p>
        {tour.meetingPoint && <a className="tour-meeting-search" href={meetingSearch} target="_blank" rel="noopener noreferrer">Tìm địa chỉ điểm hẹn trên Google Maps</a>}
      </>}
    </div>
    <div className="map-section-title"><span className="map-eyebrow">2. CÁC ĐIỂM TRONG TOUR</span><span>{points.length}/{ordered.length} điểm có ghim</span></div>
    <p className="tour-map-notice">Bấm tên điểm trong danh sách để xem ghim tương ứng. Số trên ghim là thứ tự ghé thăm.</p>
    {points.length > 0 ? <>
      <LocationCanvas points={points} showOrder selectedId={selectedId} onSelect={setSelectedId} />
      {points.length > 1 && <p className="tour-map-legend"><span aria-hidden="true">┄┄</span> Đường nối minh họa thứ tự, không phải đường xe chạy.</p>}
    </> : <div className="tour-map-empty"><Icon name="pin" size={24} /><p>Chưa có tọa độ để đặt ghim. Bạn vẫn có thể đọc địa chỉ và lịch trình; VNA sẽ xác nhận điểm hẹn khi xử lý yêu cầu.</p></div>}
    {ordered.length > 0 && <ol className="tour-map-places">
      {ordered.map((place, index) => <li key={place._id} className={selectedId === place._id ? "is-selected" : ""}>
        <span className="tour-map-order">{index + 1}</span>
        <div>{hasCoordinates(place) ? <button type="button" className="tour-map-select" aria-pressed={selectedId === place._id} onClick={() => setSelectedId(place._id)}><strong>{place.name}</strong></button>
          : <strong>{place.name}</strong>}
          {place._id === meeting?._id && <small className="map-meeting-label">Điểm tập trung</small>}
          <small>{place.locality || place.address || "Chưa có địa chỉ chi tiết"}</small>
          {!hasCoordinates(place) && <small>Chưa xác định vị trí bản đồ</small>}
          <AppLink to={`/destinations/${place._id}`} className="tour-place-detail">Đọc về điểm đến</AppLink>
        </div>
        {hasCoordinates(place) && <a href={placeMapUrl(place)} target="_blank" rel="noopener noreferrer" aria-label={`Xem vị trí ${place.name}`}><Icon name="pin" size={18} /></a>}
      </li>)}
    </ol>}
    {missing.length > 0 && <p className="tour-map-notice">{missing.length} điểm chưa có tọa độ nên chưa xuất hiện trên bản đồ hoặc cung đường. Danh sách vẫn giữ đúng thứ tự, kể cả điểm chưa có ghim.</p>}
    {links.length > 0 && <div className="tour-map-directions">
      <span className="map-eyebrow">3. XEM TUYẾN ĐƯỜNG THAM KHẢO</span>
      <p className="tour-map-notice">{missing.length ? "Tuyến dưới đây chỉ gồm những điểm đã có tọa độ, chưa phải toàn bộ hành trình. " : ""}Google Maps tính đường xe chạy giữa các điểm. Các đoạn đi bộ hoặc đường vào điểm tham quan cần theo hướng dẫn của VNA.</p>
      {links.map((link, index) => <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="tour-directions-link">
        <Icon name="navigation" size={18} /><span>{links.length === 1 ? "Xem tuyến giữa các điểm trên Google Maps" : `Chặng ${index + 1}: ${link.from} → ${link.to}`}</span>
      </a>)}
    </div>}
  </section>;
}
