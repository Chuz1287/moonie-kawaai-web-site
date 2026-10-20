"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uploadImage, type CloudinaryUploadResult } from "@/lib/cloudinary";

export type UploadState = "idle" | "uploading" | "success" | "error";

export type UseImageUploaderOptions = {
  onUpload?: (result: CloudinaryUploadResult) => void;
  maxFileSizeMb?: number;
};

export function useImageUploader(options: UseImageUploaderOptions = {}) {
  const { onUpload, maxFileSizeMb = 10 } = options;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedPublicId, setUploadedPublicId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const clearPreview = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setPreviewUrl(null);
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed.");
        return;
      }

      const maxBytes = maxFileSizeMb * 1024 * 1024;
      if (file.size > maxBytes) {
        setError(`Image must be smaller than ${maxFileSizeMb}MB.`);
        return;
      }

      setError(null);
      setIsUploading(true);

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }

      const nextPreviewUrl = URL.createObjectURL(file);
      objectUrlRef.current = nextPreviewUrl;
      setPreviewUrl(nextPreviewUrl);

      try {
        const result = await uploadImage(file);
        setUploadedUrl(result.secure_url || result.url);
        setUploadedPublicId(result.public_id);
        setError(null);
        onUpload?.(result);
      } catch (uploadError) {
        const message =
          uploadError instanceof Error
            ? uploadError.message
            : "Upload failed. Please try again.";

        setError(message);
      } finally {
        setIsUploading(false);
      }
    },
    [maxFileSizeMb, onUpload]
  );

  const handleFiles = useCallback(
    (fileList: FileList | File[] | null) => {
      if (!fileList || fileList.length === 0) {
        return;
      }

      const file = fileList[0];
      void uploadFile(file);
    },
    [uploadFile]
  );

  const reset = useCallback(() => {
    clearPreview();
    setUploadedUrl(null);
    setUploadedPublicId(null);
    setError(null);
  }, [clearPreview]);

  const state: UploadState = useMemo(() => {
    if (error) return "error";
    if (isUploading) return "uploading";
    if (uploadedUrl) return "success";
    return "idle";
  }, [error, isUploading, uploadedUrl]);

  return {
    previewUrl,
    uploadedUrl,
    uploadedPublicId,
    isUploading,
    isDragging,
    error,
    state,
    setIsDragging,
    handleFiles,
    reset,
    uploadFile,
  };
}
