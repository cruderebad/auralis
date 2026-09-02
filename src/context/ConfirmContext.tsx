import React, { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X, Info, ShieldAlert } from 'lucide-react';


interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  danger?: boolean;
  type?: 'confirm' | 'alert' | 'upgrade';
  requiredPack?: string;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => void;
  alert: (message: string, title?: string) => void;
  upgradePopup: (message: string, requiredPack?: string) => void;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [loading, setLoading] = useState(false);
  

  const confirm = (opts: ConfirmOptions) => {
    setOptions({ ...opts, type: 'confirm' });
    setIsOpen(true);
  };

  const alert = (message: string, title?: string) => {
    setOptions({ message, title, type: 'alert' });
    setIsOpen(true);
  };

  const upgradePopup = (message: string, requiredPack?: string) => {
    setOptions({ message, requiredPack, type: 'alert' });
    setIsOpen(true);
  };

  const handleConfirm = async () => {
    if (options?.onConfirm) {
      setLoading(true);
      try {
        await options.onConfirm();
      } finally {
        setLoading(false);
        setIsOpen(false);
      }
    } else {
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm, alert, upgradePopup }}>
      {children}
      <AnimatePresence>
        {isOpen && options && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={!loading ? handleCancel : undefined}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white dark:bg-[#111] rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 border border-gray-100 dark:border-white/10"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${options.type === 'upgrade' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : options.type === 'alert' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : options.danger !== false ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-purple-100 text-[#6B46C1] dark:bg-purple-900/30 dark:text-purple-400'}`}>
                  {options.type === 'upgrade' ? <ShieldAlert className="w-6 h-6" /> : options.type === 'alert' ? <Info className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {options.title || (options.type === 'upgrade' ? 'Feature Locked' : options.type === 'alert' ? 'Information' : 'Confirm Action')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                    {options.message}
                  </p>
                  {options.type === 'upgrade' && options.requiredPack && (
                    <div className="mb-6 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Required Plan: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{options.requiredPack}</span></p>
                    </div>
                  )}
                  <div className="flex gap-3 justify-end mt-4">
                    {options.type === 'confirm' && (
                      <button
                        onClick={handleCancel}
                        disabled={loading}
                        className="px-4 py-2 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                      >
                        {options.cancelText || 'Cancel'}
                      </button>
                    )}
                    {options.type === 'confirm' && (
                      <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className={`px-4 py-2 rounded-xl font-medium text-white transition-colors flex items-center justify-center min-w-[100px] disabled:opacity-50 ${
                          options.danger !== false 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : 'bg-[#6B46C1] hover:bg-purple-700'
                        }`}
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          options.confirmText || 'Confirm'
                        )}
                      </button>
                    )}
                    
                    {options.type === 'alert' && (
                       <button
                        onClick={handleCancel}
                        className="px-4 py-2 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                      >
                        OK
                      </button>
                    )}

                    {options.type === 'upgrade' && (
                      <>
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
