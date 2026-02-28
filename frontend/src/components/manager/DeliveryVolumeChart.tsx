import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DailyVolumeEntry } from '../../types/reports.types';

interface Props {
  data: DailyVolumeEntry[];
}

/**
 * Line chart showing daily delivery volume for the selected period.
 * Uses recharts ResponsiveContainer so it adapts to its container width.
 */
export function DeliveryVolumeChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-44 text-gray-400 text-sm">
        Sem dados de entrega no período
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(d: string) => d.slice(5)} // MM-DD
        />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={32} />
        <Tooltip
          formatter={(value: number) => [value, 'Entregas']}
          labelFormatter={(label: string) => `Data: ${label}`}
        />
        <Line
          type="monotone"
          dataKey="count"
          name="Entregas"
          stroke="#2563eb"
          strokeWidth={2}
          dot={{ r: 3, fill: '#2563eb' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
