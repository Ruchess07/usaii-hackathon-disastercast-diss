import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "cost" | "success" | "warning" | "info";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const styles = {
    default: "bg-[#F7F6F3] text-[#1E293B]",
    cost: "bg-[#FDEBEC] text-[#9F2F2D]",
    success: "bg-[#EDF3EC] text-[#346538]",
    warning: "bg-[#FBF3DB] text-[#956400]",
    info: "bg-[#E1F3FE] text-[#1F6C9F]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]",
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
