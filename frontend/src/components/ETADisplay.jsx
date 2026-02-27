/**
 * ETADisplay shows the estimated time of arrival, updated in real-time.
 *
 * @param {{ eta: number|null, isConnected: boolean }} props
 */
export default function ETADisplay({ eta, isConnected }) {
  return (
    <div className="eta-display" aria-live="polite" aria-label="Tempo estimado de chegada">
      {!isConnected && (
        <span className="eta-display__offline">Conectando…</span>
      )}
      {isConnected && eta !== null && (
        <span className="eta-display__time">
          <strong>{eta}</strong> min para entrega
        </span>
      )}
      {isConnected && eta === null && (
        <span className="eta-display__waiting">Aguardando dados do motorista…</span>
      )}
    </div>
  );
}
