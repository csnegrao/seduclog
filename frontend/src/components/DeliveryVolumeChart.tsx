import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DailyVolume } from '../types';

interface Props {
  data: DailyVolume[];
}

export default function DeliveryVolumeChart({ data }: Props) {
  return (
    <div className="chart-card">
      <h3 className="chart-title">Volume de Entregas Diário</h3>
      {data.length === 0 ? (
        <p className="no-data">Sem dados no período</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Entregas"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
