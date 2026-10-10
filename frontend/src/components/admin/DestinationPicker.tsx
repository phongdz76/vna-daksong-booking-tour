import { useState } from "react";
import type { Destination } from "../../types/admin";
import type { AreaScope, PlaceGroup } from "../../types/location";
import { areaScopeLabels, getPlaceGroup, hasCoordinates, placeGroupLabels } from "../../utils/tourLocations";
import { Button, Notice } from "./ui";

export default function DestinationPicker({ items, selected, onChange, loading, error, ordered = false }: {
  items: Destination[]; selected: string[]; onChange: (ids: string[]) => void;
  loading: boolean; error: string; ordered?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("");
  const [group, setGroup] = useState("");
  const [dragged, setDragged] = useState<string | null>(null);
  const keyword = search.trim().toLocaleLowerCase("vi");
  const display = items.filter(place => place.status !== "archived" &&
    (!scope || (place.areaScope || "unspecified") === scope) && (!group || getPlaceGroup(place) === group) &&
    [place.name, place.locality, place.address].filter(Boolean).join(" ").toLocaleLowerCase("vi").includes(keyword));
  const move = (from: number, to: number) => {
    if (from < 0 || to < 0 || to >= selected.length || from === to) return;
    const next = [...selected];
    const [id] = next.splice(from, 1);
    next.splice(to, 0, id);
    onChange(next);
  };
  return (
    <div className="field destination-picker-field">
      {error && <Notice error>{error}</Notice>}
      <div className="destination-picker-filters">
        <input aria-label="Tìm điểm đến để liên kết" placeholder="Tìm tên địa điểm, xã hoặc địa chỉ…"
          value={search} onChange={event => setSearch(event.target.value)} />
        <select aria-label="Khu vực điểm đến" value={scope} onChange={event => setScope(event.target.value)}>
          <option value="">Tất cả khu vực</option>
          {Object.entries(areaScopeLabels).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
        </select>
        <select aria-label="Nhóm điểm đến" value={group} onChange={event => setGroup(event.target.value)}>
          <option value="">Tất cả nhóm địa điểm</option>
          {Object.entries(placeGroupLabels).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
        </select>
      </div>
      <div className="destination-picker-options">
        {loading ? <p className="muted">Đang tải điểm đến…</p> : !display.length ?
          <p className="muted">Chưa có điểm đến phù hợp. Bạn có thể tạo địa điểm mới trong mục Điểm đến.</p> :
          (Object.keys(areaScopeLabels) as AreaScope[]).map(area => {
            const places = display.filter(place => (place.areaScope || "unspecified") === area);
            return places.length > 0 && <section key={area} className="destination-picker-area">
              <h4>{areaScopeLabels[area]}</h4>
              {(Object.keys(placeGroupLabels) as PlaceGroup[]).map(kind => {
                const grouped = places.filter(place => getPlaceGroup(place) === kind);
                return grouped.length > 0 && <div key={kind} className="destination-picker-group">
                  <strong>{placeGroupLabels[kind]}</strong>
                  {grouped.map(place => <label key={place._id} className={selected.includes(place._id) ? "is-selected" : ""}>
                    <input type="checkbox" aria-label={`Chọn ${place.name}`} checked={selected.includes(place._id)}
                      onChange={event => onChange(event.target.checked ? [...selected, place._id] : selected.filter(id => id !== place._id))} />
                    <span><b>{place.name}</b><small>{place.locality || place.address || "Chưa có xã/khu vực"}</small>
                      <small className={hasCoordinates(place) ? "has-map-location" : "muted"}>
                        {hasCoordinates(place) ? "Đã có vị trí bản đồ" : "Chưa xác định vị trí bản đồ"}
                        {place.status === "draft" && " · Bản nháp"}
                      </small>
                    </span>
                  </label>)}
                </div>;
              })}
            </section>;
          })}
      </div>
      {selected.length > 0 && <div className="selected-destinations-bar">
        <div className="selected-destinations-heading"><strong>{ordered ? "Các điểm trong tour" : "Điểm đến đã chọn"} ({selected.length})</strong>
          <Button type="button" variant="ghost" onClick={() => onChange([])}>Bỏ chọn tất cả</Button>
        </div>
        {ordered && <p className="inline-note">Kéo để đổi thứ tự hoặc dùng nút Lên/Xuống. Đây là thứ tự ghé thăm trên bản đồ; điểm tập trung luôn đứng đầu.</p>}
        <ol className="selected-destination-list">
          {selected.map((id, index) => {
            const place = items.find(item => item._id === id);
            return <li key={id} draggable={ordered} className={dragged === id ? "is-dragging" : ""}
              onDragStart={event => { setDragged(id); event.dataTransfer.setData("text/plain", id); event.dataTransfer.effectAllowed = "move"; }}
              onDragEnd={() => setDragged(null)} onDragOver={event => { if (ordered) event.preventDefault(); }}
              onDrop={event => { event.preventDefault(); move(selected.indexOf(dragged || event.dataTransfer.getData("text/plain")), index); setDragged(null); }}>
              <span className="destination-order">{index + 1}</span>
              <span className="selected-destination-name"><b>{place?.name || "Điểm đến không còn khả dụng"}</b>
                <small>{place?.status === "archived" ? "Đã lưu trữ · hãy gỡ khỏi lựa chọn" : place?.locality || place?.address || ""}</small>
              </span>
              <div className="array-actions">
                {ordered && <><Button type="button" variant="ghost" disabled={index === 0} onClick={() => move(index, index - 1)} aria-label={`Đưa ${place?.name || id} lên`}>Lên</Button>
                  <Button type="button" variant="ghost" disabled={index === selected.length - 1} onClick={() => move(index, index + 1)} aria-label={`Đưa ${place?.name || id} xuống`}>Xuống</Button></>}
                <button type="button" className="icon-button danger" aria-label={`Bỏ ${place?.name || id}`} onClick={() => onChange(selected.filter(value => value !== id))}>×</button>
              </div>
            </li>;
          })}
        </ol>
      </div>}
    </div>
  );
}
