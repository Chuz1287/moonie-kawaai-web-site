"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import styles from "./InventoryProductImage.module.scss";

type InventoryProductImageProps = {
  alt: string;
  className: string;
  sources: Array<string | undefined>;
};

function ImageWithFallback({
  alt,
  className,
  sources,
}: InventoryProductImageProps & { sources: string[] }) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const source = sources[sourceIndex];

  if (!source) {
    return (
      <div
        className={`${className} ${styles.fallback}`}
        role="img"
        aria-label={`${alt}: imagen no disponible`}
      >
        <ImageOff size={28} aria-hidden="true" />
        <span>Imagen no disponible</span>
      </div>
    );
  }

  return (
    <Image
      src={source}
      alt={alt}
      className={className}
      width={300}
      height={300}
      loading="lazy"
      unoptimized
      onError={() => setSourceIndex((index) => index + 1)}
    />
  );
}

export default function InventoryProductImage({
  alt,
  className,
  sources,
}: InventoryProductImageProps) {
  const uniqueSources = [...new Set(sources.map((source) => source?.trim()).filter(
    (source): source is string => Boolean(source)
  ))];

  return (
    <ImageWithFallback
      key={uniqueSources.join("|")}
      alt={alt}
      className={className}
      sources={uniqueSources}
    />
  );
}
