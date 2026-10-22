"use client";

import { useId, useRef } from "react";
import styles from "./ImageUploader.module.scss";
import { useImageUploader } from "./ImageUploader.logic";
import { getOptimizedImageUrl } from "@/lib/cloudinary";

export type ImageUploaderProps = {
  label?: string;
  onUpload?: (result: { publicId: string; url: string }) => void;
};

export default function ImageUploader({
  label = "Upload product photo",
  onUpload,
}: ImageUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const {
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
  } = useImageUploader({
    onUpload: (result) => {
      onUpload?.({
        publicId: result.public_id,
        url: result.secure_url || result.url,
      });
    },
  });

  return (
    <div className={styles.wrapper}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>

      <div
        className={`${styles.dropzone} ${isDragging ? styles.dragging : ""} ${
          state === "success" ? styles.success : ""
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          capture="environment"
          className={styles.input}
          onChange={(event) => handleFiles(event.target.files)}
        />

        {previewUrl ? (
          <img src={previewUrl} alt="Preview" className={styles.preview} />
        ) : (
          <div className={styles.placeholder}>
            <span>{isUploading ? "Uploading..." : "Drop an image or click to browse"}</span>
          </div>
        )}
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      {uploadedUrl ? (
        <div className={styles.meta}>
          <img
            src={
              uploadedPublicId
                ? getOptimizedImageUrl(uploadedPublicId, {
                    width: 200,
                    height: 200,
                    crop: "fill",
                    quality: "auto",
                    format: "auto",
                  })
                : uploadedUrl
            }
            alt="Uploaded product"
            className={styles.uploadedImage}
          />
          <div className={styles.metaText}>
            <strong>Upload complete</strong>
            <span>{uploadedUrl}</span>
          </div>
          <button type="button" className={styles.resetButton} onClick={reset}>
            Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}
