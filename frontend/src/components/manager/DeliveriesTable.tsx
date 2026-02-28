import React, { useState } from 'react';
import { DivergenceRecord } from '../../types/reports.types';
import { DeliveryOrder } from '../../types/warehouse.types';

type RecentDelivery = Pick<
  DeliveryOrder,
  'id' | 'requestProtocol' | 'school' | 'driverName' | 'status' | 'createdAt' | 'deliveredAt'
>;

interface Props {
  deliveries: RecentDelivery[];
  divergences: DivergenceRecord[];
}

const STATUS_LABELS: Record<string, string> = {
  created:    'Criado',
  picking:    'Separação',
  ready:      'Pronto',
  in_transit: 'Em Trânsito',
  delivered:  'Entregue',
};

const STATUS_CLASSES: Record<string, string> = {
  created:    'bg-gray-100 text-gray-600',
  picking:    'bg-yellow-100 text-yellow-700',
  ready:      'bg-blue-100 text-blue-700',
  in_transit: 'bg-orange-100 text-orange-700',
  delivered:  'bg-green-100 text-green-700',
};

/**
 * Table of recent deliveries with status badges.
 * Rows with divergences are expandable to show missing/partial item details.
 */
export function DeliveriesTable({ deliveries, divergences }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const divergenceMap = new Map(divergences.map((d) => [d.orderId, d]));

  function toggleRow(id: string): void {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (deliveries.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8 text-sm">
        Sem entregas no período selecionado
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase text-gray-500 border-b border-gray-200">
            <th className="py-2 pr-4">Protocolo</th>
            <th className="py-2 pr-4">Escola</th>
            <th className="py-2 pr-4">Motorista</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Criado em</th>
            <th className="py-2 pr-4">Entregue em</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {deliveries.map((d) => {
            const hasDivergence = divergenceMap.has(d.id);
            const isExpanded = expanded.has(d.id);
            const divergence = divergenceMap.get(d.id);

            return (
              <React.Fragment key={d.id}>
                <tr
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    hasDivergence ? 'bg-red-50 hover:bg-red-100' : ''
                  }`}
                >
                  <td className="py-2 pr-4 font-mono text-xs">{d.requestProtocol}</td>
                  <td className="py-2 pr-4">{d.school}</td>
                  <td className="py-2 pr-4">{d.driverName}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_CLASSES[d.status] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {STATUS_LABELS[d.status] ?? d.status}
                    </span>
                    {hasDivergence && (
                      <span className="ml-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                        Divergência
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-xs text-gray-500">
                    {new Date(d.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-2 pr-4 text-xs text-gray-500">
                    {d.deliveredAt
                      ? new Date(d.deliveredAt).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="py-2 text-right">
                    {hasDivergence && (
                      <button
                        onClick={() => toggleRow(d.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        {isExpanded ? '▲ Ocultar' : '▼ Ver'}
                      </button>
                    )}
                  </td>
                </tr>

                {/* Expanded divergence detail */}
                {isExpanded && divergence && (
                  <tr className="bg-red-50 border-b border-red-100">
                    <td colSpan={7} className="px-6 py-3">
                      <p className="text-xs font-semibold text-red-700 mb-2">
                        Itens divergentes:
                      </p>
                      <ul className="space-y-1">
                        {divergence.items.map((item, idx) => (
                          <li key={idx} className="text-xs text-red-800 flex items-center gap-2">
                            <span
                              className={`rounded px-1.5 py-0.5 font-medium ${
                                item.divergenceType === 'missing'
                                  ? 'bg-red-200 text-red-800'
                                  : 'bg-orange-100 text-orange-700'
                              }`}
                            >
                              {item.divergenceType === 'missing' ? 'Faltante' : 'Parcial'}
                            </span>
                            <span>{item.productName}</span>
                            <span className="text-gray-500">
                              (aprovado: {item.approvedQuantity})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
