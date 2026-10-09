import { useState } from "react";
import Icon from "./Icon";

export default function AccountAvatar({
  src,
  name = "",
  size = 18,
}: {
  src?: string;
  name?: string;
  size?: number;
}) {
  const [failedUrl, setFailedUrl] = useState("");
  return src && failedUrl !== src ? (
    <img src={src} alt={name} onError={() => setFailedUrl(src)} />
  ) : (
    <Icon name="user" size={size} />
  );
}
