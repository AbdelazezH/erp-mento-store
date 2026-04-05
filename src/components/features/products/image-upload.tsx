"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string | null;
  onUpload: (url: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ImageUpload({ value, onUpload, className, size = "md" }: ImageUploadProps) {
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

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-32 w-32",
    lg: "h-48 w-full",
  };

  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-lg cursor-pointer overflow-hidden flex items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors",
        sizeClasses[size],
        className
      )}
      onClick={() => inputRef.current?.click()}
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
        <Image
          src={value}
          alt="Product"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 200px"
        />
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
