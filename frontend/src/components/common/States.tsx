import Icon from "./Icon";

export function LoadingState() {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" />
      <span>Đang chuẩn bị hành trình…</span>
    </div>
  );
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name="compass" size={32} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="empty-state" role="alert">
      <span className="empty-icon">
        <Icon name="info" size={32} />
      </span>
      <h2>Chưa tải được nội dung</h2>
      <p>{message}</p>
      <button className="button button-outline" onClick={retry}>
        Thử lại
      </button>
      {import.meta.env.DEV && (
        <a className="text-link" href="/?preview=1">
          Xem giao diện với dữ liệu mẫu
        </a>
      )}
    </div>
  );
}
