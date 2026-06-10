"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartDataItem {
  name: string;
  budget: number;
  spent: number;
}

interface BudgetBarChartProps {
  data: ChartDataItem[];
}

export default function BudgetBarChart({ data }: BudgetBarChartProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border">
      <h3 className="text-sm font-medium mb-4">งบประมาณตามหมวดหมู่</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="budget" fill="#7F77DD" name="งบประมาณ" radius={[4, 4, 0, 0]} />
          <Bar dataKey="spent" fill="#534AB7" name="เบิกจ่าย" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
