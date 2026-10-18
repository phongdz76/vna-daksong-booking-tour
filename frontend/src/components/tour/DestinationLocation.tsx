import { useMemo } from "react";
import type { PlaceLocation } from "../../types/location";
import { hasCoordinates, placeDirectionsUrl, placeMapUrl } from "../../utils/tourLocations";
import LocationCanvas from "../common/LocationCanvas";
import Icon from "../common/Icon";

export default function DestinationLocation({ place }: { place: PlaceLocation }) {
  const points = useMemo(() => hasCoordinates(place) ? [place] : [], [place]);
  const directions = placeDirectionsUrl(place);
  return <section className="section tour-location destination-location">
    <h2><Icon name="map" size={20} /> Vị trí điểm đến</h2>
    <p className="tour-meeting-location">{place.address || place.locality || "Chưa có địa chỉ chi tiết"}</p>
    {points.length > 0 ? <>
      <LocationCanvas points={points} />
      <a className="tour-directions-link" href={directions!} target="_blank" rel="noopener noreferrer"><Icon name="navigation" size={18} />Chỉ đường đến điểm đến</a>
      <p className="tour-map-notice">Đây là vị trí điểm tham quan. Điểm tập trung của tour có thể ở nơi khác; hãy kiểm tra trong tour đã chọn.</p>
    </> : <div className="tour-map-empty">
      <p>Chưa có ghim chính xác cho điểm đến này. Xác nhận địa chỉ với VNA trước khi đi.</p>
      <a className="tour-meeting-search" href={placeMapUrl(place)} target="_blank" rel="noopener noreferrer">Tìm theo tên / địa chỉ trên Google Maps</a>
    </div>}
  </section>;
}
