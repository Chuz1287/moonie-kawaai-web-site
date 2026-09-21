"use client";

import ImageUploader from "@/components/common/ImageUploader";
import { usePosModule } from "./pos.logic";
import styles from "./pos.module.scss";

export default function PosModule() {
  const {
    products,
    cart,
    search,
    setSearch,
    subtotal,
    tax,
    total,
    status,
    isSyncing,
    addToCart,
    removeFromCart,
    updateQuantity,
    saveSale,
    syncNow,
  } = usePosModule();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Monie Kawaai</p>
          <h1>Point of Sale</h1>
        </div>

        <button className={styles.syncButton} onClick={() => void syncNow()}>
          {isSyncing ? "Syncing..." : "Sync now"}
        </button>
      </header>

      <div className={styles.statusRow}>
        <span className={styles.statusBadge}>{status}</span>
      </div>

      <main className={styles.grid}>
        <section className={styles.productsPanel}>
          <div className={styles.toolbar}>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products..."
              aria-label="Search products"
            />
          </div>

          <div className={styles.productGrid}>
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                className={styles.productCard}
                onClick={() => addToCart(product)}
              >
                <span className={styles.productCategory}>{product.category}</span>
                <strong>{product.name}</strong>
                <span>{product.code}</span>
                <div className={styles.productMeta}>
                  <b>${product.price.toFixed(2)}</b>
                  <small>{product.stock} stock</small>
                </div>
              </button>
            ))}
          </div>
        </section>

        <aside className={styles.cartPanel}>
          <h2>Current sale</h2>

          <div className={styles.cartList}>
            {cart.length === 0 ? (
              <p className={styles.emptyCart}>No items added yet.</p>
            ) : (
              cart.map((item) => (
                <div key={item.productId} className={styles.cartItem}>
                  <div>
                    <strong>{item.name}</strong>
                    <small>${item.price.toFixed(2)} each</small>
                  </div>

                  <div className={styles.quantityControls}>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    >
                      −
                    </button>

                    <span>{item.quantity}</span>

                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => removeFromCart(item.productId)}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>

          <div className={styles.imageUploaderWrap}>
            <ImageUploader label="Product media upload" />
          </div>

          <div className={styles.summary}>
            <div>
              <span>Subtotal</span>
              <strong>${subtotal.toFixed(2)}</strong>
            </div>
            <div>
              <span>Tax</span>
              <strong>${tax.toFixed(2)}</strong>
            </div>
            <div className={styles.totalRow}>
              <span>Total</span>
              <strong>${total.toFixed(2)}</strong>
            </div>
          </div>

          <button
            className={styles.checkoutButton}
            onClick={() => void saveSale()}
          >
            Complete sale
          </button>
        </aside>
      </main>
    </div>
  );
}
