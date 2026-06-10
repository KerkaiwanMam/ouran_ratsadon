import type { FlagSeverity } from "@/types/civic";

interface Props {
  severity: FlagSeverity;
  label: string;
  size?: "sm" | "md";
}

const styles: Record<FlagSeverity, string> = {
  critical: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  warning: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
};

const icons: Record<FlagSeverity, string> = {
  critical: "🚨",
  warning: "⚠️",
};

export default function RedFlagBadge({ severity, label, size = "sm" }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 border rounded-full font-medium ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      } ${styles[severity]}`}
    >
      <span>{icons[severity]}</span>
      {label}
    </span>
  );
}
