import styles from "./InventoryHeader.module.scss";

type InventoryHeaderProps = {
  totalCount: number;
};

export default function InventoryHeader({ totalCount }: InventoryHeaderProps) {
  return (
    <div className={styles.header}>
      <h1 className={styles.title}>
        Inventario <span className={styles.count}>({totalCount})</span>
      </h1>
    </div>
  );
}
