import styles from "./InventoryHeader.module.scss";

export default function InventoryHeader() {
  return (
    <div className={styles.header}>
      <div className={styles.titleBlock}>
        <p className={styles.subtitle}>Control</p>
        <h1 className={styles.title}>Inventario</h1>
      </div>
    </div>
  );
}
