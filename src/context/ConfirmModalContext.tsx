import React, { createContext, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  withInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  defaultInputValue?: string;
}

interface ConfirmState {
  options: ConfirmOptions;
  resolve: (result: { confirmed: boolean; value?: string }) => void;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: ConfirmOptions) => Promise<string | null>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmModalProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);
  const [inputVal, setInputVal] = useState('');

  const confirm = (options: ConfirmOptions) =>
    new Promise<boolean>((resolve) => {
      setInputVal('');
      setState({
        options: { ...options, withInput: false },
        resolve: ({ confirmed }) => resolve(confirmed),
      });
    });

  const prompt = (options: ConfirmOptions) =>
    new Promise<string | null>((resolve) => {
      setInputVal(options.defaultInputValue || '');
      setState({
        options: { ...options, withInput: true },
        resolve: ({ confirmed, value }) => resolve(confirmed ? (value ?? '') : null),
      });
    });

  const handleClose = (confirmed: boolean) => {
    if (!state) return;
    const resolver = state.resolve;
    const val = inputVal;
    setState(null);
    resolver({ confirmed, value: val });
  };

  return (
    <ConfirmContext.Provider value={{ confirm, prompt }}>
      {children}
      <AnimatePresence>
        {state && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      state.options.variant === 'danger'
                        ? 'bg-red-50 text-[#D4191F]'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <AlertTriangle size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 leading-snug break-words">
                    {state.options.title}
                  </h3>
                </div>
                <button
                  onClick={() => handleClose(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed mb-5 break-words">
                {state.options.message}
              </p>

              {state.options.withInput && (
                <div className="mb-5">
                  {state.options.inputLabel && (
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                      {state.options.inputLabel}
                    </label>
                  )}
                  <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder={state.options.inputPlaceholder || ''}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-[#D4191F] focus:bg-white"
                    autoFocus
                  />
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  {state.options.cancelText || 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => handleClose(true)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors ${
                    state.options.variant === 'danger'
                      ? 'bg-[#D4191F] hover:bg-red-700'
                      : 'bg-[#141414] hover:bg-black'
                  }`}
                >
                  {state.options.confirmText || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirmModal() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirmModal must be used within ConfirmModalProvider');
  return ctx;
}
