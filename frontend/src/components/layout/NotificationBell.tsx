import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNotifications } from "../../context/NotificationContext";
import { useAuth } from "../../context/AuthContext";
import { usePreview } from "../../context/PreviewContext";
import { dateTime } from "../../utils/format";
import AppLink from "../common/AppLink";
import Icon from "../common/Icon";

export default function NotificationBell() {
  const notifications = useNotifications();
  const { user } = useAuth();
  const { isPreview } = usePreview();
  const dialog = useRef<HTMLDialogElement>(null);
  const [saving, setSaving] = useState(false);
  const unread = user || isPreview ? notifications.data?.unreadCount || 0 : 0;
  return (
    <>
      <button
        type="button"
        className="icon-button header-action notification-bell"
        aria-label={unread ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}
        aria-haspopup="dialog"
        onClick={() => {
          dialog.current?.showModal();
          void notifications.refresh();
        }}
      >
        <Icon name="bell" size={21} />
        {unread > 0 && (
          <span className="notification-count" aria-hidden="true">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {createPortal(
        <dialog
          ref={dialog}
          className="notification-dialog"
          aria-labelledby="notification-heading"
          onClick={(event) => {
            if (event.target === event.currentTarget) dialog.current?.close();
          }}
        >
          <div className="notification-panel">
            <div className="notification-panel-heading">
              <button
                type="button"
                className="icon-button"
                aria-label="Quay lại"
                onClick={() => dialog.current?.close()}
              >
                <Icon name="back" />
              </button>
              <div>
                <span className="eyebrow">VNA ĐẮK SONG</span>
                <h2 id="notification-heading">Thông báo</h2>
              </div>
            </div>
            <div className="notification-tabs" aria-label="Lọc thông báo">
              {[
                ["all", "Tất cả"],
                ["article", "Bài viết"],
                ["trip", "Chuyến đi"],
                ["payment", "Thanh toán"],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={notifications.type === value ? "selected" : ""}
                  aria-pressed={notifications.type === value}
                  onClick={() => notifications.setType(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            {user || isPreview ? (
              <div className="notification-toolbar">
                <span>{notifications.data?.unreadCount || 0} chưa đọc</span>
                <button
                  type="button"
                  className="text-link"
                  disabled={saving || !notifications.data?.unreadCount}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await notifications.markAllRead();
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Đọc tất cả
                </button>
              </div>
            ) : (
              <p className="notification-login">
                Đăng nhập để xem thông báo chuyến đi, thanh toán và lưu trạng
                thái đã đọc.{" "}
                <AppLink to="/login" onClick={() => dialog.current?.close()}>
                  Đăng nhập
                </AppLink>
              </p>
            )}
            {notifications.error && (
              <p className="notification-error" role="alert">
                {notifications.error}{" "}
                <button
                  type="button"
                  className="text-link"
                  onClick={() => void notifications.refresh()}
                >
                  Thử lại
                </button>
              </p>
            )}
            <div className="notification-list" aria-live="polite">
              {notifications.loading ? (
                <p className="notification-empty">Đang tải thông báo…</p>
              ) : notifications.data?.data.length ? (
                notifications.data.data.map((item) => (
                  <AppLink
                    className={`notification-item ${item.readAt ? "" : "unread"}`}
                    key={item.id}
                    to={item.href}
                    onClick={() => {
                      void notifications.markRead(item.id);
                      dialog.current?.close();
                    }}
                  >
                    <span className={`notification-type-icon ${item.type}`}>
                      <Icon
                        name={
                          item.type === "article"
                            ? "book"
                            : item.type === "payment"
                              ? "wallet"
                              : "ticket"
                        }
                        size={21}
                      />
                    </span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.message}</p>
                      <time dateTime={item.createdAt}>
                        {dateTime(item.createdAt)}
                      </time>
                    </div>
                    {!item.readAt && (user || isPreview) && (
                      <i
                        className="notification-unread-dot"
                        aria-label="Chưa đọc"
                      />
                    )}
                  </AppLink>
                ))
              ) : (
                !notifications.error && (
                  <p className="notification-empty">
                    {notifications.type === "all"
                      ? "Bạn chưa có thông báo nào."
                      : "Chưa có thông báo trong mục này."}
                  </p>
                )
              )}
              {notifications.canLoadMore && (
                <button
                  type="button"
                  className="notification-more"
                  onClick={notifications.loadMore}
                >
                  Xem thêm thông báo <Icon name="chevron" size={16} />
                </button>
              )}
              {notifications.data && notifications.data.data.length >= 100 && (
                <p className="notification-empty">
                  Đang hiển thị 100 thông báo gần nhất.
                </p>
              )}
            </div>
          </div>
        </dialog>,
        document.body,
      )}
    </>
  );
}
