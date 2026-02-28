import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TopProduct } from '../../types/reports.types';

interface Props {
  data: TopProduct[];
}

/**
 * Horizontal bar chart of the top 10 most requested products.
 */
export function TopProductsChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-44 text-gray-400 text-sm">
        Sem dados de produtos no período
      </div>
    );
  }

  // Truncate long names for axis legibility
  const chartData = data.map((p) => ({
    name: p.productName.length > 18 ? p.productName.slice(0, 16) + '…' : p.productName,
    total: p.totalRequested,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
        <YAxis
          dataKey="name"
          type="category"
          tick={{ fontSize: 11 }}
          width={130}
        />
        <Tooltip
          formatter={(value: number) => [value, 'Solicitações']}
        />
        <Bar dataKey="total" name="Solicitações" fill="#16a34a" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
