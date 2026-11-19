import styles from "./AppVersion.module.scss";

type AppVersionProps = {
  version: string;
  className?: string;
};

export default function AppVersion({ version, className }: AppVersionProps) {
  return (
    <p className={`${styles.version} ${className ?? ""}`.trim()}>
      Versión {version}
    </p>
  );
}
