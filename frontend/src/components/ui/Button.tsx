import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "success" | "accent";
  loading?: boolean;
  icon?: ReactNode;
}

export default function Button({
  children,
  variant = "primary",
  loading = false,
  icon,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`ui-button ui-button--${variant} ${loading ? "ui-button--loading" : ""} ${className}`}
      aria-busy={loading || undefined}
    >
      {icon && <span className="ui-button__icon">{icon}</span>}
      {loading ? "Loading..." : children}
    </button>
  );
}
