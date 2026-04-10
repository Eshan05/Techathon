"use client";

import { UploadIcon } from "lucide-react";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DndContext } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type Accept = Record<string, string[]> | string | undefined;

type FileError = {
  code: "file-invalid-type" | "file-too-large" | "file-too-small" | "too-many-files";
  message: string;
};

export type FileRejection = {
  file: File;
  errors: FileError[];
};

type DropzoneContextType = {
  src?: File[];
  accept?: Accept;
  maxSize?: number;
  minSize?: number;
  maxFiles?: number;
};

const renderBytes = (bytes: number) => {
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)}${units[unitIndex]}`;
};

const DropzoneContext = createContext<DropzoneContextType | undefined>(undefined);

export type DropzoneProps = {
  src?: File[];
  accept?: Accept;
  maxFiles?: number;
  maxSize?: number; // in bytes
  minSize?: number; // in bytes
  disabled?: boolean;
  className?: string;
  onDrop?: (
    acceptedFiles: File[],
    fileRejections: FileRejection[],
    event: React.DragEvent | React.ChangeEvent<HTMLInputElement>
  ) => void;
  onError?: (error: Error) => void;
  children?: ReactNode;
};

export const Dropzone = ({
  accept,
  maxFiles = 1,
  maxSize,
  minSize,
  onDrop,
  onError,
  disabled,
  src,
  className,
  children,
}: DropzoneProps) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const allowMultiple = ((maxFiles ?? 1) > 1);

  const allowedExts = useMemo(() => {
    if (!accept || typeof accept === "string") return [] as string[];
    return Object.values(accept).flat().map((e) => e.toLowerCase());
  }, [accept]);

  const allowedMimeGlobs = useMemo(() => {
    if (!accept) return [] as string[];
    if (typeof accept === "string") return [accept.toLowerCase()];
    return Object.keys(accept).map((k) => k.toLowerCase());
  }, [accept]);

  const mimeMatches = (mime: string) => {
    if (allowedMimeGlobs.length === 0) return true;
    const [type, subtype] = mime.toLowerCase().split("/");
    return allowedMimeGlobs.some((pattern) => {
      const [pType, pSub] = pattern.split("/");
      if (!pType || !pSub) return false;
      if (pType === "*") return true;
      if (pSub === "*") return pType === type;
      return pType === type && pSub === subtype;
    });
  };

  const extMatches = (name: string) => {
    if (allowedExts.length === 0) return true;
    const lower = name.toLowerCase();
    return allowedExts.some((ext) => lower.endsWith(ext));
  };

  const validateFiles = (files: File[]): { accepted: File[]; rejections: FileRejection[] } => {
    const rejections: FileRejection[] = [];
    let accepted: File[] = [];

    if (maxFiles && files.length > maxFiles) {
      // Accept only up to maxFiles; reject the rest
      const acceptThese = files.slice(0, maxFiles);
      const rejectThese = files.slice(maxFiles);
      accepted = acceptThese;
      for (const file of rejectThese) {
        const err: FileError = {
          code: "too-many-files",
          message: `Too many files. Maximum is ${maxFiles}.`,
        };
        rejections.push({ file, errors: [err] });
      }
    } else {
      accepted = files;
    }

    const filtered: File[] = [];
    for (const file of accepted) {
      const errs: FileError[] = [];
      if (minSize != null && file.size < minSize) {
        errs.push({ code: "file-too-small", message: `File is smaller than ${minSize} bytes.` });
      }
      if (maxSize != null && file.size > maxSize) {
        errs.push({ code: "file-too-large", message: `File exceeds ${maxSize} bytes.` });
      }
      if (!mimeMatches(file.type) && !extMatches(file.name)) {
        errs.push({ code: "file-invalid-type", message: "Invalid file type." });
      }
      if (errs.length > 0) {
        rejections.push({ file, errors: errs });
      } else {
        filtered.push(file);
      }
    }

    return { accepted: filtered, rejections };
  };

  const handleFiles = (
    files: File[],
    event: React.DragEvent | React.ChangeEvent<HTMLInputElement>
  ) => {
    const { accepted, rejections } = validateFiles(files);

    if (rejections.length > 0) {
      const firstMsg = rejections[0]?.errors[0]?.message ?? "File rejected";
      onError?.(new Error(firstMsg));
      toast.error(firstMsg);
    }

    onDrop?.(accepted, rejections, event);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragActive(true);
  };
  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragActive(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragActive(false);
  };
  const onDropHandler = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragActive(false);
    const list = Array.from(e.dataTransfer?.files ?? []);
    if (list.length === 0) return;
    handleFiles(list, e);
  };

  const onClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    handleFiles(files, e);
    // clear selection to allow re-selecting the same file
    e.currentTarget.value = "";
  };

  const inputAccept = useMemo(() => {
    if (!accept) return undefined;
    if (typeof accept === "string") return accept;
    const parts: string[] = [];
    for (const [mime, exts] of Object.entries(accept)) {
      if (mime) parts.push(mime);
      if (Array.isArray(exts)) parts.push(...exts);
    }
    return parts.join(",");
  }, [accept]);

  return (
    <DropzoneContext.Provider
      key={JSON.stringify(src)}
      value={{ src, accept, maxSize, minSize, maxFiles }}
    >
      <DndContext>
        <Button
          className={cn(
            "relative h-auto w-full flex-col overflow-hidden p-8",
            isDragActive && "outline-none ring-1 ring-ring",
            className
          )}
          disabled={disabled}
          type="button"
          variant="outline"
          onClick={onClick}
          onDragOver={onDragOver}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDrop={onDropHandler}
        >
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            onChange={onChange}
            multiple={allowMultiple}
            accept={inputAccept}
          />
          {children}
        </Button>
      </DndContext>
    </DropzoneContext.Provider>
  );
};

const useDropzoneContext = () => {
  const context = useContext(DropzoneContext);

  if (!context) {
    throw new Error("useDropzoneContext must be used within a Dropzone");
  }

  return context;
};

export type DropzoneContentProps = {
  children?: ReactNode;
  className?: string;
};

const maxLabelItems = 3;

export const DropzoneContent = ({
  children,
  className,
}: DropzoneContentProps) => {
  const { src } = useDropzoneContext();
  const images = useMemo(() => (src ? src.filter((f) => f.type?.startsWith("image/")) : []), [src]);
  const urls = useMemo(() => images.map((f) => ({ file: f, url: URL.createObjectURL(f) })), [images]);
  useEffect(() => {
    return () => {
      for (const u of urls) URL.revokeObjectURL(u.url);
    };
  }, [urls]);

  if (!src) {
    return null;
  }

  if (children) {
    return children;
  }

  if (images.length > 0) {
    return (
      <div className={cn("flex w-full flex-col items-center justify-center gap-3", className)}>
        {images.length === 1 ? (
          <div className="flex w-full items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-md bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urls[0].url} alt="preview" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{images[0].name}</p>
              <p className="text-xs text-muted-foreground">{(images[0].size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
          </div>
        ) : (
          <div className="grid w-full grid-cols-4 gap-2">
            {urls.slice(0, 8).map((u, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-md bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u.url} alt={`preview-${i}`} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}
        <p className="w-full text-wrap text-center text-xs text-muted-foreground">Drag and drop or click to replace</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <UploadIcon size={16} />
      </div>
      <p className="my-2 w-full truncate font-medium text-sm">
        {src.length > maxLabelItems
          ? `${new Intl.ListFormat("en").format(src.slice(0, maxLabelItems).map((file) => file.name))} and ${src.length - maxLabelItems} more`
          : new Intl.ListFormat("en").format(src.map((file) => file.name))}
      </p>
      <p className="w-full text-wrap text-muted-foreground text-xs">Drag and drop or click to replace</p>
    </div>
  );
};

export type DropzoneEmptyStateProps = {
  children?: ReactNode;
  className?: string;
};

export const DropzoneEmptyState = ({
  children,
  className,
}: DropzoneEmptyStateProps) => {
  const { src, accept, maxSize, minSize, maxFiles } = useDropzoneContext();

  if (src) {
    return null;
  }

  if (children) {
    return children;
  }

  let caption = "";

  if (accept) {
    caption += "Accepts ";
    if (typeof accept === "string") {
      caption += accept;
    } else {
      caption += new Intl.ListFormat("en").format(Object.keys(accept));
    }
  }

  if (minSize && maxSize) {
    caption += ` between ${renderBytes(minSize)} and ${renderBytes(maxSize)}`;
  } else if (minSize) {
    caption += ` at least ${renderBytes(minSize)}`;
  } else if (maxSize) {
    caption += ` less than ${renderBytes(maxSize)}`;
  }

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <UploadIcon size={16} />
      </div>
      <p className="my-2 w-full truncate text-wrap font-medium text-sm">
        Upload {maxFiles === 1 ? "a file" : "files"}
      </p>
      <p className="w-full truncate text-wrap text-muted-foreground text-xs">
        Drag and drop or click to upload
      </p>
      {caption && (
        <p className="text-wrap text-muted-foreground text-xs">{caption}.</p>
      )}
    </div>
  );
};
