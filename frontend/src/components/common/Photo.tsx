import { useState } from "react";
import Icon from "./Icon";
import { resolveImageUrl } from "../../utils/imageUrl";

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
  const imageSrc = resolveImageUrl(src);
  if (hideOnError && (!imageSrc || failedUrl === imageSrc)) return null;
  return (
    <div className={`photo ${className}`}>
      {imageSrc && failedUrl !== imageSrc ? (
        <img
          src={imageSrc}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          onError={() => setFailedUrl(imageSrc)}
        />
      ) : (
        <span className="photo-placeholder">
          <Icon name="mountain" size={32} />
          <span>{imageSrc ? "Không tải được ảnh" : "Ảnh đang cập nhật"}</span>
        </span>
      )}
    </div>
  );
}
