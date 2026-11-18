"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ImageOff, LoaderCircle, Printer, Save, Share2, Sparkles, Trash2 } from "lucide-react";
import type { Product } from "@/types/store";
import type { CatalogTemplate } from "@/services/catalogTemplates";
import styles from "./catalog.module.scss";

type CatalogResponse = {
  products?: Product[];
  imagesByProduct?: Record<string, string[]>;
  message?: string;
};

type CatalogTemplatesResponse = {
  templates?: CatalogTemplate[];
  template?: CatalogTemplate;
  message?: string;
};

function toDraftPercentage(percentage: number | null): string {
  return percentage === null ? "" : String(percentage);
}

function toDraftPrices(prices: Record<string, number>): Record<string, string> {
  return Object.fromEntries(Object.entries(prices).map(([code, price]) => [code, String(price)]));
}

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
  const [templates, setTemplates] = useState<CatalogTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [templateDirty, setTemplateDirty] = useState(false);
  const [templateStatus, setTemplateStatus] = useState<string | null>(null);
  const [appliedTemplate, setAppliedTemplate] = useState<CatalogTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const priceForm = useRef<HTMLFormElement>(null);
  const autoExportStarted = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTemplates() {
      try {
        const response = await fetch("/api/catalog-templates", { cache: "no-store" });
        const result = (await response.json()) as CatalogTemplatesResponse;
        if (!response.ok) {
          throw new Error(result.message ?? "No se pudieron cargar los catálogos.");
        }
        const loaded = result.templates ?? [];
        if (cancelled) return;
        setTemplates(loaded);
        const initial = loaded.find((template) => template.name === "Público") ?? loaded[0];
        if (initial) {
          setSelectedTemplateId(initial.id);
          setAppliedTemplate(initial);
          setPricePercentage(toDraftPercentage(initial.percentageAdjustment));
          setProductPrices(toDraftPrices(initial.prices));
        }
      } catch (loadError) {
        if (!cancelled) {
          setTemplateStatus(loadError instanceof Error ? loadError.message : "No se pudieron cargar los catálogos.");
        }
      } finally {
        if (!cancelled) setTemplatesLoading(false);
      }
    }

    void loadTemplates();
    return () => {
      cancelled = true;
    };
  }, []);

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
      templatesLoading ||
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
  }, [catalogProducts, error, exportCatalog, loading, templatesLoading]);

  const markImageFailed = (src: string) => {
    setFailedImages((current) => new Set(current).add(src));
  };

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null;
  const currentPrices = () => Object.fromEntries(
    Object.entries(productPrices).map(([code, value]) => [
      code,
      value.trim() === "" ? null : Number(value),
    ])
  );
  const currentPercentage = () => (pricePercentage.trim() === "" ? null : Number(pricePercentage));

  const selectTemplate = (templateId: string) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template || template.id === selectedTemplateId) return;
    if (templateDirty && !window.confirm("Hay cambios sin guardar. ¿Cambiar de catálogo y descartarlos?")) return;
    setSelectedTemplateId(template.id);
    setAppliedTemplate(template);
    setPricePercentage(toDraftPercentage(template.percentageAdjustment));
    setProductPrices(toDraftPrices(template.prices));
    setTemplateDirty(false);
    setTemplateStatus(null);
  };

  const saveTemplate = async () => {
    if (!selectedTemplate || templateBusy || !priceForm.current?.reportValidity()) return;

    setTemplateBusy(true);
    setTemplateStatus(null);
    try {
      const response = await fetch(`/api/catalog-templates/${selectedTemplate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          percentageAdjustment: currentPercentage(),
          prices: currentPrices(),
        }),
      });
      const result = (await response.json()) as CatalogTemplatesResponse;
      if (!response.ok || !result.template) {
        throw new Error(result.message ?? "No se pudo guardar el catálogo.");
      }
      const saved = result.template;
      setTemplates((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      setAppliedTemplate(saved);
      setPricePercentage(toDraftPercentage(saved.percentageAdjustment));
      setProductPrices(toDraftPrices(saved.prices));
      setTemplateDirty(false);
      setTemplateStatus(`Catálogo "${saved.name}" guardado.`);
    } catch (saveError) {
      setTemplateStatus(saveError instanceof Error ? saveError.message : "No se pudo guardar el catálogo.");
    } finally {
      setTemplateBusy(false);
    }
  };

  const createTemplate = async () => {
    const name = newTemplateName.trim();
    if (!name || templateBusy || !priceForm.current?.reportValidity()) return;

    setTemplateBusy(true);
    setTemplateStatus(null);
    try {
      const response = await fetch("/api/catalog-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          percentageAdjustment: currentPercentage(),
          prices: currentPrices(),
        }),
      });
      const result = (await response.json()) as CatalogTemplatesResponse;
      if (!response.ok || !result.template) {
        throw new Error(result.message ?? "No se pudo crear el catálogo.");
      }
      const created = result.template;
      setTemplates((current) =>
        [...current, created].sort((first, second) => first.name.localeCompare(second.name, "es-MX"))
      );
      setSelectedTemplateId(created.id);
      setAppliedTemplate(created);
      setPricePercentage(toDraftPercentage(created.percentageAdjustment));
      setProductPrices(toDraftPrices(created.prices));
      setTemplateDirty(false);
      setNewTemplateName("");
      setTemplateStatus(`Catálogo "${created.name}" creado con los precios actuales.`);
    } catch (createError) {
      setTemplateStatus(createError instanceof Error ? createError.message : "No se pudo crear el catálogo.");
    } finally {
      setTemplateBusy(false);
    }
  };

  const deleteTemplate = async () => {
    if (!selectedTemplate || templateBusy) return;
    if (!window.confirm(`¿Eliminar el catálogo "${selectedTemplate.name}"? Esta acción no se puede deshacer.`)) return;

    setTemplateBusy(true);
    setTemplateStatus(null);
    try {
      const response = await fetch(`/api/catalog-templates/${selectedTemplate.id}`, { method: "DELETE" });
      const result = (await response.json()) as CatalogTemplatesResponse;
      if (!response.ok) {
        throw new Error(result.message ?? "No se pudo eliminar el catálogo.");
      }
      const remaining = templates.filter((item) => item.id !== selectedTemplate.id);
      setTemplates(remaining);
      const next = remaining[0] ?? null;
      setSelectedTemplateId(next?.id ?? null);
      setAppliedTemplate(next);
      setPricePercentage(toDraftPercentage(next?.percentageAdjustment ?? null));
      setProductPrices(toDraftPrices(next?.prices ?? {}));
      setTemplateDirty(false);
      setTemplateStatus(`Catálogo "${selectedTemplate.name}" eliminado.`);
    } catch (deleteError) {
      setTemplateStatus(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el catálogo.");
    } finally {
      setTemplateBusy(false);
    }
  };

  const adjustment = appliedTemplate?.percentageAdjustment ?? 0;
  const priceMultiplier = Number.isFinite(adjustment) && adjustment >= -100
    ? 1 + adjustment / 100
    : 1;
  const adjustedPrice = (product: Product) => (
    (Number.isFinite(product.price) ? product.price : 0) * priceMultiplier
  );
  const catalogPrice = (product: Product) => {
    const override = product.code ? appliedTemplate?.prices[product.code] : undefined;
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
          <div className={styles.templateBar}>
            <label>
              Catálogo
              <select
                value={selectedTemplateId ?? ""}
                disabled={templatesLoading || templateBusy || templates.length === 0}
                onChange={(event) => selectTemplate(event.target.value)}
              >
                {templates.length === 0 && <option value="">Sin catálogos guardados</option>}
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={styles.templateButton}
              onClick={() => void saveTemplate()}
              disabled={!selectedTemplate || !templateDirty || templateBusy}
            >
              <Save size={16} aria-hidden="true" />
              Guardar cambios
            </button>
            <button
              type="button"
              className={styles.templateButton}
              onClick={() => void deleteTemplate()}
              disabled={!selectedTemplate || templateBusy}
            >
              <Trash2 size={16} aria-hidden="true" />
              Eliminar
            </button>
            <div className={styles.newTemplate}>
              <input
                type="text"
                placeholder="Nombre del nuevo catálogo"
                maxLength={80}
                value={newTemplateName}
                onChange={(event) => setNewTemplateName(event.target.value)}
              />
              <button
                type="button"
                className={styles.templateButton}
                onClick={() => void createTemplate()}
                disabled={!newTemplateName.trim() || templateBusy}
              >
                Crear desde los precios actuales
              </button>
            </div>
          </div>
          {templateDirty && <p role="status">Hay cambios sin guardar en este catálogo.</p>}
          {templateStatus && <p role="status">{templateStatus}</p>}
          <p>Los cambios se ven en la vista previa y en ambos PDF. No modifican el inventario ni el POS.</p>
          <label className={styles.percentageField}>
            Ajuste general (%)
            <input
              type="number"
              min="-100"
              step="0.01"
              placeholder="0"
              value={pricePercentage}
              onChange={(event) => {
                setPricePercentage(event.target.value);
                setTemplateDirty(true);
              }}
            />
          </label>
          <p>Usa un valor negativo para descontar o uno positivo para aumentar. Se aplica a los productos sin precio especial.</p>
          <details>
            <summary>Editar precios por producto (MXN)</summary>
            <p>El precio manual tiene prioridad. Deja el campo vacío para usar el ajuste general del catálogo.</p>
            <div className={styles.productPrices}>
              {catalogProducts.filter(({ product }) => Boolean(product.code)).map(({ product }) => (
                <label key={product.id}>
                  <span>{product.name}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={money.format(adjustedPrice(product))}
                    value={productPrices[product.code ?? ""] ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      const code = product.code ?? "";
                      setProductPrices((current) => ({ ...current, [code]: value }));
                      setTemplateDirty(true);
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
                <div className={styles.detailCard}>
                  <span className={styles.detailIcon} aria-hidden="true">▣</span>
                  <span className={styles.detailLabel}>Caja</span>
                  <strong>{product.boxIncluded === undefined ? (product.boxLabel ?? "No registrada") : product.boxIncluded ? "Sí" : "No"}</strong>
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
