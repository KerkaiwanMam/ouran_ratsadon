"use client";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface PieDataItem {
  name: string;
  value: number;
}

interface SpendingPieChartProps {
  data: PieDataItem[];
  onSliceClick?: (name: string) => void;
}

const COLORS = ["#7F77DD", "#534AB7", "#1D9E75", "#EF9F27", "#E24B4A", "#9CA3AF"];

export default function SpendingPieChart({ data, onSliceClick }: SpendingPieChartProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border">
      <h3 className="text-sm font-medium mb-1">สัดส่วนการใช้จ่าย</h3>
      {onSliceClick && (
        <p className="text-xs text-gray-400 mb-3">คลิกหมวดหมู่เพื่อดูรายการ</p>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            onClick={onSliceClick ? (entry) => onSliceClick(entry.name) : undefined}
            cursor={onSliceClick ? "pointer" : undefined}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name ?? index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
