import { useMemo, useState } from "react";
import LocationCanvas from "../common/LocationCanvas";
import type { Coordinates } from "../../types/location";
import { hasCoordinates, parseCoordinatePair, placeMapUrl } from "../../utils/tourLocations";
import { Button, Field, Notice } from "./ui";

export default function LocationPicker({ name, address, latitude, longitude, onChange }: {
  name: string; address: string; latitude: string; longitude: string;
  onChange: (latitude: string, longitude: string) => void;
}) {
  const [pair, setPair] = useState("");
  const [error, setError] = useState("");
  const points = useMemo(() => {
    const place = { _id: "editing-place", name: name || "Vị trí đang chọn", address,
      coordinates: { latitude: Number(latitude), longitude: Number(longitude) } };
    return latitude.trim() && longitude.trim() && hasCoordinates(place) ? [place] : [];
  }, [name, address, latitude, longitude]);
  function choose(coordinates: Coordinates) {
    onChange(coordinates.latitude.toFixed(6), coordinates.longitude.toFixed(6));
    setError("");
  }
  const search = placeMapUrl({ _id: "search", name, address });
  return <div className="admin-location-picker">
    <p><strong>Chọn ngay trên bản đồ:</strong> Phóng to khu vực cần tìm, bấm vào vị trí để đặt ghim. Kéo ghim để chỉnh hoặc bấm một chỗ khác để chọn lại. Hai ô vĩ độ, kinh độ tự cập nhật.</p>
    <LocationCanvas points={points} editable onChoose={choose} />
    <p className="location-state" role="status">{points.length
      ? `Đã chọn ghim: ${latitude}, ${longitude}. Kiểm tra đúng điểm đến trước khi lưu.`
      : "Chưa có ghim. Bản đồ đang mở khu vực Đắk Song; bấm đúng vị trí để chọn, chưa có vị trí nào tự được lưu."}</p>
    <div className="actions wrap">
      {points.length > 0 && <>
        <a className="text-link" href={placeMapUrl(points[0])} target="_blank" rel="noopener noreferrer">Kiểm tra vị trí trên Google Maps</a>
        <Button type="button" variant="ghost" onClick={() => { onChange("", ""); setPair(""); setError(""); }}>Xóa vị trí</Button>
      </>}
    </div>
    <p><strong>Lưu vị trí:</strong> Bấm Lưu điểm đến ở cuối cửa sổ. Ghim mới chọn chỉ được ghi lại sau khi lưu thành công.</p>
    <details className="coordinate-paste"><summary>Cách khác: dán tọa độ hoặc tra cứu Google Maps</summary>
    <p>Nếu đã có cặp số trên Google Maps, dán vào đây theo thứ tự vĩ độ, kinh độ. Cách này không bắt buộc.</p>
    {(name.trim() || address.trim()) && <a className="text-link" href={search} target="_blank" rel="noopener noreferrer">Tìm tên / địa chỉ trên Google Maps</a>}
    <Field label="Dán cặp tọa độ từ Google Maps">
      <input aria-label="Cặp tọa độ" value={pair} onChange={event => setPair(event.target.value)} placeholder="Ví dụ định dạng: 12.226096, 107.684887" maxLength={120} />
    </Field>
    <Button type="button" variant="secondary" onClick={() => {
      const coordinates = parseCoordinatePair(pair);
      if (!coordinates) { setError("Nhập hai số theo thứ tự vĩ độ, kinh độ. Không dán tên địa điểm hoặc liên kết rút gọn."); return; }
      onChange(String(coordinates.latitude), String(coordinates.longitude)); setError("");
    }}>Áp dụng tọa độ</Button>
    {error && <Notice error>{error}</Notice>}
    </details>
  </div>;
}
