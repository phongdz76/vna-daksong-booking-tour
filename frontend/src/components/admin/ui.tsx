import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import type { Pagination as PageData } from "../../types/admin";
import Icon from "./Icon";

export function Button({
  children,
  variant = "primary",
  icon,
  busy,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: string;
  busy?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={`button ${variant} ${props.className || ""}`}
    >
      {busy ? (
        <span className="spinner small" />
      ) : icon ? (
        <Icon name={icon} size={18} />
      ) : null}
      {children}
    </button>
  );
}
export function Badge({
  children,
  color = "gray",
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <span className={`badge ${color}`}>
      <span className="badge-dot" />
      {children}
    </span>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  dark = false,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
  dark?: boolean;
}) {
  return (
    <section className={`page-header ${dark ? "dark" : ""}`}>
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children && <div className="header-actions">{children}</div>}
    </section>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`notice ${error ? "error" : ""}`}
      role={error ? "alert" : "status"}
    >
      <Icon name={error ? "alert" : "info"} />
      <div>{children}</div>
    </div>
  );
}
export function Empty({
  title = "Chưa có dữ liệu",
  description = "Dữ liệu sẽ xuất hiện tại đây khi được cập nhật.",
  children,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name="leaf" size={30} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      Đang tải dữ liệu…
    </div>
  );
}
export function QueryState({
  loading,
  error,
  retry,
  children,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
  children: ReactNode;
}) {
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="query-error">
        <Notice error>{error}</Notice>
        <Button variant="secondary" icon="refresh" onClick={retry}>
          Thử lại
        </Button>
      </div>
    );
  return <>{children}</>;
}
export function Pagination({
  data,
  onPage,
  onLimit,
}: {
  data: PageData;
  onPage: (n: number) => void;
  onLimit?: (n: number) => void;
}) {
  const start = data.total ? (data.page - 1) * data.limit + 1 : 0;
  const end = Math.min(data.page * data.limit, data.total);
  const hasMultiplePages = data.pages > 1;
  useEffect(() => {
    if (data.pages > 0 && data.page > data.pages) onPage(data.pages);
  }, [data.page, data.pages, onPage]);
  return (
    <div className="pagination">
      <div>
        {hasMultiplePages ? (
          <>
            Hiển thị{" "}
            <strong>
              {start}–{end}
            </strong>{" "}
            trong <strong>{data.total}</strong> kết quả
          </>
        ) : (
          <>
            Tổng cộng <strong>{data.total}</strong> kết quả
          </>
        )}
      </div>
      {hasMultiplePages && (
        <div className="page-buttons">
          <button
            aria-label="Trang trước"
            disabled={data.page <= 1}
            onClick={() => onPage(data.page - 1)}
          >
            <Icon name="chevron" style={{ transform: "rotate(180deg)" }} />
          </button>
          <span>
            Trang {data.page} / {data.pages}
          </span>
          <button
            aria-label="Trang sau"
            disabled={data.page >= data.pages}
            onClick={() => onPage(data.page + 1)}
          >
            <Icon name="chevron" />
          </button>
        </div>
      )}
    </div>
  );
}
export function Field({
  label,
  hint,
  children,
  full = false,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  full?: boolean;
}) {
  const id = useId();
  const control =
    isValidElement(children) &&
    ["input", "select", "textarea"].includes(String(children.type));
  const child = children as ReactElement<{ id?: string }>;
  const controlId = control ? child.props.id || `${id}-control` : undefined;
  return (
    <div className={`field ${full ? "full" : ""}`}>
      <label id={id} htmlFor={controlId}>
        {label}
      </label>
      <div className="field-control" aria-labelledby={id}>
        {control ? cloneElement(child, { id: controlId }) : children}
      </div>
      {hint && <small>{hint}</small>}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const el = ref.current;
    const previous = document.activeElement as HTMLElement;
    el?.showModal();
    return () => {
      el?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current && !busy) onClose();
      }}
    >
      <div className="modal-header">
        <div>
          <span className="eyebrow">VNA ĐẮK SONG</span>
          <h2 id={titleId}>{title}</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Đóng"
          onClick={onClose}
          disabled={busy}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Confirm({
  title,
  children,
  action,
  danger = false,
  onConfirm,
  onClose,
}: {
  title: string;
  children: ReactNode;
  action: string;
  danger?: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal title={title} onClose={onClose} busy={busy}>
      <div className="modal-body">
        {children}
        {error && <Notice error>{error}</Notice>}
      </div>
      <div className="modal-footer">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Quay lại
        </Button>
        <Button
          variant={danger ? "danger" : "primary"}
          busy={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await onConfirm();
              onClose();
            } catch (error) {
              setError(
                error instanceof Error
                  ? error.message
                  : "Chưa thực hiện được thao tác.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {action}
        </Button>
      </div>
    </Modal>
  );
}
export function Stat({
  title,
  value,
  caption,
  icon = "dashboard",
  accent = false,
}: {
  title: string;
  value: ReactNode;
  caption: string;
  icon?: string;
  accent?: boolean;
}) {
  return (
    <div className={`stat-card ${accent ? "accent" : ""}`}>
      <div className="stat-top">
        <span>{title}</span>
        <span className="stat-icon">
          <Icon name={icon} />
        </span>
      </div>
      <div className="stat-value">{value}</div>
      <p>{caption}</p>
    </div>
  );
}
export function Photo({
  src,
  alt = "",
  className = "",
}: {
  src?: string;
  alt?: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  return src && !broken ? (
    <img
      className={`photo ${className}`}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  ) : (
    <span className={`photo placeholder ${className}`} aria-label="Chưa có ảnh">
      <Icon name="image" size={24} />
    </span>
  );
}
