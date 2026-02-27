import './StatusTimeline.css';

export const DELIVERY_STEPS = [
  { key: 'approved', label: 'Pedido Aprovado' },
  { key: 'picking', label: 'Coletando' },
  { key: 'dispatched', label: 'Despachado' },
  { key: 'arriving', label: 'Chegando' },
  { key: 'delivered', label: 'Entregue' },
];

/**
 * StatusTimeline shows the delivery progress through all status steps.
 *
 * @param {{ status: string }} props
 */
export default function StatusTimeline({ status }) {
  const currentIndex = DELIVERY_STEPS.findIndex((s) => s.key === status);

  return (
    <ol className="status-timeline" aria-label="Status da entrega">
      {DELIVERY_STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        let stepClass = 'step';
        if (isDone) stepClass += ' step--done';
        if (isCurrent) stepClass += ' step--current';

        return (
          <li key={step.key} className={stepClass} aria-current={isCurrent ? 'step' : undefined}>
            <span className="step__dot" aria-hidden="true" />
            <span className="step__label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
