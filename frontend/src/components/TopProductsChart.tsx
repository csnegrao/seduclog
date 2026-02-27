import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TopProduct } from '../types';

interface Props {
  data: TopProduct[];
}

export default function TopProductsChart({ data }: Props) {
  return (
    <div className="chart-card">
      <h3 className="chart-title">Top 10 Produtos Mais Solicitados</h3>
      {data.length === 0 ? (
        <p className="no-data">Sem dados no período</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 120, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
            <Tooltip />
            <Bar dataKey="total_requested" fill="#22c55e" name="Qtd Solicitada" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
