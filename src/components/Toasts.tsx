import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useUI } from '../state/UIContext';

export function ToastViewport() {
  const { toasts, dismissToast } = useUI();
  if (toasts.length === 0) return null;

  return (
    <div className="toast-viewport" aria-live="polite" role="status">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.tone}`}>
          <span className="toast-icon" aria-hidden="true">
            {toast.tone === 'error' ? (
              <TriangleAlert size={18} strokeWidth={2.3} />
            ) : toast.tone === 'info' ? (
              <Info size={18} strokeWidth={2.3} />
            ) : (
              <CheckCircle2 size={18} strokeWidth={2.3} />
            )}
          </span>
          <span className="toast-message">{toast.message}</span>
          <button type="button" className="toast-close" onClick={() => dismissToast(toast.id)} aria-label="关闭提示">
            <X size={15} strokeWidth={2.4} />
          </button>
        </div>
      ))}
    </div>
  );
}
