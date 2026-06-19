import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-white border border-[#EAEAEA] rounded-[8px] p-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  subtitle,
  variant = "default",
  chart,
}: {
  label: string;
  value: string;
  subtitle?: string;
  variant?: "default" | "cost" | "success" | "warning";
  chart?: React.ReactNode;
}) {
  const valueColors = {
    default: "text-[#1E293B]",
    cost: "text-[#9F2F2D]",
    success: "text-[#346538]",
    warning: "text-[#956400]",
  };
  return (
    <Card>
      <p className="text-[10px] uppercase tracking-[0.08em] text-[#787774] mb-1">
        {label}
      </p>
      <p className={`text-xl font-semibold ${valueColors[variant]} leading-tight`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-[11px] text-[#787774] mt-1">{subtitle}</p>
      )}
      {chart && <div className="mt-1.5">{chart}</div>}
    </Card>
  );
}
