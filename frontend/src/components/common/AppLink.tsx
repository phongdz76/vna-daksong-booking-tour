import { Link, useNavigate, type LinkProps } from "react-router-dom";
import { usePreview } from "../../context/PreviewContext";

export function useAppNavigate() {
  const navigate = useNavigate();
  const { isPreview } = usePreview();
  return (to: string | number, replace = false) => {
    if (typeof to === "number") {
      navigate(to);
      return;
    }
    navigate(isPreview ? `${to}${to.includes("?") ? "&" : "?"}preview=1` : to, {
      replace,
    });
  };
}
export default function AppLink({
  to,
  ...props
}: Omit<LinkProps, "to"> & { to: string }) {
  const { isPreview } = usePreview();
  return (
    <Link
      {...props}
      to={isPreview ? `${to}${to.includes("?") ? "&" : "?"}preview=1` : to}
    />
  );
}
