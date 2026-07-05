"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertCircle, X } from "lucide-react";

export function Toast({
  message,
  type = "success",
  onClose,
}: {
  message: string;
  type?: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={cn(
        "fixed bottom-24 lg:bottom-6 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border max-w-sm animate-in",
        type === "success"
          ? "bg-white border-green-200 text-green-800"
          : "bg-white border-red-200 text-red-800"
      )}
    >
      {type === "success" ? (
        <CheckCircle className="h-5 w-5 shrink-0" />
      ) : (
        <AlertCircle className="h-5 w-5 shrink-0" />
      )}
      <p className="text-sm font-medium flex-1">{message}</p>
      <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}