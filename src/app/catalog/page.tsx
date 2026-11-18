"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ImageOff, LoaderCircle, Printer, Share2, Sparkles } from "lucide-react";
import type { Product } from "@/types/store";
import styles from "./catalog.module.scss";

type CatalogResponse = {
  products?: Product[];
  imagesByProduct?: Record<string, string[]>;
  message?: string;
};

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

type ExportMode = "print" | "web";

const webPdfMaxBytes = 20_000_000;

function getImageUrlForMode(src: string, mode: ExportMode): string {
  const uploadPath = "/image/upload/";
  const uploadIndex = src.indexOf(uploadPath);
  if (uploadIndex < 0) return src;

  const transformations =
    mode === "web" ? "w_1600,c_limit,q_80,f_webp" : "w_2200,c_limit,q_92,f_auto";
  const insertionPoint = uploadIndex + uploadPath.length;
  return `${src.slice(0, insertionPoint)}${transformations}/${src.slice(insertionPoint)}`;
}

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [imagesByProduct, setImagesByProduct] = useState<Record<string, string[]>>({});
  const [selectedImages, setSelectedImages] = useState<Record<string, string>>({});
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportMode, setExportMode] = useState<ExportMode>("web");
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [pricePercentage, setPricePercentage] = useState("");
  const [productPrices, setProductPrices] = useState<Record<string, string>>({});
  const priceForm = useRef<HTMLFormElement>(null);
  const autoExportStarted = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      try {
        const response = await fetch("/api/catalog", { cache: "no-store" });
        const result = (await response.json()) as CatalogResponse;
        if (!response.ok) {
          throw new Error(result.message ?? "No se pudo generar el catálogo.");
        }
        if (!Array.isArray(result.products) || !result.imagesByProduct) {
          throw new Error("La respuesta del catálogo está incompleta.");
        }
        if (!cancelled) {
          setProducts(result.products);
          setImagesByProduct(result.imagesByProduct);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el catálogo.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  const productImages = useMemo(
    () =>
      products.map((product) => {
        const cloudinaryImages = imagesByProduct[product.id] ?? [];
        return {
          product,
          images: cloudinaryImages.slice(0, 5),
        };
      }),
    [imagesByProduct, products]
  );

  const catalogProducts = useMemo(
    () =>
      productImages
        .map(({ product, images }) => ({
          product,
          images: images.filter((image) => !failedImages.has(image)),
        }))
        .filter(({ product, images }) => product.stock > 0 && images.length > 0)
        .sort((first, second) => {
          const firstSeries = first.product.series?.trim() ?? "";
          const secondSeries = second.product.series?.trim() ?? "";
          if (!firstSeries && secondSeries) return 1;
          if (firstSeries && !secondSeries) return -1;
          const seriesOrder = firstSeries.localeCompare(
            secondSeries,
            "es-MX",
            { sensitivity: "base" }
          );
          if (seriesOrder !== 0) return seriesOrder;
          return first.product.name.localeCompare(second.product.name, "es-MX", {
            sensitivity: "base",
          });
        }),
    [failedImages, productImages]
  );

  const exportCatalog = useCallback(async (mode: ExportMode) => {
    if (exporting || !priceForm.current?.reportValidity()) return;

    setExporting(true);
    setExportProgress("Preparando las páginas…");
    setExportMode(mode);
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

    try {
      const { default: html2canvas } = await import("html2canvas");
      const { jsPDF } = await import("jspdf");
      const sheets = Array.from(document.querySelectorAll<HTMLElement>(`.${styles.sheet}`));
      if (sheets.length === 0) {
        throw new Error("No hay páginas disponibles para exportar.");
      }

      const attempts = mode === "web"
        ? [
            { scale: 1.25, quality: 0.82 },
            { scale: 1.1, quality: 0.74 },
            { scale: 0.95, quality: 0.66 },
            { scale: 0.8, quality: 0.55 },
            { scale: 0.65, quality: 0.45 },
          ]
        : [{ scale: 1.5, quality: 0.88 }];
      let output: Blob | null = null;

      for (let attemptIndex = 0; attemptIndex < attempts.length; attemptIndex += 1) {
        const attempt = attempts[attemptIndex];
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
          compress: true,
        });

        for (let pageIndex = 0; pageIndex < sheets.length; pageIndex += 1) {
          setExportProgress(
            mode === "web"
              ? `Comprimiendo catálogo (${pageIndex + 1} de ${sheets.length})…`
              : `Generando PDF (${pageIndex + 1} de ${sheets.length})…`
          );
          const canvas = await html2canvas(sheets[pageIndex], {
            backgroundColor: "#fffafd",
            scale: attempt.scale,
            useCORS: true,
            allowTaint: false,
            imageTimeout: 20000,
            logging: false,
            width: 794,
            height: 1123,
            windowWidth: 794,
          });
          const imageData = canvas.toDataURL("image/jpeg", attempt.quality);
          if (pageIndex > 0) pdf.addPage("a4", "portrait");
          pdf.addImage(imageData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
          canvas.width = 0;
          canvas.height = 0;
        }

        output = pdf.output("blob");
        if (mode === "print" || output.size <= webPdfMaxBytes) break;
      }

      if (!output) {
        throw new Error("No se pudo crear el archivo PDF.");
      }
      if (mode === "web" && output.size > webPdfMaxBytes) {
        throw new Error(
          "El catálogo tiene demasiadas páginas o imágenes para quedar debajo de 20 MB. Reduce la cantidad de productos o fotos e inténtalo de nuevo."
        );
      }

      const fileName = mode === "web"
        ? "moonie-kawaii-catalogo-web.pdf"
        : "moonie-kawaii-catalogo-impresion.pdf";
      const downloadUrl = URL.createObjectURL(output);
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.download = fileName;
      document.body.append(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (exportError) {
      console.error("Catalog PDF export error:", exportError);
      window.alert(
        exportError instanceof Error
          ? exportError.message
          : "No se pudo generar el PDF del catálogo."
      );
    } finally {
      setExporting(false);
      setExportProgress("");
    }
  }, [exporting]);

  useEffect(() => {
    if (
      loading ||
      error ||
      catalogProducts.length === 0 ||
      autoExportStarted.current ||
      new URLSearchParams(window.location.search).get("export") !== "web"
    ) {
      return;
    }

    let cancelled = false;
    autoExportStarted.current = true;
    const exportTimer = window.setTimeout(() => {
      if (!cancelled) void exportCatalog("web");
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(exportTimer);
    };
  }, [catalogProducts, error, exportCatalog, loading]);

  const markImageFailed = (src: string) => {
    setFailedImages((current) => new Set(current).add(src));
  };

  const adjustment = Number(pricePercentage);
  const priceMultiplier = Number.isFinite(adjustment) && adjustment >= -100
    ? 1 + adjustment / 100
    : 1;
  const adjustedPrice = (product: Product) => (
    (Number.isFinite(product.price) ? product.price : 0) * priceMultiplier
  );
  const catalogPrice = (product: Product) => {
    const override = productPrices[product.id];
    if (override && Number.isFinite(Number(override)) && Number(override) >= 0) {
      return Number(override);
    }
    return adjustedPrice(product);
  };
  const hasInvalidCatalogPrice = catalogProducts.some(({ product }) => (
    !Number.isFinite(catalogPrice(product))
  ));

  if (loading) {
    return <main className={styles.state}>Preparando el catálogo de inventario…</main>;
  }

  if (error) {
    return (
      <main className={styles.state} role="alert">
        <p>No se pudo preparar el catálogo: {error}</p>
        <Link href="/pages/inventory">Volver al inventario</Link>
      </main>
    );
  }

  if (catalogProducts.length === 0) {
    return (
      <main className={styles.state}>
        <p>No hay productos con stock e imágenes disponibles para incluir en el catálogo.</p>
        <Link href="/pages/inventory">Volver al inventario</Link>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.toolbar}>
        <Link href="/pages/inventory" className={styles.backLink}>
          <ArrowLeft size={17} aria-hidden="true" />
          Inventario
        </Link>
        <button
          type="button"
          className={styles.webButton}
          onClick={() => void exportCatalog("web")}
          disabled={exporting || hasInvalidCatalogPrice}
        >
          {exporting && exportMode === "web"
            ? <LoaderCircle size={17} className={styles.spinner} aria-hidden="true" />
            : <Share2 size={17} aria-hidden="true" />}
          Descargar PDF web (máx. 20 MB)
        </button>
        <button
          type="button"
          className={styles.printButton}
          onClick={() => void exportCatalog("print")}
          disabled={exporting || hasInvalidCatalogPrice}
        >
          {exporting && exportMode === "print"
            ? <LoaderCircle size={17} className={styles.spinner} aria-hidden="true" />
            : <Printer size={17} aria-hidden="true" />}
          PDF para impresión
        </button>
      </div>
      <form
        ref={priceForm}
        id="precios"
        className={styles.priceSettings}
        onSubmit={(event) => event.preventDefault()}
        onInvalid={(event) => {
          const target = event.target;
          if (target instanceof HTMLInputElement) {
            const details = target.closest("details");
            if (details) details.open = true;
          }
        }}
      >
        <fieldset disabled={exporting}>
          <legend>Precios del catálogo</legend>
          <p>Los cambios se ven en la vista previa y en ambos PDF. No modifican el inventario ni el POS.</p>
          <label className={styles.percentageField}>
            Ajuste general (%)
            <input
              type="number"
              min="-100"
              step="0.01"
              placeholder="0"
              value={pricePercentage}
              onChange={(event) => setPricePercentage(event.target.value)}
            />
          </label>
          <p>Usa un valor negativo para descontar o uno positivo para aumentar.</p>
          <details>
            <summary>Editar precios por producto (MXN)</summary>
            <p>El precio manual tiene prioridad. Deja el campo vacío para usar el precio con el ajuste general.</p>
            <div className={styles.productPrices}>
              {catalogProducts.map(({ product }) => (
                <label key={product.id}>
                  <span>{product.name}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={money.format(adjustedPrice(product))}
                    value={productPrices[product.id] ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      setProductPrices((current) => ({ ...current, [product.id]: value }));
                    }}
                  />
                </label>
              ))}
            </div>
          </details>
          {hasInvalidCatalogPrice && (
            <p role="alert">El ajuste genera un precio demasiado alto. Introduce un porcentaje menor.</p>
          )}
        </fieldset>
      </form>
      {exportProgress ? (
        <p className={styles.exportProgress} role="status" aria-live="polite">
          {exportProgress}
        </p>
      ) : null}

      <div
        className={styles.catalog}
        data-export-mode={exportMode}
        data-exporting={exporting ? "true" : "false"}
      >
        {catalogProducts.map(({ product, images }) => {
          const usableImages = images.filter((image) => !failedImages.has(image));
          const selectedImage = selectedImages[product.id];
          const mainImage = usableImages.includes(selectedImage ?? "")
            ? selectedImage
            : usableImages[0];
          const thumbnails = usableImages.slice(0, 5);

          return (
            <article className={styles.sheet} key={product.id}>
              <header className={styles.header}>
                <div className={styles.brandLockup}>
                  <span className={styles.brandMark} aria-hidden="true">m</span>
                  <p className={styles.brand}>MOONIE KAWAII</p>
                </div>
                <Sparkles className={styles.headerSparkle} size={25} aria-hidden="true" />
                <h1 className={styles.productName}>{product.name}</h1>
              </header>

              <section className={styles.productSection} aria-label={`Fotos de ${product.name}`}>
                <div className={styles.gallery}>
                  <div className={styles.mainPhoto}>
                    {mainImage ? (
                      <Image
                        key={mainImage}
                        src={getImageUrlForMode(mainImage, exportMode)}
                        alt={product.name}
                        fill
                        sizes="(max-width: 700px) 85vw, 650px"
                        unoptimized
                        loading="eager"
                        data-catalog-image
                        className={styles.catalogImage}
                        onError={() => markImageFailed(mainImage)}
                      />
                    ) : (
                      <div className={styles.imageFallback}>
                        <ImageOff size={42} aria-hidden="true" />
                        <span>Foto próximamente</span>
                      </div>
                    )}
                  </div>
                  {thumbnails.length > 0 ? (
                    <div className={styles.thumbnailRail} aria-label="Fotos adicionales">
                      {thumbnails.map((image, index) => (
                        <button
                          type="button"
                          key={image}
                          className={`${styles.thumbnail} ${mainImage === image ? styles.thumbnailActive : ""}`}
                          onClick={() => setSelectedImages((current) => ({ ...current, [product.id]: image }))}
                          disabled={exporting}
                          aria-label={`Mostrar foto adicional ${index + 1} de ${product.name}`}
                          aria-pressed={mainImage === image}
                        >
                          <Image
                            src={getImageUrlForMode(image, exportMode)}
                            alt=""
                            fill
                            sizes="(max-width: 700px) 20vw, 100px"
                            unoptimized
                            loading="eager"
                            data-catalog-image
                            className={styles.catalogImage}
                            onError={() => markImageFailed(image)}
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>

              <section className={styles.details} aria-label={`Precio y existencias de ${product.name}`}>
                <div className={styles.detailCard}>
                  <span className={styles.detailIcon} aria-hidden="true">↕</span>
                  <span className={styles.detailLabel}>Altura</span>
                  <strong>{product.height || "No registrada"}</strong>
                </div>
                <div className={`${styles.detailCard} ${styles.priceCard}`}>
                  <span className={styles.detailIcon} aria-hidden="true">✦</span>
                  <span className={styles.detailLabel}>Precio</span>
                  <strong>{money.format(catalogPrice(product))}</strong>
                </div>
                <div className={styles.detailCard}>
                  <span className={styles.detailIcon} aria-hidden="true">♡</span>
                  <span className={styles.detailLabel}>Existencias</span>
                  <strong>{product.stock} {product.stock === 1 ? "pieza" : "piezas"}</strong>
                </div>
              </section>

              <footer className={styles.socialFooter}>
                <span>Encuentra tu próximo favorito</span>
                <span className={styles.footerBrand}>MOONIE KAWAII · CATÁLOGO</span>
              </footer>
            </article>
          );
        })}
      </div>
    </main>
  );
}
