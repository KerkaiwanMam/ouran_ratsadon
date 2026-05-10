interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "neutral";
}

export default function StatCard({ label, value, unit, trend }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">
        {value}
        {unit && <span className="text-base font-normal text-gray-500 ml-1">{unit}</span>}
      </p>
      {trend && (
        <span
          className={`text-xs mt-1 inline-block ${
            trend === "up" ? "text-[#E24B4A]" : trend === "down" ? "text-[#1D9E75]" : "text-gray-400"
          }`}
        >
          {trend === "up" ? "▲" : trend === "down" ? "▼" : "—"}
        </span>
      )}
    </div>
  );
}
