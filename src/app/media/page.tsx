"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  Folder,
  Images,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import BulkImageUploader from "@/components/BulkImageUploader/BulkImageUploader";
import styles from "./media.module.scss";

const productRoot = "moonie-kawaii/products";

type CloudinaryAsset = {
  asset_folder?: string;
  public_id: string;
  secure_url: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
};

type FolderNode = {
  path: string;
  name: string;
  children: FolderNode[];
  assetCount: number;
};

async function fetchCloudinaryAssets(): Promise<CloudinaryAsset[]> {
  const response = await fetch("/api/cloudinary/assets", {
    cache: "no-store",
  });
  const result = (await response.json()) as {
    assets?: CloudinaryAsset[];
    message?: string;
  };
  if (!response.ok || !result.assets) {
    throw new Error(result.message ?? "No se pudieron cargar las imágenes.");
  }
  return result.assets;
}

function buildFolderTree(assets: CloudinaryAsset[]): FolderNode {
  const root: FolderNode = {
    path: productRoot,
    name: "Productos",
    children: [],
    assetCount: assets.length,
  };
  const nodes = new Map([[productRoot, root]]);

  for (const asset of assets) {
    const folder =
      asset.asset_folder ??
      asset.public_id.split("/").slice(0, -1).join("/");
    if (!folder.startsWith(`${productRoot}/`)) continue;

    const segments = folder.slice(productRoot.length + 1).split("/");
    let currentPath = productRoot;
    let parent = root;
    for (const segment of segments) {
      currentPath = `${currentPath}/${segment}`;
      let node = nodes.get(currentPath);
      if (!node) {
        node = { path: currentPath, name: segment, children: [], assetCount: 0 };
        nodes.set(currentPath, node);
        parent.children.push(node);
      }
      node.assetCount += 1;
      parent = node;
    }
  }

  const sortNodes = (node: FolderNode) => {
    node.children.sort((first, second) =>
      first.name.localeCompare(second.name, "es-MX")
    );
    node.children.forEach(sortNodes);
  };
  sortNodes(root);
  return root;
}

function getAssetFolder(asset: CloudinaryAsset): string {
  return asset.asset_folder ?? asset.public_id.split("/").slice(0, -1).join("/");
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("es-MX");
}

function filterFolderTree(node: FolderNode, query: string): FolderNode | null {
  const children = node.children
    .map((child) => filterFolderTree(child, query))
    .filter((child): child is FolderNode => child !== null);
  const matches = normalizeSearchText(node.name).includes(query);
  if (!matches && children.length === 0) return null;
  return { ...node, children };
}

