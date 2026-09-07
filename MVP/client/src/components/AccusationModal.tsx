export function AccusationModal({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="accuse-title" onMouseDown={(event) => event.stopPropagation()}>
        <span className="eyebrow">Acusación pública</span>
        <h2 id="accuse-title">¿Acusar a {name}?</h2>
        <p>Si tiene una trampa pendiente quedará eliminado. Una acusación incorrecta no tiene penalización.</p>
        <div className="button-row">
          <button className="button secondary" onClick={onCancel}>Cancelar</button>
          <button className="button danger" onClick={onConfirm}>Confirmar acusación</button>
        </div>
      </section>
    </div>
  );
}
