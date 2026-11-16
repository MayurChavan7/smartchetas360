
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description: string;
  children?: ReactNode;
}

function PageHeader({
  title,
  description,
  children,
}: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-[#102B3D] sm:text-3xl">
          {title}
        </h1>

        <p className="mt-2 text-sm font-medium leading-relaxed text-[#64748B] sm:text-base">
          {description}
        </p>
      </div>

      {children && (
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {children}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
