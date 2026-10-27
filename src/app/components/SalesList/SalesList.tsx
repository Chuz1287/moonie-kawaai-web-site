"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { SalesListProps } from "./SalesList.logic";
import SaleActions from "@/components/SaleActions";
import {
  getSaleLineName,
  getSaleLines,
  saleHasStableProductIds,
} from "@/pages/sales/sales.logic";
import { getSaleProfit, type SaleRecord } from "@/services/sales";
import styles from "./SalesList.module.scss";

type TicketLayout = "split" | "accordion" | "dense";

const LAYOUTS: { id: TicketLayout; label: string }[] = [
  { id: "split", label: "Split" },
  { id: "accordion", label: "Acordeón" },
  { id: "dense", label: "Tabla" },
];

function formatMoney(value: number) {
  return `$${value.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getTicketLabel(sale: SaleRecord) {
  return sale.sale_number || sale.id.slice(0, 14);
}

function getLineView(line: ReturnType<typeof getSaleLines>[number]) {
  const quantity = Number(line.quantity ?? line.cantidad ?? 0);
  const unitPrice = Number(line.unitPrice ?? line.precio_venta_unitario ?? 0);
  return {
    name: getSaleLineName(line),
    quantity,
    unitPrice,
    total: quantity * unitPrice,
  };
}

function getSaleMargin(sale: SaleRecord) {
  const total = Number(sale.total ?? 0);
  return total > 0 ? Math.round((getSaleProfit(sale) / total) * 100) : 0;
}

export default function SalesList({ model }: SalesListProps) {
  const [layout, setLayout] = useState<TicketLayout>("split");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  if (model.viewMode === "pieces") {
    return (
      <div className={styles.scope}>
        <div className={styles.piecesView}>
          {model.pieces.map(({ sale, line, index }) => (
            <div key={`${sale.id}-${index}`} className={styles.pieceRow}>
              <div className={styles.pieceInfo}>
                <div className={styles.productName}>{getSaleLineName(line)}</div>
                <div className={styles.saleDetails}>
                  <span>Cantidad: {line.quantity}</span>
                  <span>Precio: {formatMoney(Number(line.unitPrice ?? 0))}</span>
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

  const sales = model.paginatedGroups.flatMap((group) => group.items);
  const activeSale = sales.find((sale) => sale.id === selectedId) ?? sales[0] ?? null;

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const renderActions = (sale: SaleRecord) => (
    <SaleActions
      sale={sale}
      disabled={model.busySaleIds.includes(sale.id)}
      onEdit={() => model.startEditing(sale)}
      onDelete={() => void model.handleDelete(sale)}
    />
  );

  const renderEditWarning = (sale: SaleRecord) =>
    saleHasStableProductIds(sale) ? null : (
      <div className={styles.warningMessage}>
        No editable: fallan IDs de producto para ajustar el inventario con seguridad.
      </div>
    );

  const renderLinesTable = (sale: SaleRecord) => (
    <div className={styles.linesWrap}>
      <table className={styles.linesTable}>
        <thead>
          <tr>
            <th>Pieza</th>
            <th className={styles.numeric}>Cant.</th>
            <th className={styles.numeric}>Precio</th>
            <th className={styles.numeric}>Importe</th>
          </tr>
        </thead>
        <tbody>
          {getSaleLines(sale).map((line, index) => {
            const view = getLineView(line);
            return (
              <tr key={index}>
                <td>{view.name}</td>
                <td className={styles.numeric}>{view.quantity}</td>
                <td className={styles.numeric}>{formatMoney(view.unitPrice)}</td>
                <td className={styles.numeric}>{formatMoney(view.total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderSplit = (current: SaleRecord) => (
    <div className={styles.split}>
      <div className={styles.masterPane}>
        <div className={styles.masterHeader}>
          <span>Transacciones ({sales.length})</span>
          <span>Más reciente primero</span>
        </div>
        <div className={styles.masterList}>
          {sales.map((sale) => {
            const isActive = sale.id === current.id;
            return (
              <button
                key={sale.id}
                type="button"
                onClick={() => setSelectedId(sale.id)}
                aria-pressed={isActive}
                className={styles.masterItem}
              >
                <span className={styles.masterMain}>
                  <span className={styles.masterTitle}>Ticket {getTicketLabel(sale)}</span>
                  <span className={styles.masterMeta}>
                    {sale.hora ? `${sale.hora} • ` : ""}
                    {getSaleLines(sale).map((line) => `${getLineView(line).quantity}x ${getSaleLineName(line)}`).join(", ")}
                  </span>
                </span>
                <span className={styles.masterTotal}>{formatMoney(Number(sale.total ?? 0))}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.detailPane}>
        <div>
          <h3 className={styles.detailTitle}>Ticket {getTicketLabel(current)}</h3>
          <p className={styles.detailMeta}>
            {current.fecha}
            {current.hora ? ` a las ${current.hora}` : ""} • Evento:{" "}
            <strong>{model.getEventName(current.event_id)}</strong>
          </p>
        </div>

        {renderLinesTable(current)}

        <div className={styles.totals}>
          <div className={styles.totalRow}>
            <span>Ganancia ({getSaleMargin(current)}%)</span>
            <span>{formatMoney(getSaleProfit(current))}</span>
          </div>
          <div className={styles.totalGrand}>
            <span>Total transacción</span>
            <span>{formatMoney(Number(current.total ?? 0))}</span>
          </div>
        </div>

        {renderEditWarning(current)}
        <div className={styles.detailActions}>{renderActions(current)}</div>
      </div>
    </div>
  );

  const renderAccordion = () => (
    <div className={styles.accordion}>
      {sales.map((sale) => {
        const isExpanded = expandedIds.includes(sale.id);
        const lines = getSaleLines(sale);
        return (
          <div key={sale.id} className={styles.accordionItem}>
            <button
              type="button"
              onClick={() => toggleExpanded(sale.id)}
              aria-expanded={isExpanded}
              className={styles.accordionHeader}
            >
              <span className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ""}`}>
                <ChevronRight size={16} aria-hidden="true" />
              </span>
              <span className={styles.accordionInfo}>
                <span className={styles.masterTitle}>
                  Ticket {getTicketLabel(sale)}
                  {sale.hora ? ` • ${sale.hora}` : ""}
                </span>
                <span className={styles.masterMeta}>
                  {lines.length} {lines.length === 1 ? "pieza" : "piezas"} (
                  {lines.map((line) => getSaleLineName(line)).join(", ")})
                </span>
              </span>
              <span className={styles.masterTotal}>{formatMoney(Number(sale.total ?? 0))}</span>
            </button>

            {isExpanded && (
              <div className={styles.accordionBody}>
                <div className={styles.bodyMeta}>
                  <span>Evento: {model.getEventName(sale.event_id)}</span>
                  <span>Fecha: {sale.fecha}</span>
                  <span>Ganancia: {formatMoney(getSaleProfit(sale))}</span>
                </div>
                <ul className={styles.itemList}>
                  {lines.map((line, index) => {
                    const view = getLineView(line);
                    return (
                      <li key={index}>
                        <span>
                          {view.quantity}x {view.name}
                        </span>
                        <span>{formatMoney(view.total)}</span>
                      </li>
                    );
                  })}
                </ul>
                {renderEditWarning(sale)}
                <div className={styles.detailActions}>{renderActions(sale)}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderDense = () => (
    <div className={styles.tableWrap}>
      <table className={styles.denseTable}>
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Hora</th>
            <th>Evento</th>
            <th>Artículos</th>
            <th className={styles.numeric}>Ganancia</th>
            <th className={styles.numeric}>Total</th>
            <th className={styles.center}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id}>
              <td className={styles.ticketCell}>{getTicketLabel(sale)}</td>
              <td>{sale.hora || "—"}</td>
              <td>{model.getEventName(sale.event_id)}</td>
              <td className={styles.itemsCell}>
                {getSaleLines(sale).map((line) => `${getLineView(line).quantity}x ${getSaleLineName(line)}`).join(", ")}
              </td>
              <td className={styles.numeric}>{formatMoney(getSaleProfit(sale))}</td>
              <td className={`${styles.numeric} ${styles.totalCell}`}>
                {formatMoney(Number(sale.total ?? 0))}
              </td>
              <td className={styles.center}>{renderActions(sale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className={styles.scope}>
      <div className={styles.toolbar}>
        <div className={styles.layoutSwitch} role="group" aria-label="Diseño de tickets">
          {LAYOUTS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setLayout(item.id)}
              aria-pressed={layout === item.id}
              className={styles.layoutButton}
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className={styles.counter}>
          Mostrando {sales.length} de {model.matchingSales.length} tickets
        </span>
      </div>

      {sales.length === 0 && (
        <div className={styles.empty}>No hay ventas para mostrar</div>
      )}
      {activeSale && layout === "split" && renderSplit(activeSale)}
      {sales.length > 0 && layout === "accordion" && renderAccordion()}
      {sales.length > 0 && layout === "dense" && renderDense()}

      {sales.length < model.matchingSales.length && (
        <div className={styles.loadMore}>
          <button
            type="button"
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

