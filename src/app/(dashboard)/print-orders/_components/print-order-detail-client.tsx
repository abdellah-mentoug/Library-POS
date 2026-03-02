"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FileUpload } from "./file-upload";
import { toast } from "sonner";

interface PrintOrderDetailClientProps {
  orderId: string;
  filePaths: string[];
  isAdmin: boolean;
}

export function PrintOrderDetailClient({
  orderId,
  filePaths: initialFilePaths,
  isAdmin,
}: PrintOrderDetailClientProps) {
  const router = useRouter();
  const [filePaths, setFilePaths] = useState<string[]>(initialFilePaths);

  async function handleFilesChange(newPaths: string[]) {
    // Update the print order's file_paths in the database
    const supabase = createClient();
    const { error } = await supabase
      .from("print_orders")
      .update({ file_paths: newPaths })
      .eq("id", orderId);

    if (error) {
      toast.error("Failed to update file list");
      return;
    }

    setFilePaths(newPaths);
    router.refresh();
  }

  return (
    <FileUpload
      orderId={orderId}
      existingFiles={filePaths}
      onFilesChange={handleFilesChange}
      canDelete={isAdmin}
    />
  );
}
