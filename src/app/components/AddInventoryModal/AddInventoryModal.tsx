"use client";

import { useId, useMemo, useState } from "react";
import { Check, ChevronDown, Plus, Search, X } from "lucide-react";
import type { AddInventoryModalProps } from "./AddInventoryModal.logic";
import styles from "./AddInventoryModal.module.scss";

type SearchableDropdownProps = {
  options: string[];
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

type CategorySelectorProps = {
  options: string[];
  selected: string[];
  onChange: (categories: string[]) => void;
};

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX");
}

const emptyForm = {
  code: "",
  name: "",
  shortDescription: "",
  categories: [] as string[],
  categoryDraft: "",
  series: "",
  stock: "" as number | "",
  price: "" as number | "",
  cost: "" as number | "",
  image: "",
};

function CategorySelector({ options, selected, onChange }: CategorySelectorProps) {
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeSearch(query.trim());
    return options.filter((option) =>
      normalizeSearch(option).includes(normalizedQuery) && !selected.includes(option)
    );
  }, [options, query, selected]);

  return (
    <div className={styles.searchableDropdown}>
      <div className={styles.searchInputWrap}>
        <Search size={16} aria-hidden="true" />
        <input
          type="text"
          role="combobox"
          aria-label="Agregar categoría"
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          placeholder={isOpen ? "Buscar categoría..." : "Agregar otra categoría"}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (filteredOptions[0]) {
                onChange([...selected, filteredOptions[0]]);
                setQuery("");
                setIsOpen(false);
              }
            } else if (event.key === "Escape") {
              setIsOpen(false);
              setQuery("");
            }
          }}
          onBlur={() => {
            setIsOpen(false);
            setQuery("");
          }}
        />
        <ChevronDown size={16} aria-hidden="true" />
      </div>
      {isOpen && (
        <div id={listboxId} className={styles.optionsList} role="listbox" aria-label="Categorías disponibles">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={false}
                key={option}
                className={styles.option}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange([...selected, option]);
                  setQuery("");
                  setIsOpen(false);
                }}
              >
                <span>{option}</span>
                <Plus size={16} aria-hidden="true" />
              </button>
            ))
          ) : (
            <p className={styles.noOptions}>
              {query.trim() ? "No se encontraron categorías." : "Ya seleccionaste todas las categorías."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SearchableDropdown({
  options,
  value,
  placeholder,
  onChange,
}: SearchableDropdownProps) {
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeSearch(query.trim());
    return options.filter((option) => normalizeSearch(option).includes(normalizedQuery));
  }, [options, query]);

  const selectOption = (option: string) => {
    onChange(option);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div className={styles.searchableDropdown}>
      <div className={styles.searchInputWrap}>
        <Search size={16} aria-hidden="true" />
        <input
          type="text"
          role="combobox"
          aria-label={placeholder}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-activedescendant={
            isOpen && filteredOptions[activeIndex]
              ? `${listboxId}-option-${activeIndex}`
              : undefined
          }
          placeholder={isOpen ? "Buscar..." : value || placeholder}
          value={isOpen ? query : value}
          onFocus={() => {
            setQuery("");
            setActiveIndex(0);
            setIsOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((index) => Math.min(index + 1, filteredOptions.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" && isOpen && filteredOptions[activeIndex]) {
              event.preventDefault();
              selectOption(filteredOptions[activeIndex]);
            } else if (event.key === "Escape") {
              setIsOpen(false);
              setQuery("");
            }
          }}
          onBlur={() => {
            setIsOpen(false);
            setQuery("");
          }}
          required={!value}
        />
        <ChevronDown size={16} aria-hidden="true" />
      </div>
      {isOpen && (
        <div id={listboxId} className={styles.optionsList} role="listbox" aria-label={placeholder}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <button
                type="button"
                role="option"
                aria-selected={value === option}
                id={`${listboxId}-option-${index}`}
                key={option}
                className={`${styles.option} ${activeIndex === index ? styles.activeOption : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option)}
              >
                <span>{option}</span>
                {value === option && <Check size={16} aria-hidden="true" />}
              </button>
            ))
          ) : (
            <p className={styles.noOptions}>No se encontraron opciones.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AddInventoryModal({
  isOpen,
  onClose,
  onSubmit,
  editingItem,
  categoryOptions,
  seriesOptions,
}: AddInventoryModalProps) {
  const [formData, setFormData] = useState(() => editingItem
    ? {
        ...emptyForm,
        code: editingItem.code ?? "",
        name: editingItem.name,
        shortDescription: editingItem.shortDescription === "Artículo disponible"
          ? ""
          : editingItem.shortDescription.split(" • ")[0] ?? "",
        categories: editingItem.categories?.length
          ? [...editingItem.categories]
          : [editingItem.category],
        series: editingItem.series ?? "",
        stock: editingItem.stock,
        price: editingItem.price,
        cost: editingItem.cost ?? 0,
        image: editingItem.image,
      }
    : emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [addingSeries, setAddingSeries] = useState(false);

  const addCategory = () => {
    const category = formData.categoryDraft.trim();
    if (!category) return;
    setFormData((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories
        : [...current.categories, category],
      categoryDraft: "",
    }));
    setAddingCategory(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = formData.code.trim();
    const name = formData.name.trim();
    const categories = [...new Set(formData.categories.map((category) => category.trim()).filter(Boolean))];
    const category = categories[0] ?? "";
    const series = formData.series.trim();
    const stock = formData.stock === "" ? 0 : formData.stock;
    const price = formData.price === "" ? 0 : formData.price;
    const cost = formData.cost === "" ? 0 : formData.cost;

    if (!code || !name || !series || !category) {
      setError("El código, nombre, serie y categoría son obligatorios.");
      return;
    }
    if (
      !Number.isSafeInteger(stock) || stock < 0 ||
      !Number.isFinite(price) || price < 0 ||
      !Number.isFinite(cost) || cost < 0
    ) {
      setError("Ingresa un stock entero y valores de precio y costo válidos, sin negativos.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onSubmit({
        code,
        name,
        shortDescription: formData.shortDescription.trim(),
        category,
        categories,
        series,
        tags: [],
        image: formData.image,
        stock,
        price,
        cost,
        description: "",
      }, editingItem?.id);
      setFormData(emptyForm);
      setAddingCategory(false);
      setAddingSeries(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el producto.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2>{editingItem ? "Editar Artículo" : "Agregar Nuevo Producto"}</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            placeholder="Código / SKU"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Nombre"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <div className={styles.fieldGroup}>
            <div className={styles.dropdownRow}>
              {addingSeries ? (
                <input
                  autoFocus
                  type="text"
                  placeholder="Nueva serie"
                  value={formData.series}
                  onChange={(e) => setFormData({ ...formData, series: e.target.value })}
                  required
                />
              ) : (
                <SearchableDropdown
                  options={seriesOptions}
                  value={formData.series}
                  placeholder="Buscar o seleccionar serie"
                  onChange={(series) => setFormData({ ...formData, series })}
                />
              )}
              <button
                type="button"
                className={styles.addOptionButton}
                aria-label={addingSeries ? "Cancelar nueva serie" : "Agregar nueva serie"}
                title={addingSeries ? "Cancelar" : "Agregar nueva serie"}
                onClick={() => {
                  setFormData({ ...formData, series: "" });
                  setAddingSeries(!addingSeries);
                }}
              >
                {addingSeries ? <X size={18} /> : <Plus size={18} />}
              </button>
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <div className={styles.dropdownRow}>
              {addingCategory ? (
                <input
                  autoFocus
                  type="text"
                  placeholder="Nueva categoría"
                  value={formData.categoryDraft}
                  onChange={(e) => setFormData({ ...formData, categoryDraft: e.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCategory();
                    }
                  }}
                />
              ) : (
                <CategorySelector
                  options={categoryOptions}
                  selected={formData.categories}
                  onChange={(categories) => setFormData({ ...formData, categories })}
                />
              )}
              <button
                type="button"
                className={styles.addOptionButton}
                aria-label={addingCategory ? "Cancelar nueva categoría" : "Agregar nueva categoría"}
                title={addingCategory ? "Agregar categoría nueva" : "Agregar nueva categoría"}
                onClick={() => {
                  if (addingCategory) {
                    if (formData.categoryDraft.trim()) {
                      addCategory();
                    } else {
                      setAddingCategory(false);
                    }
                    return;
                  }
                  setFormData({ ...formData, categoryDraft: "" });
                  setAddingCategory(true);
                }}
              >
                {addingCategory
                  ? formData.categoryDraft.trim()
                    ? <Check size={18} />
                    : <X size={18} />
                  : <Plus size={18} />}
              </button>
            </div>
            {formData.categories.length > 0 ? (
              <ul className={styles.selectedCategories} aria-label="Categorías seleccionadas">
                {formData.categories.map((category, index) => (
                  <li key={category} className={index === 0 ? styles.primaryCategory : ""}>
                    <span>
                      {category}
                      {index === 0 ? " · Principal (define la imagen)" : ""}
                    </span>
                    <div className={styles.categoryActions}>
                      {index > 0 ? (
                        <button
                          type="button"
                          onClick={() => setFormData((current) => ({
                            ...current,
                            categories: [category, ...current.categories.filter((entry) => entry !== category)],
                          }))}
                        >
                          Hacer principal
                        </button>
                      ) : null}
                      <button
                        type="button"
                        aria-label={`Quitar categoría ${category}`}
                        onClick={() => setFormData((current) => ({
                          ...current,
                          categories: current.categories.filter((entry) => entry !== category),
                        }))}
                      >
                        <X size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.categoryHint}>Selecciona al menos una categoría. La primera será la principal.</p>
            )}
          </div>
          <input
            type="number"
            placeholder="Stock (unidades)"
            min="0"
            step="1"
            value={formData.stock}
            onChange={(e) => setFormData({
              ...formData,
              stock: e.target.value === "" ? "" : Number.parseInt(e.target.value, 10),
            })}
          />
          <input
            type="number"
            placeholder="Precio de venta"
            min="0"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({
              ...formData,
              price: e.target.value === "" ? "" : Number.parseFloat(e.target.value),
            })}
          />
          <input
            type="number"
            placeholder="Costo de compra"
            min="0"
            step="0.01"
            value={formData.cost}
            onChange={(e) => setFormData({
              ...formData,
              cost: e.target.value === "" ? "" : Number.parseFloat(e.target.value),
            })}
          />
          {error && <p className={styles.error} role="alert">{error}</p>}

          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.buttonSecondary} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className={styles.buttonPrimary} disabled={loading}>
              {loading ? "Guardando..." : editingItem ? "Guardar cambios" : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
