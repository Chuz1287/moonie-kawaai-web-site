import styles from "./Spinner.module.scss";

type SpinnerProps = {
  size?: "sm" | "md";
};

export default function Spinner({ size = "sm" }: SpinnerProps) {
  return <span className={`${styles.spinner} ${styles[size]}`} aria-hidden="true" />;
}
