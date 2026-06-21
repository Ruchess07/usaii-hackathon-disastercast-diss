import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-medium transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer select-none";
  const variants = {
    primary: "bg-[#111] text-white hover:bg-[#333] active:scale-[0.98]",
    secondary:
      "border border-[#EAEAEA] bg-white text-[#1E293B] hover:bg-[#F7F6F3] active:scale-[0.98]",
    ghost: "text-[#1E293B] hover:bg-[#F7F6F3] active:scale-[0.98]",
  };
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-5 text-sm",
    lg: "h-12 px-6 text-base",
  };
  return (
    <button
      className={cn(base, variants[variant], sizes[size], disabled && "opacity-40 pointer-events-none", className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
