import { useState } from "react";
import Icon from "./Icon";

export default function Photo({
  src,
  alt,
  className = "",
  eager = false,
  hideOnError = false,
}: {
  src?: string;
  alt: string;
  className?: string;
  eager?: boolean;
  hideOnError?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState("");
  if (hideOnError && (!src || failedUrl === src)) return null;
  return (
    <div className={`photo ${className}`}>
      {src && failedUrl !== src ? (
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          onError={() => setFailedUrl(src)}
        />
      ) : (
        <span className="photo-placeholder">
          <Icon name="mountain" size={32} />
          <span>Ảnh đang cập nhật</span>
        </span>
      )}
    </div>
  );
}
