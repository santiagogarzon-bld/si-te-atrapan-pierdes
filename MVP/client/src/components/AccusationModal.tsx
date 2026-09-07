import { Modal } from "./Modal";
export function AccusationModal({
  name,
  onCancel,
  onConfirm,
}: {
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title={`¿Acusar a ${name}?`} onClose={onCancel}>
      <p>
        Si tiene una trampa pendiente, quedará eliminado. Una acusación
        incorrecta no tiene penalización.
      </p>
      <div className="button-row">
        <button className="button secondary" onClick={onCancel}>
          Mejor no
        </button>
        <button className="button danger" onClick={onConfirm}>
          ¡Está haciendo trampa!
        </button>
      </div>
    </Modal>
  );
}
