import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content">
        <button
          className="icon-button modal-close"
          aria-label="Cerrar"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
        <span className="eyebrow">La Trampa · club del bosque</span>
        <h2 id="modal-title">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
