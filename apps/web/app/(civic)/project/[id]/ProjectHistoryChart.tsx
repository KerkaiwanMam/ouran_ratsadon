"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { BudgetHistory } from "@/types/civic";

interface Props {
  history: BudgetHistory[];
  currentYear: string;
  hasFlag: boolean;
}

function formatBillions(value: number) {
  return `฿${(value / 1e9).toFixed(1)}B`;
}

export default function ProjectHistoryChart({ history, currentYear, hasFlag }: Props) {
  const data = history.map((h) => ({
    year: h.year,
    amount: h.amount,
    isCurrent: h.year === currentYear,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <XAxis
          dataKey="year"
          tick={{ fontSize: 12, fill: "currentColor" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={formatBillions}
          tick={{ fontSize: 11, fill: "currentColor" }}
          tickLine={false}
          axisLine={false}
          width={70}
        />
        <Tooltip
          formatter={(value: number) => [formatBillions(value), "วงเงิน"]}
          labelFormatter={(label) => `ปีงบประมาณ ${label}`}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            fontSize: 12,
          }}
        />
        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={
                entry.isCurrent && hasFlag
                  ? "#E24B4A"
                  : entry.isCurrent
                  ? "#7F77DD"
                  : "#C7C4F0"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
