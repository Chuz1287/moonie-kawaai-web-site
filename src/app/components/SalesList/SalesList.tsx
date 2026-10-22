"use client";

import type { SalesListProps } from "./SalesList.logic";
import SaleActions from "@/components/SaleActions";
import { saleHasStableProductIds, getSaleLines } from "@/pages/sales/sales.logic";
import styles from "./SalesList.module.scss";

export default function SalesList({ model }: SalesListProps) {
  if (model.viewMode === "pieces") {
    return (
      <div className={`${styles.scope}`}>
        <div className={styles.piecesView}>
          {model.pieces.map(({ sale, line, index }) => (
            <div key={`${sale.id}-${index}`} className={styles.pieceRow}>
              <div className={styles.pieceInfo}>
                <div className={styles.productName}>{line.productName || line.name || "Producto"}</div>
                <div className={styles.saleDetails}>
                  <span>Cantidad: {line.quantity}</span>
                  <span>Precio: ${Number(line.unitPrice ?? 0).toFixed(2)}</span>
                  <span>Evento: {model.getEventName(sale.event_id)}</span>
                  <span>{sale.fecha}</span>
                </div>
              </div>
              <SaleActions
                sale={sale}
                disabled={model.busySaleIds.includes(sale.id)}
                onEdit={() => model.startEditing(sale)}
                onDelete={() => void model.handleDelete(sale)}
              />
            </div>
          ))}
        </div>
        {model.pieces.length === 0 && (
          <div className={styles.empty}>No hay piezas vendidas</div>
        )}
      </div>
    );
  }

  return (
    <div className={`${styles.scope}`}>
      {model.paginatedGroups.map((group) => (
        <div key={group.date} className={styles.dateGroup}>
          <div className={styles.dateHeader}>
            <h3>{group.date}</h3>
            <div className={styles.groupTotal}>${Number(group.total).toFixed(2)}</div>
          </div>
          <div className={styles.ticketList}>
            {group.items.map((sale) => {
              const lines = getSaleLines(sale);
              const isEditable = saleHasStableProductIds(sale);
              const profit = Number(sale.ganancia ?? 0);

              return (
                <div key={sale.id} className={styles.ticketRow}>
                  <div className={styles.ticketHeader}>
                    <div className={styles.ticketInfo}>
                      <div className={styles.ticketNumber}>
                        Ticket {sale.sale_number || sale.id.slice(0, 14)}
                      </div>
                      <div className={styles.ticketMeta}>
                        <span>{sale.fecha}</span>
                        {sale.hora && <span>{sale.hora}</span>}
                        <span>{model.getEventName(sale.event_id)}</span>
                      </div>
                    </div>
                    <div className={styles.ticketAmount}>
                      <div className={styles.amountValue}>
                        ${Number(sale.total ?? 0).toFixed(2)}
                      </div>
                      <div className={styles.amountLabel}>Total</div>
                      {profit > 0 && (
                        <div className={styles.profitInfo}>
                          <span className={styles.profitLabel}>Ganancia</span>
                          <span className={styles.profitValue}>
                            ${profit.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tabla de productos */}
                  <div className={styles.productsSection}>
                    <table className={styles.productsTable}>
                      <thead>
                        <tr>
                          <th>PIEZA</th>
                          <th>ID</th>
                          <th>CANT.</th>
                          <th>PRECIO</th>
                          <th>IMPORTE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((line, idx) => {
                          const qty = Number(line.quantity ?? line.cantidad ?? 0);
                          const price = Number(line.unitPrice ?? line.precio_venta_unitario ?? 0);
                          const total = qty * price;
                          return (
                            <tr key={idx}>
                              <td>{line.productName || line.name || "Producto"}</td>
                              <td>{line.productId || line.product_id || "—"}</td>
                              <td>{qty}</td>
                              <td>${price.toFixed(2)}</td>
                              <td>${total.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Acciones y validación */}
                  <div className={styles.ticketActions}>
                    <SaleActions
                      sale={sale}
                      disabled={model.busySaleIds.includes(sale.id)}
                      onEdit={() => model.startEditing(sale)}
                      onDelete={() => void model.handleDelete(sale)}
                    />
                    {!isEditable && (
                      <div className={styles.warningMessage}>
                        No editable: fallan IDs de producto para ajustar el inventario con seguridad.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {model.paginatedGroups.length === 0 && (
        <div className={styles.empty}>No hay ventas para mostrar</div>
      )}
      {model.paginatedGroups.length > 0 && (
        <div className={styles.loadMore}>
          <button
            onClick={() => model.setVisibleCount(model.visibleCount + 50)}
            className={styles.loadMoreBtn}
          >
            Cargar más
          </button>
        </div>
      )}
    </div>
  );
}

