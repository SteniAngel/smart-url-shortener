import type { ReactNode } from "react";

interface StatusMessageProps {
  type?: "success" | "error" | "info";
  children: ReactNode;
}

const tone = {
  success: "status-message--success",
  error: "status-message--error",
  info: "status-message--info",
};

export default function StatusMessage({ type = "info", children }: StatusMessageProps) {
  return (
    <div role="status" className={`status-message ${tone[type]}`}>
      {children}
    </div>
  );
}
