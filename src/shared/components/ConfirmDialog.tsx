import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  theme: string;
  input?: {
    value: string;
    placeholder?: string;
    autoFocus?: boolean;
  };
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: (inputValue?: string) => void;
  onClose: () => void;
  onCancel?: () => void;
}

const ConfirmDialog = ({
  open,
  title,
  message,
  theme,
  input,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
  onCancel
}: ConfirmDialogProps) => {
  const [inputValue, setInputValue] = useState(input?.value ?? "");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setInputValue(input?.value ?? "");
      if (input?.autoFocus) {
        window.setTimeout(() => {
          activateInputFocus();
          inputRef.current?.focus();
        }, 0);
      }
    }
  }, [input?.value, open]);

  if (!open) return null;

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    onClose();
  };

  const handleConfirm = () => {
    onConfirm(input ? inputValue : undefined);
  };

  const activateInputFocus = () => {
    invoke("activate_window_focus").catch(console.error);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`confirm-dialog theme-${theme}`} onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-title">{title}</div>
        <div className="confirm-dialog-message">{message}</div>
        {input && (
          <input
            ref={inputRef}
            className="confirm-dialog-input"
            value={inputValue}
            placeholder={input.placeholder}
            autoFocus={input.autoFocus}
            onMouseDown={(event) => {
              event.stopPropagation();
              activateInputFocus();
            }}
            onFocus={activateInputFocus}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Enter") {
                handleConfirm();
              }
              if (event.key === "Escape") {
                handleCancel();
              }
            }}
          />
        )}
        <div className="confirm-dialog-buttons">
          <button className="confirm-dialog-button" onClick={handleCancel}>
            {cancelLabel}
          </button>
          <button className="confirm-dialog-button primary" onClick={handleConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