function formatBytes(bytes?: number): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex ? 1 : 0)} ${units[unitIndex]}`;
}

function FolderBranch({
  node,
  selectedFolder,
  expandedFolders,
  selectedFolders,
  searchActive,
  disabled,
  onSelect,
  onToggle,
  onToggleSelection,
  onDelete,
}: {
  node: FolderNode;
  selectedFolder: string;
  expandedFolders: Set<string>;
  selectedFolders: Set<string>;
  searchActive: boolean;
  disabled: boolean;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
  onToggleSelection: (path: string) => void;
  onDelete: (node: FolderNode) => void;
}) {
  const isExpanded =
    expandedFolders.has(node.path) || (searchActive && node.children.length > 0);
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div className={styles.folderRow}>
        <button
          type="button"
          className={styles.folderToggle}
          onClick={() => onToggle(node.path)}
          aria-label={`${isExpanded ? "Contraer" : "Expandir"} ${node.name}`}
          aria-expanded={isExpanded}
          disabled={!hasChildren || disabled}
        >
          {hasChildren ? (
            isExpanded ? (
              <Minus size={15} aria-hidden="true" />
            ) : (
              <Plus size={15} aria-hidden="true" />
            )
          ) : null}
        </button>
        <input
          type="checkbox"
          className={styles.selectionCheckbox}
          checked={selectedFolders.has(node.path)}
          onChange={() => onToggleSelection(node.path)}
          aria-label={`Seleccionar carpeta ${node.name} para eliminar`}
          disabled={disabled}
        />
        <button
          type="button"
          className={`${styles.folderButton} ${
            selectedFolder === node.path ? styles.selectedFolder : ""
          }`}
          onClick={() => onSelect(node.path)}
          disabled={disabled}
        >
          <Folder size={17} aria-hidden="true" />
          <span>{node.name}</span>
          <small>{node.assetCount}</small>
        </button>
        <button
          type="button"
          className={styles.folderDeleteButton}
          onClick={() => onDelete(node)}
          aria-label={`Eliminar carpeta ${node.name} y su contenido`}
          title="Eliminar carpeta y su contenido"
          disabled={disabled}
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>
      {hasChildren && isExpanded ? (
        <ul className={styles.folderChildren}>
          {node.children.map((child) => (
            <FolderBranch
              key={child.path}
              node={child}
              selectedFolder={selectedFolder}
              expandedFolders={expandedFolders}
              selectedFolders={selectedFolders}
              searchActive={searchActive}
              disabled={disabled}
              onSelect={onSelect}
              onToggle={onToggle}
              onToggleSelection={onToggleSelection}
              onDelete={onDelete}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function MediaPage() {
  const [assets, setAssets] = useState<CloudinaryAsset[]>([]);
  const [selectedFolder, setSelectedFolder] = useState(productRoot);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set()
  );
  const [folderSearch, setFolderSearch] = useState("");
  const [imageSearch, setImageSearch] = useState("");
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(
    () => new Set()
  );
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(
    () => new Set()
  );
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [workingAsset, setWorkingAsset] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [renameAsset, setRenameAsset] = useState<CloudinaryAsset | null>(null);
  const [newName, setNewName] = useState("");

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setAssets(await fetchCloudinaryAssets());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar las imágenes de Cloudinary."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchCloudinaryAssets()
      .then((loadedAssets) => {
        if (active) setAssets(loadedAssets);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar las imágenes de Cloudinary."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const folderTree = useMemo(() => buildFolderTree(assets), [assets]);
  const normalizedFolderSearch = normalizeSearchText(folderSearch.trim());
  const filteredFolderTree = useMemo(
    () =>
      normalizedFolderSearch
        ? filterFolderTree(folderTree, normalizedFolderSearch)
        : folderTree,
    [folderTree, normalizedFolderSearch]
  );
  const toggleFolder = (path: string) => {
    setExpandedFolders((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };
  const folderSegments = [
    { name: "Productos", path: productRoot },
    ...selectedFolder
      .slice(productRoot.length)
      .split("/")
      .filter(Boolean)
      .map((name, index, tail) => ({
        name,
        path: `${productRoot}/${tail.slice(0, index + 1).join("/")}`,
      })),
  ];
  const visibleAssets = useMemo(
    () =>
      assets
        .filter((asset) => getAssetFolder(asset) === selectedFolder)
        .filter((asset) =>
          asset.public_id
            .split("/")
            .at(-1)
            ?.toLocaleLowerCase()
            .includes(imageSearch.trim().toLocaleLowerCase())
        )
        .sort((first, second) =>
          first.public_id.localeCompare(second.public_id, "es-MX")
        ),
    [assets, imageSearch, selectedFolder]
  );

  const updateAsset = async (asset: CloudinaryAsset, body: Record<string, string>) => {
    setWorkingAsset(asset.public_id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/cloudinary/assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message ?? "Cloudinary rechazó la operación.");
      }
      setNotice(result.message ?? "Cambios guardados.");
      setRenameAsset(null);
      await loadAssets();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "No se pudo completar la operación."
      );
    } finally {
      setWorkingAsset("");
    }
  };

  const openRename = (asset: CloudinaryAsset) => {
    setRenameAsset(asset);
    setNewName(asset.public_id.split("/").at(-1) ?? "");
    setError("");
  };

  const submitRename = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!renameAsset || !newName.trim()) return;

    const oldName = renameAsset.public_id.split("/").at(-1) ?? "";
    if (oldName === newName.trim()) {
      setRenameAsset(null);
      return;
    }

    if (
      !window.confirm(
        `¿Confirmas renombrar "${oldName}" a "${newName.trim()}"? Si el producto referencia esta imagen por su nombre, la referencia podría dejar de funcionar.`
      )
    ) {
      return;
    }

    void updateAsset(renameAsset, {
      publicId: renameAsset.public_id,
      newName: newName.trim(),
    });
  };

  const deleteAsset = (asset: CloudinaryAsset) => {
    const name = asset.public_id.split("/").at(-1) ?? asset.public_id;
    void deleteSelection([asset.public_id], [], [], [name]);
  };

  const toggleFolderSelection = (path: string) => {
    setSelectedFolders((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const toggleAssetSelection = (publicId: string) => {
    setSelectedAssets((current) => {
      const next = new Set(current);
      if (next.has(publicId)) next.delete(publicId);
      else next.add(publicId);
      return next;
    });
  };

  const deleteSelection = async (
    publicIds: string[],
    folders: string[],
    folderDescriptions: string[] = [],
    assetDescriptions: string[] = [],
    alreadyConfirmed = false
  ) => {
    const folderRoots = folders.filter(
      (folder) =>
        !folders.some(
          (other) => other !== folder && folder.startsWith(`${other}/`)
        )
    );
    const imageCount = publicIds.filter(
      (publicId) =>
        !folderRoots.some((folder) => publicId.startsWith(`${folder}/`))
    ).length;
    const folderText = folderRoots.length
      ? `${folderRoots.length} carpeta(s)${folderDescriptions.length ? ` (${folderDescriptions.join(", ")})` : ""} y todo su contenido`
      : "";
    const imageText = imageCount
      ? `${imageCount} imagen(es)${assetDescriptions.length ? ` (${assetDescriptions.slice(0, 3).join(", ")})` : ""}`
      : "";
    const deletionDescription = [folderText, imageText].filter(Boolean).join(" y ");

    if (
      !alreadyConfirmed &&
      !window.confirm(
        `Se eliminará permanentemente ${deletionDescription} de Cloudinary. Las imágenes Cover dejarán de mostrarse como portada. Esta acción no se puede deshacer. ¿Deseas continuar?`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/cloudinary/assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicIds, folders }),
      });
      const result = (await response.json()) as {
        message?: string;
        errors?: string[];
      };
      if (!response.ok && response.status !== 207) {
        throw new Error(result.message ?? "Cloudinary rechazó la eliminación.");
      }
      setNotice(result.message ?? "Eliminación completada.");
      if (result.errors?.length) {
        setError(result.errors.slice(0, 5).join(" "));
      }
      setSelectedAssets(new Set());
      setSelectedFolders(new Set());
      const deletedFolderRoots = folders.filter(
        (folder) =>
          !folders.some(
            (other) => other !== folder && folder.startsWith(`${other}/`)
          )
      );
      const selectedFolderWasDeleted = deletedFolderRoots.some(
        (folder) =>
          selectedFolder === folder || selectedFolder.startsWith(`${folder}/`)
      );
      if (selectedFolderWasDeleted) {
        const parentFolder = selectedFolder.split("/").slice(0, -1).join("/");
        setSelectedFolder(
          parentFolder.startsWith(`${productRoot}/`)
            ? parentFolder
            : productRoot
        );
      }
      await loadAssets();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "No se pudieron eliminar los elementos seleccionados."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteFolder = (node: FolderNode) => {
    const containedImages =
      node.assetCount === 1 ? "1 imagen" : `${node.assetCount} imágenes`;
    if (
      !window.confirm(
        `Se eliminará permanentemente la carpeta "${node.name}", todas sus subcarpetas y su contenido (aproximadamente ${containedImages}). Esta acción no se puede deshacer. ¿Deseas continuar?`
      )
    ) {
      return;
    }

    void deleteSelection([], [node.path], [node.name], [], true);
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Administración de medios</p>
          <h1>Imágenes de productos</h1>
          <p>
            Navega por categoría, serie y producto para administrar sus imágenes
            directamente en Cloudinary.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => void loadAssets()}
            disabled={loading}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Actualizar
          </button>
          <BulkImageUploader
            key={selectedFolder}
            initialDestinationFolder={selectedFolder}
            stripTopLevelFolder
            showDestinationInput={false}
            triggerLabel="Subir a carpeta seleccionada"
          />
        </div>
      </header>

      <aside className={styles.warning} role="note">
        <AlertTriangle size={21} aria-hidden="true" />
        <div>
          <strong>Acceso administrativo sin login</strong>
          <p>
            Hasta que se agregue el inicio de sesión global, este módulo y sus
            operaciones están abiertos a quienes puedan acceder a la aplicación.
            Confirma cuidadosamente cada cambio. La eliminación es permanente;
            renombrar una imagen puede romper su referencia en el catálogo.
          </p>
        </div>
      </aside>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}

      <div className={styles.workspace}>
        <aside className={styles.folderPanel} aria-label="Carpetas de productos">
          <div className={styles.folderPanelHeader}>
            <h2>Carpetas</h2>
            <button
              type="button"
              onClick={() => setExpandedFolders(new Set())}
              disabled={expandedFolders.size === 0}
            >
              Contraer todo
            </button>
          </div>
          <input
            type="search"
            className={styles.folderSearch}
            value={folderSearch}
            onChange={(event) => setFolderSearch(event.target.value)}
            placeholder="Buscar carpeta..."
            aria-label="Buscar solo por nombre de carpeta"
          />
          {loading && assets.length === 0 ? (
            <p className={styles.muted}>Cargando estructura...</p>
          ) : filteredFolderTree && filteredFolderTree.children.length > 0 ? (
            <ul className={styles.folderTree}>
              {filteredFolderTree.children.map((node) => (
                <FolderBranch
                  key={node.path}
                  node={node}
                  selectedFolder={selectedFolder}
                  expandedFolders={expandedFolders}
                  selectedFolders={selectedFolders}
                  searchActive={Boolean(normalizedFolderSearch)}
                  disabled={isDeleting}
                  onSelect={setSelectedFolder}
                  onToggle={toggleFolder}
                  onToggleSelection={toggleFolderSelection}
                  onDelete={deleteFolder}
                />
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>
              {normalizedFolderSearch
                ? "No se encontraron carpetas con ese nombre."
                : "No se encontraron carpetas con imágenes."}
            </p>
          )}
        </aside>

        <section className={styles.assetPanel} aria-label="Contenido de carpeta">
          <nav className={styles.breadcrumbs} aria-label="Ruta de carpeta">
            {folderSegments.map((segment, index) => {
            return (
              <span key={segment.path}>
                {index > 0 ? <ChevronRight size={15} aria-hidden="true" /> : null}
                <button
                  type="button"
                  onClick={() => setSelectedFolder(segment.path)}
                  disabled={segment.path === selectedFolder}
                >
                  {segment.name}
                </button>
              </span>
            );
            })}
          </nav>

          <div className={styles.assetToolbar}>
            <div>
              <h2>{folderSegments.at(-1)?.name}</h2>
              <p>{visibleAssets.length} imagen(es) en esta carpeta</p>
            </div>
            <div className={styles.assetToolbarActions}>
              <input
                type="search"
                value={imageSearch}
                onChange={(event) => setImageSearch(event.target.value)}
                placeholder="Buscar imagen..."
                aria-label="Buscar imagen"
              />
              {selectedAssets.size > 0 || selectedFolders.size > 0 ? (
                <button
                  type="button"
                  className={styles.deleteSelectedButton}
                  onClick={() =>
                    void deleteSelection(
                      [...selectedAssets],
                      [...selectedFolders],
                      [...selectedFolders]
                        .slice(0, 3)
                        .map((path) => path.split("/").at(-1) ?? path),
                      [...selectedAssets]
                        .slice(0, 3)
                        .map((path) => path.split("/").at(-1) ?? path)
                    )
                  }
                  disabled={isDeleting}
                >
                  <Trash2 size={16} aria-hidden="true" />
                  {isDeleting
                    ? "Eliminando..."
                    : `Eliminar seleccionados (${selectedAssets.size + selectedFolders.size})`}
                </button>
              ) : null}
            </div>
          </div>

          {loading ? (
            <p className={styles.emptyState}>Cargando imágenes...</p>
          ) : visibleAssets.length > 0 ? (
            <>
              <label className={styles.selectAllAssets}>
                <input
                  type="checkbox"
                  checked={
                    visibleAssets.length > 0 &&
                    visibleAssets.every((asset) =>
                      selectedAssets.has(asset.public_id)
                    )
                  }
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setSelectedAssets((current) => {
                      const next = new Set(current);
                      for (const asset of visibleAssets) {
                        if (checked) next.add(asset.public_id);
                        else next.delete(asset.public_id);
                      }
                      return next;
                    });
                  }}
                  aria-label="Seleccionar todas las imágenes visibles"
                />
                Seleccionar todas las imágenes visibles
              </label>
              <div className={styles.assetGrid}>
                {visibleAssets.map((asset) => {
                const name = asset.public_id.split("/").at(-1) ?? asset.public_id;
                const isCover = name.toLocaleLowerCase() === "cover";
                return (
                  <article className={styles.assetCard} key={asset.public_id}>
                    <a
                      className={styles.preview}
                      href={asset.secure_url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Abrir imagen ${name} en una pestaña nueva`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.secure_url} alt={name} loading="lazy" />
                    </a>
                    <label className={styles.assetSelection}>
                      <input
                        type="checkbox"
                        checked={selectedAssets.has(asset.public_id)}
                        onChange={() => toggleAssetSelection(asset.public_id)}
                        aria-label={`Seleccionar imagen ${name}`}
                        disabled={isDeleting}
                      />
                      Seleccionar
                    </label>
                    <div className={styles.assetInfo}>
                      <strong title={name}>{name}</strong>
                      <small>
                        {[asset.format?.toUpperCase(), formatBytes(asset.bytes)]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    </div>
                    <div className={styles.assetActions}>
                      <button
                        type="button"
                        onClick={() => openRename(asset)}
                        disabled={Boolean(workingAsset) || isCover || isDeleting}
                        title={
                          isCover
                            ? "La portada debe conservar el nombre Cover."
                            : "Renombrar imagen"
                        }
                      >
                        <Pencil size={16} aria-hidden="true" />
                        Renombrar
                      </button>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => deleteAsset(asset)}
                        disabled={Boolean(workingAsset) || isDeleting}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                        Eliminar
                      </button>
                    </div>
                    {workingAsset === asset.public_id ? (
                      <small className={styles.working}>Procesando...</small>
                    ) : null}
                  </article>
                );
              })}
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>
              <Images size={34} aria-hidden="true" />
              <strong>Esta carpeta no contiene imágenes</strong>
              <span>
                Selecciona otra carpeta o carga imágenes aquí con el botón de
                arriba.
              </span>
            </div>
          )}
        </section>
      </div>

      {renameAsset ? (
        <div
          className={styles.modalOverlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setRenameAsset(null);
          }}
        >
          <form
            className={styles.renameDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-image-title"
            onSubmit={submitRename}
          >
            <h2 id="rename-image-title">Renombrar imagen</h2>
            <p>
              Escribe el nuevo nombre de Cloudinary. Verifica antes: el producto
              puede depender del nombre actual de esta imagen.
            </p>
            <label htmlFor="rename-image-name">Nuevo nombre</label>
            <input
              id="rename-image-name"
              autoFocus
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setRenameAsset(null)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={!newName.trim() || Boolean(workingAsset)}
              >
                Confirmar cambio
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
