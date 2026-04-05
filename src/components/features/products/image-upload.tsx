"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string | null;
  onUpload: (url: string) => void;
  onRemove?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ImageUpload({ value, onUpload, onRemove, className, size = "md" }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      onUpload(url);
    } catch {
      // silent — user can retry
    } finally {
      setUploading(false);
    }
  }

  function handleDownload() {
    if (!value) return;
    const a = document.createElement("a");
    a.href = value;
    a.download = value.split("/").pop() ?? "image";
    a.target = "_blank";
    a.click();
  }

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-32 w-32",
    lg: "h-48 w-full",
  };

  return (
    <div
      className={cn(
        "group relative border-2 border-dashed rounded-lg overflow-hidden flex items-center justify-center bg-muted/30 transition-colors",
        !value && "cursor-pointer hover:bg-muted/50",
        sizeClasses[size],
        className
      )}
      onClick={!value ? () => inputRef.current?.click() : undefined}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {uploading ? (
        <span className="text-xs text-muted-foreground">Uploading…</span>
      ) : value ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Product"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Hover overlay: download + remove + change */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-[inherit]">
            {/* Download */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDownload(); }}
              className="p-1.5 rounded-md bg-white/20 hover:bg-white/40 transition-colors"
              title="Download image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
            {/* Change */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              className="p-1.5 rounded-md bg-white/20 hover:bg-white/40 transition-colors"
              title="Change image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            {/* Remove */}
            {onRemove && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="p-1.5 rounded-md bg-white/20 hover:bg-red-500/70 transition-colors"
                title="Remove image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-1 text-muted-foreground pointer-events-none">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
          {size !== "sm" && <span className="text-xs text-center px-2">Click to upload</span>}
        </div>
      )}
    </div>
  );
}
