import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  }[type];

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-4 rounded-2xl shadow-2xl z-50 animate-fadeIn flex items-center gap-3 min-w-[300px]`}>
      <span className="font-black text-sm uppercase tracking-wider flex-1">{message}</span>
      <button onClick={onClose} className="text-white hover:text-gray-200 font-bold text-lg">
        ×
      </button>
    </div>
  );
};

export default Toast;
