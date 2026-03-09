"use client";

import { useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { deletePrintOrderFile } from "@/lib/actions/print-orders";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, File, Download, Trash2, Loader2 } from "lucide-react";
import { useTranslations } from "@/lib/i18n/use-translations";
import { interpolate } from "@/lib/i18n/locales";

interface FileUploadProps {
  orderId: string;
  existingFiles: string[];
  onFilesChange: (files: string[]) => void;
  canDelete?: boolean;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const ACCEPTED_EXTENSIONS =
  ".pdf,.jpeg,.jpg,.png,.tiff,.tif,.doc,.docx,.ppt,.pptx";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function extractFileName(path: string): string {
  const parts = path.split("/");
  const fullName = parts[parts.length - 1];
  // Remove the timestamp prefix (e.g., "1709312400000-filename.pdf" -> "filename.pdf")
  const dashIndex = fullName.indexOf("-");
  if (dashIndex !== -1 && /^\d+$/.test(fullName.slice(0, dashIndex))) {
    return fullName.slice(dashIndex + 1);
  }
  return fullName;
}

export function FileUpload({
  orderId,
  existingFiles,
  onFilesChange,
  canDelete = false,
}: FileUploadProps) {
  const t = useTranslations("printOrders");
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [deletingFiles, setDeletingFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  async function uploadFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error(interpolate(t.fileTypeNotSupported, { name: file.name }));
      return null;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(interpolate(t.fileTooLarge, { name: file.name }));
      return null;
    }

    const supabase = createClient();
    const storagePath = `${orderId}/${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from("print-files")
      .upload(storagePath, file);

    if (error) {
      toast.error(interpolate(t.uploadFailed, { name: file.name, error: error.message }));
      return null;
    }

    return storagePath;
  }

  async function handleFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const fileNames = fileArray.map((f) => f.name);
    setUploadingFiles((prev) => [...prev, ...fileNames]);

    const uploadedPaths: string[] = [];

    for (const file of fileArray) {
      const path = await uploadFile(file);
      if (path) {
        uploadedPaths.push(path);
      }
    }

    setUploadingFiles((prev) =>
      prev.filter((name) => !fileNames.includes(name))
    );

    if (uploadedPaths.length > 0) {
      const newFiles = [...existingFiles, ...uploadedPaths];
      onFilesChange(newFiles);
      toast.success(interpolate(t.filesUploaded, { count: uploadedPaths.length }));
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    // existingFiles changes when files are added, so we need it in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [existingFiles, orderId]
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      // Reset input so the same file can be selected again
      e.target.value = "";
    }
  }

  async function handleDownload(filePath: string) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("print-files")
      .createSignedUrl(filePath, 3600); // 1 hour

    if (error || !data?.signedUrl) {
      toast.error(t.downloadFailed);
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  async function handleDelete(filePath: string) {
    setDeletingFiles((prev) => [...prev, filePath]);

    try {
      const result = await deletePrintOrderFile(orderId, filePath);

      if (result && "error" in result) {
        toast.error(String(result.error));
      } else {
        const updatedFiles = existingFiles.filter((p) => p !== filePath);
        onFilesChange(updatedFiles);
        toast.success(t.fileDeleted);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t.deleteFileFailed
      );
    } finally {
      setDeletingFiles((prev) => prev.filter((p) => p !== filePath));
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
      >
        <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">
          {t.dragDrop}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t.fileTypes}
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS}
        onChange={handleInputChange}
        className="hidden"
        aria-label="Upload files"
      />

      {/* Uploading files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((name) => (
            <div
              key={name}
              className="flex items-center gap-3 rounded-md border p-3"
            >
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <File className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate text-sm">{name}</span>
              <span className="text-xs text-muted-foreground">
                {t.uploading}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded files list */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          {existingFiles.map((filePath) => {
            const isDeleting = deletingFiles.includes(filePath);

            return (
              <div
                key={filePath}
                className="flex items-center gap-3 rounded-md border p-3"
              >
                <File className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">
                  {extractFileName(filePath)}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(filePath);
                    }}
                    aria-label={`Download ${extractFileName(filePath)}`}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {canDelete && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(filePath);
                      }}
                      disabled={isDeleting}
                      aria-label={`Delete ${extractFileName(filePath)}`}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
