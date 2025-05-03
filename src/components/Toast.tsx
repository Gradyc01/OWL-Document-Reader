import React, { useEffect } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  duration?: number; // in ms
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, duration = 3000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!message) return null;

  const bgColor = type === "success" ? "bg-green-600" : "bg-red-600";

  return (
    <div className={`absolute top-8 left-1/2 transform -translate-x-1/2 text-white px-4 py-2 rounded shadow-md ${bgColor}`}>
      {message}
    </div>
  );
};

export default Toast;