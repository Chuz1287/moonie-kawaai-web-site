"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { X, ZoomIn } from "lucide-react";
import type { ProductGridProps } from "./ProductGrid.logic";
import { formatCurrency } from "./ProductGrid.logic";
import styles from "./ProductGrid.module.scss";

export default function ProductGrid({ products, onAdd }: ProductGridProps) {
  const [preview, setPreview] = useState<{ src: string; name: string } | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const previewDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (preview && previewDialog.current && !previewDialog.current.open) {
      previewDialog.current.showModal();
    }
  }, [preview]);

  return (
    <>
      <div className={styles.scope}>
      {products.map((product) => {
        const cost = product.cost ?? product.price * 0.7;
        const coverImage = product.coverImage;

        return (
          <div key={product.id} className={styles.productCard}>
            {coverImage ? (
              <button
                type="button"
                className={`${styles.media} ${styles.imageButton}`}
                aria-label={`Ampliar foto de ${product.name}`}
                aria-haspopup="dialog"
                onClick={() => {
                  setPreviewFailed(false);
                  setPreview({ src: coverImage, name: product.name });
                }}
              >
                <Image
                  src={coverImage}
                  alt=""
                  className={styles.productImage}
                  width={300}
                  height={300}
                  loading="lazy"
                  unoptimized
                />
                <span className={styles.cardStock}>{product.stock}</span>
                <ZoomIn className={styles.zoomIcon} size={20} aria-hidden="true" />
              </button>
            ) : (
              <div className={styles.media}>
                <span className={styles.cardStock}>{product.stock}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => onAdd(product)}
              className={styles.cardButton}
            >
              <div className={styles.cardInfo}>
                <p className={styles.cardCategory}>
                  {(product.categories ?? [product.category]).join(" · ")}
                </p>
                <h3 className={styles.cardTitle}>{product.name}</h3>
                <p className={styles.cardDescription}>{product.shortDescription}</p>
              </div>

              <div className={styles.cardPricing}>
                <span className={styles.priceValue}>{formatCurrency(product.price)}</span>
                <span className={styles.costValue}>C: {formatCurrency(cost)}</span>
              </div>
            </button>
          </div>
        );
      })}
      </div>
      <dialog
        ref={previewDialog}
        className={styles.previewDialog}
        aria-label={preview ? `Foto de ${preview.name}` : "Foto de producto"}
        onClose={() => setPreview(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        {preview && (
          <div className={styles.previewContent}>
            <header className={styles.previewHeader}>
              <h2>{preview.name}</h2>
              <button
                type="button"
                aria-label="Cerrar foto"
                onClick={() => previewDialog.current?.close()}
              >
                <X size={22} aria-hidden="true" />
              </button>
            </header>
            <div className={styles.previewImage}>
              {previewFailed ? (
                <p role="status">No se pudo cargar la foto.</p>
              ) : (
                <Image
                  src={preview.src}
                  alt={`Foto de ${preview.name}`}
                  fill
                  sizes="(max-width: 800px) 90vw, 760px"
                  unoptimized
                  onError={() => setPreviewFailed(true)}
                />
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
