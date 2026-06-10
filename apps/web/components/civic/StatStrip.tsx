import { formatCurrency } from "@/utils/format";

interface Stat {
  label: string;
  value: string | number;
  highlight?: boolean;
  danger?: boolean;
}

interface Props {
  stats: Stat[];
}

export default function StatStrip({ stats }: Props) {
  return (
    <div className="flex flex-wrap items-stretch gap-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden divide-x divide-gray-100 dark:divide-gray-800">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={`flex flex-col px-5 py-3 min-w-[120px] ${
            i === 0 ? "" : ""
          }`}
        >
          <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-0.5">
            {stat.label}
          </span>
          <span
            className={`text-xl font-bold tabular-nums leading-tight ${
              stat.danger
                ? "text-red-600 dark:text-red-400"
                : stat.highlight
                ? "text-[#7F77DD]"
                : "text-gray-900 dark:text-gray-100"
            }`}
          >
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function formatBudget(amount: number): string {
  if (amount >= 1_000_000_000_000) {
    return `฿${(amount / 1_000_000_000_000).toFixed(2)} ล้านล้าน`;
  }
  if (amount >= 1_000_000_000) {
    return `฿${(amount / 1_000_000_000).toFixed(1)} พันล้าน`;
  }
  if (amount >= 1_000_000) {
    return `฿${(amount / 1_000_000).toFixed(1)} ล้าน`;
  }
  return formatCurrency(amount);
}
