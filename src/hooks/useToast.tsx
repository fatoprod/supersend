import { useEffect } from "react";
import { useUIStore } from "../stores/uiStore";

export function useToast() {
  const { toasts, addToast, removeToast } = useUIStore();

  const toast = {
    success: (title: string, message?: string) =>
      addToast({ type: "success", title, message, duration: 5000 }),
    error: (title: string, message?: string) =>
      addToast({ type: "error", title, message, duration: 7000 }),
    warning: (title: string, message?: string) =>
      addToast({ type: "warning", title, message, duration: 5000 }),
    info: (title: string, message?: string) =>
      addToast({ type: "info", title, message, duration: 5000 }),
  };

  return { toasts, toast, removeToast };
}

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  useEffect(() => {
    const timers = toasts.map((toast) => {
      if (toast.duration) {
        return setTimeout(() => removeToast(toast.id), toast.duration);
      }
      return null;
    });

    return () => {
      timers.forEach((timer) => timer && clearTimeout(timer));
    };
  }, [toasts, removeToast]);

  if (toasts.length === 0) return null;

  const getToastStyles = (type: string) => {
    switch (type) {
      case "success":
        return "bg-success/10 border-success text-success";
      case "error":
        return "bg-error/10 border-error text-error";
      case "warning":
        return "bg-accent/10 border-accent text-accent";
      default:
        return "bg-primary/10 border-primary text-primary";
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-lg border px-4 py-3 shadow-lg ${getToastStyles(toast.type)}`}
          role="alert"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="font-medium">{toast.title}</p>
              {toast.message && (
                <p className="mt-1 text-sm opacity-80">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
