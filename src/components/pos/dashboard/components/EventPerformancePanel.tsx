"use client";

import { formatPosCurrency, type PosDashboardModel } from "../dashboard.logic";

export default function EventPerformancePanel({ model }: { model: PosDashboardModel }) {
  const { eventPerformance } = model;

  return (
    <section
      aria-live="polite"
      className="mt-4 rounded-2xl border border-violet-400/30 bg-slate-950/70 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
            Retorno de inversión
          </p>
          <h2 className="mt-1 text-lg font-black text-white">
            {model.salesChannels.find((event) => event.id === model.selectedEvent)?.name ??
              "Default"}
          </h2>
        </div>
        {eventPerformance && (
          <strong
            className={`text-lg font-black ${
              eventPerformance.balance >= 0 ? "text-emerald-300" : "text-amber-300"
            }`}
          >
            {eventPerformance.balance >= 0
              ? `Ganancia ${formatPosCurrency(eventPerformance.balance)}`
              : `Faltan ${formatPosCurrency(eventPerformance.amountToBreakEven)}`}
          </strong>
        )}
      </div>

      {model.eventPerformanceError ? (
        <p role="alert" className="mt-3 text-sm text-rose-300">
          {model.eventPerformanceError}
        </p>
      ) : !eventPerformance ? (
        <p className="mt-3 text-sm text-slate-400">Calculando retorno del evento...</p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-slate-400">Ventas del evento</p>
              <p className="mt-1 font-bold text-emerald-300">
                {formatPosCurrency(eventPerformance.salesTotal)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Costo de mercancía vendida</p>
              <p className="mt-1 font-bold text-white">
                {formatPosCurrency(eventPerformance.merchandiseCost)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Gastos del evento</p>
              <p className="mt-1 font-bold text-white">
                {formatPosCurrency(eventPerformance.expensesTotal)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Inversión a recuperar</p>
              <p className="mt-1 font-bold text-white">
                {formatPosCurrency(eventPerformance.totalInvestment)}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div
              className="h-2 overflow-hidden rounded-full bg-slate-700"
              role="progressbar"
              aria-label="Porcentaje de inversión recuperada"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={
                eventPerformance.totalInvestment > 0
                  ? Math.min(
                      100,
                      (eventPerformance.salesTotal / eventPerformance.totalInvestment) * 100
                    )
                  : eventPerformance.salesTotal > 0
                    ? 100
                    : 0
              }
            >
              <div
                className="h-full rounded-full bg-emerald-400 transition-all"
                style={{
                  width: `${
                    eventPerformance.totalInvestment > 0
                      ? Math.min(
                          100,
                          (eventPerformance.salesTotal / eventPerformance.totalInvestment) * 100
                        )
                      : eventPerformance.salesTotal > 0
                        ? 100
                        : 0
                  }%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {eventPerformance.balance >= 0
                ? "La inversión del evento ya se recuperó."
                : `Faltan ${formatPosCurrency(
                    eventPerformance.amountToBreakEven
                  )} para recuperar la inversión.`}
            </p>
          </div>

          {eventPerformance.incompleteSaleCount > 0 && (
            <p role="status" className="mt-3 text-xs text-amber-300">
              Hay {eventPerformance.incompleteSaleCount} venta(s) sin desglose completo de
              productos; el costo de mercancía puede estar incompleto.
            </p>
          )}
        </>
      )}
    </section>
  );
}
