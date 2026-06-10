"use client";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface PieDataItem {
  name: string;
  value: number;
}

interface SpendingPieChartProps {
  data: PieDataItem[];
}

const COLORS = ["#7F77DD", "#534AB7", "#1D9E75", "#EF9F27", "#E24B4A", "#9CA3AF"];

export default function SpendingPieChart({ data }: SpendingPieChartProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border">
      <h3 className="text-sm font-medium mb-4">สัดส่วนการใช้จ่าย</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
