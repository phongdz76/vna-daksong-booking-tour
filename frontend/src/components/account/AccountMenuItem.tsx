import type { ReactNode } from "react";
import AppLink from "../common/AppLink";
import Icon from "../common/Icon";

export default function AccountMenuItem({
  icon,
  title,
  description,
  to,
  onClick,
  tone = "green",
  trailing,
  pressed,
}: {
  icon: string;
  title: string;
  description: string;
  to?: string;
  onClick?: () => void;
  tone?: "green" | "clay" | "neutral";
  trailing?: ReactNode;
  pressed?: boolean;
}) {
  const content = (
    <>
      <span className={"account-menu-icon " + tone}>
        <Icon name={icon} size={20} />
      </span>
      <span className="account-menu-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      {trailing || (
        <Icon name="chevron" size={20} className="account-menu-chevron" />
      )}
    </>
  );
  return to ? (
    <AppLink className="account-menu-row" to={to}>
      {content}
    </AppLink>
  ) : (
    <button
      className="account-menu-row"
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
    >
      {content}
    </button>
  );
}
