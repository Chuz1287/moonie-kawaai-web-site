"use client";

import type { CartPanelProps } from "./CartPanel.logic";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { formatCartCurrency, formatCartPriceInput, useCartPriceDrafts } from "./CartPanel.logic";
import styles from "./CartPanel.module.scss";

export default function CartPanel({
  cart,
  products,
  onChangeQuantity,
  onChangePrice,
  onRemove,
  onCheckout,
  isCheckingOut = false,
  onClose,
  onOpen,
  total,
}: CartPanelProps) {
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const { priceDrafts, updateDraft, commitDraft, clearDraft } =
    useCartPriceDrafts(onChangePrice);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const changeQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      clearDraft(productId);
    }
    onChangeQuantity(productId, quantity);
  };
  const removeItem = (productId: string) => {
    clearDraft(productId);
    onRemove(productId);
  };
  const clearCart = () => cart.forEach((item) => removeItem(item.productId));

  if (onOpen && !onClose) {
    return (
      <>
      <div
        style={{
          borderColor: "rgba(167, 139, 250, 0.6)",
          background: "linear-gradient(to right, rgba(124, 58, 247, 0.9), rgba(168, 85, 247, 0.9))",
          color: "var(--text-primary)",
          boxShadow: "0 25px 50px -12px rgba(109, 40, 217, 0.3)",
        }}
        className="fixed bottom-24 md:bottom-4 left-1/2 z-40 flex w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 items-center gap-2 rounded-2xl border px-4 py-3 text-left backdrop-blur transition hover:shadow-lg"
      >
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-lg">🛒</div>
            <div>
              <p className="text-sm font-black leading-none">Ver Carrito de Compra</p>
              <p className="mt-1 text-[11px]" style={{ color: "rgba(255, 255, 255, 0.7)" }}>{itemCount} artículos seleccionados</p>
            </div>
          </div>

          <p className="text-xl font-black">{formatCartCurrency(total)}</p>
        </button>

        <div className={styles.previewActions}>
          <button
            type="button"
            onClick={() => setIsClearConfirmOpen(true)}
            className={styles.previewClearBtn}
            aria-label="Eliminar carrito"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onCheckout}
            disabled={cart.length === 0 || isCheckingOut}
            className={styles.previewConfirmBtn}
            aria-label="Confirmar venta"
            aria-busy={isCheckingOut}
          >
            {isCheckingOut ? (
              <span className={styles.spinner} aria-hidden="true" />
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={isClearConfirmOpen}
        title="Eliminar carrito"
        message="¿Estás seguro de eliminar el carrito? Se quitarán todos los artículos seleccionados."
        cancelLabel="Cancelar"
        confirmLabel="Eliminar"
        onCancel={() => setIsClearConfirmOpen(false)}
        onConfirm={() => {
          clearCart();
          setIsClearConfirmOpen(false);
        }}
      />
      </>
    );
  }

  return (
    <div className={styles.panelMain}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Carrito de Ventas</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Cerrar carrito"
          >
            ×
          </button>
        )}
      </div>

      <div className={styles.itemsList}>
        {cart.length === 0 ? (
          <p className={styles.emptyState}>
            No hay productos en el carrito.
          </p>
        ) : (
          cart
            .filter((item) => item.quantity > 0)
            .map((item) => {
              const product = products.find((entry) => entry.id === item.productId);

              if (!product) {
                return null;
              }

              return (
                <div key={item.productId} className={styles.cartItem}>
                  <div className={styles.itemContent}>
                    <div className={styles.itemInfo}>
                      <h3 className={styles.itemName}>{product.name}</h3>
                      <p className={styles.itemStock}>Stock: {product.stock} pzs</p>

                      <input
                        type="text"
                        inputMode="decimal"
                        value={
                          priceDrafts[item.productId] !== undefined
                            ? priceDrafts[item.productId]
                            : formatCartPriceInput(item.unitPrice ?? product.price)
                        }
                        onChange={(event) => updateDraft(item.productId, parseFloat(event.target.value) || 0)}
                        onBlur={() => commitDraft(item.productId)}
                        className={styles.priceInput}
                      />
                    </div>

                    <div className={styles.itemActions}>
                      <div style={{ display: "inline-flex", alignItems: "center", borderRadius: "var(--component-border-radius)", border: `1px solid var(--border-color)` }}>
                        <button
                          type="button"
                          className={styles.quantityBtn}
                          onClick={() => changeQuantity(item.productId, item.quantity - 1)}
                        >
                          −
                        </button>
                        <span style={{ padding: "0 0.75rem", fontWeight: "900", color: "var(--text-primary)" }}>{item.quantity}</span>
                        <button
                          type="button"
                          className={styles.quantityBtn}
                          onClick={() => changeQuantity(item.productId, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className={styles.removeBtn}
                        aria-label={`Quitar ${product.name}`}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
        )}
      </div>

      <div className={styles.panelFooter}>
        <div className={styles.totalRow}>
          <span>Total a Cobrar:</span>
          <span style={{ color: "var(--accent-success)" }}>{formatCartCurrency(total)}</span>
        </div>

        <div className={styles.actionButtons}>
          <button
            type="button"
            onClick={clearCart}
            className={styles.clearBtn}
          >
            Vaciar
          </button>
          <button
            type="button"
            onClick={onCheckout}
            disabled={cart.length === 0 || isCheckingOut}
            aria-busy={isCheckingOut}
            className={styles.checkoutBtn}
          >
            {isCheckingOut ? (
              <span className={styles.spinnerRow}>
                <span className={styles.spinner} aria-hidden="true" />
                Confirmando...
              </span>
            ) : (
              "Confirmar Venta"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
