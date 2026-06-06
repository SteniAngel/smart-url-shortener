import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export default function SectionHeader({ title, description, children }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {children}
    </div>
  );
}
