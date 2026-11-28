import React, { createContext, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider
      value={{
        success: (message) => addToast(message, 'success'),
        error: (message) => addToast(message, 'error'),
        info: (message) => addToast(message, 'info'),
      }}
    >
      {children}

      <div className="fixed top-4 right-4 z-[10001] flex flex-col gap-2.5 pointer-events-none w-[calc(100vw-2rem)] sm:w-auto sm:max-w-[400px]">
        <AnimatePresence>
          {toasts.map((toast) => {
            const isSuccess = toast.type === 'success';
            const isError = toast.type === 'error';
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.96 }}
                className={`pointer-events-auto flex items-start gap-3 w-full p-4 rounded-2xl shadow-[0_12px_32px_rgba(15,23,42,0.12)] border backdrop-blur-md ${
                  isSuccess
                    ? 'bg-white border-emerald-200 text-emerald-950'
                    : isError
                    ? 'bg-white border-red-200 text-red-950'
                    : 'bg-white border-gray-200 text-gray-900'
                }`}
              >
                <div
                  className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
                    isSuccess
                      ? 'bg-emerald-50 text-emerald-600'
                      : isError
                      ? 'bg-red-50 text-[#D4191F]'
                      : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {isSuccess ? (
                    <CheckCircle2 size={18} />
                  ) : isError ? (
                    <AlertCircle size={18} />
                  ) : (
                    <Info size={18} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-gray-900">
                    {isSuccess ? 'Success' : isError ? 'Notice' : 'Info'}
                  </p>
                  <p className="text-sm text-gray-700 mt-0.5 leading-snug break-words">
                    {toast.message}
                  </p>
                </div>

                <button
                  onClick={() => removeToast(toast.id)}
                  className="shrink-0 text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100"
                  aria-label="Dismiss notification"
                >
                  <X size={15} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
