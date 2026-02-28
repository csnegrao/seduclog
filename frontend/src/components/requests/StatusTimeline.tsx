import React from 'react';
import { RequestStatus } from '../../types/request.types';

interface Step {
  key: RequestStatus;
  label: string;
  icon: string;
}

const STEPS: Step[] = [
  { key: 'approved',   label: 'Aprovado',    icon: '✅' },
  { key: 'in_progress', label: 'Separação',  icon: '📦' },
  { key: 'in_transit', label: 'Despachado',  icon: '🚐' },
  { key: 'delivered',  label: 'Entregue',    icon: '🏫' },
];

/** Map each status to the furthest step it represents. */
const STATUS_INDEX: Partial<Record<RequestStatus, number>> = {
  pending:     -1,
  approved:     0,
  in_progress:  1,
  in_transit:   2,
  delivered:    3,
};

interface Props {
  status: RequestStatus;
}

/**
 * Horizontal status timeline showing the lifecycle of a delivery:
 * Request Approved → Picking → Dispatched → Delivered.
 *
 * Steps before or at the current status are highlighted; future steps are muted.
 */
export function StatusTimeline({ status }: Props) {
  const currentIndex = STATUS_INDEX[status] ?? -1;

  return (
    <div className="flex items-start gap-0" role="list" aria-label="Status da entrega">
      {STEPS.map((step, idx) => {
        const isDone    = idx < currentIndex;
        const isActive  = idx === currentIndex;
        const isFuture  = idx > currentIndex;

        return (
          <React.Fragment key={step.key}>
            {/* Step node */}
            <div
              className="flex flex-col items-center flex-1 min-w-0"
              role="listitem"
              aria-current={isActive ? 'step' : undefined}
            >
              {/* Circle */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-base transition-colors ${
                  isDone
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isDone ? '✓' : step.icon}
              </div>

              {/* Label */}
              <p
                className={`mt-1 text-center text-xs leading-tight px-1 ${
                  isDone ? 'text-green-600 font-medium' :
                  isActive ? 'text-blue-700 font-semibold' :
                  isFuture ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                {step.label}
              </p>
            </div>

            {/* Connector line between steps */}
            {idx < STEPS.length - 1 && (
              <div
                className={`flex-1 h-1 mt-4 rounded-full transition-colors ${
                  idx < currentIndex ? 'bg-green-400' : 'bg-gray-200'
                }`}
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
