import React, { createContext, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

type ToastType = 'success' | 'error';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{
      success: (message) => addToast(message, 'success'),
      error: (message) => addToast(message, 'error')
    }}>
      {children}
      
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="pointer-events-auto flex items-start gap-3 w-[320px] p-4 bg-[#171f33] border border-[#ae88831a] rounded-xl shadow-2xl backdrop-blur-md"
            >
              <div className="shrink-0 mt-0.5">
                {toast.type === 'success' ? (
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="text-green-500" size={16} />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                    <AlertCircle className="text-red-500" size={16} />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-sm font-semibold text-white">
                  {toast.type === 'success' ? 'Success' : 'Error'}
                </p>
                <p className="text-xs text-[#e7bdb8] opacity-80 mt-1 line-clamp-2 leading-relaxed">
                  {toast.message}
                </p>
              </div>

              <button 
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-[#e7bdb8] opacity-40 hover:opacity-100 transition-opacity p-1"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
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
