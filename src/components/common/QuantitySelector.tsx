export type QuantitySelectorProps = {
  value: number;
  onChange: (nextValue: number) => void;
  min?: number;
};

export default function QuantitySelector({
  value,
  onChange,
  min = 1,
}: QuantitySelectorProps) {
  return (
    <div className="inline-flex items-center rounded-full border border-zinc-200 bg-white shadow-sm">
      <button
        type="button"
        className="h-11 w-11 text-xl font-semibold text-zinc-700 transition hover:bg-zinc-100"
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <span className="min-w-12 text-center text-base font-semibold text-zinc-900">
        {value}
      </span>
      <button
        type="button"
        className="h-11 w-11 text-xl font-semibold text-zinc-700 transition hover:bg-zinc-100"
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}
