"use client";

import * as React from "react";
import { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: Toast = { id, type, message, duration };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };

  const colors = {
    success: { bg: "#dcfce7", border: "#16a34a", text: "#15803d", icon: "#16a34a" },
    error: { bg: "#fee2e2", border: "#dc2626", text: "#991b1b", icon: "#dc2626" },
    warning: { bg: "#fef3c7", border: "#d97706", text: "#92400e", icon: "#d97706" },
    info: { bg: "#dbeafe", border: "#0284c7", text: "#0c4a6e", icon: "#0284c7" },
  };

  const Icon = icons[toast.type];
  const colorScheme = colors[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{
        background: colorScheme.bg,
        border: `1px solid ${colorScheme.border}`,
        color: colorScheme.text,
      }}
      className="pointer-events-auto flex items-start gap-3 rounded-lg px-4 py-3 shadow-lg max-w-md min-w-[300px]"
    >
      <Icon size={20} style={{ color: colorScheme.icon, flexShrink: 0, marginTop: 2 }} />
      <p className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</p>
      <button
        onClick={onClose}
        className="ml-2 flex-shrink-0 rounded-md p-1 hover:bg-black/5 transition-colors"
        style={{ color: colorScheme.text }}
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
