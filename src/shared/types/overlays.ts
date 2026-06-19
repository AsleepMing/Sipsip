export type ToastItem = {
  id: number;
  msg: string;
};

export type ConfirmDialogState = {
  show: boolean;
  title: string;
  message: string;
  input?: {
    value: string;
    placeholder?: string;
    autoFocus?: boolean;
  };
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (inputValue?: string) => void;
  onCancel?: () => void;
};
