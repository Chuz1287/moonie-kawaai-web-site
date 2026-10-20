export type AddToCartButtonProps = {
  quantity?: number;
  onClick?: () => void;
  disabled?: boolean;
};

export default function AddToCartButton({
  quantity = 1,
  onClick,
  disabled = false,
}: AddToCartButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-full bg-violet-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
    >
      Agregar al carrito ({quantity})
    </button>
  );
}
