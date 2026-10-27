"use client";

import { useState } from "react";
import type { AddInventoryModalProps } from "./AddInventoryModal.logic";
import styles from "./AddInventoryModal.module.scss";

export default function AddInventoryModal({ isOpen, onClose, onSubmit }: AddInventoryModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    shortDescription: "",
    category: "",
    series: "",
    stock: 0,
    price: 0,
    cost: 0,
    compareAtPrice: 0,
    image: "",
    tags: "" as any,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      setFormData({
        name: "",
        description: "",
        shortDescription: "",
        category: "",
        series: "",
        stock: 0,
        price: 0,
        cost: 0,
        compareAtPrice: 0,
        image: "",
        tags: "",
      });
      onClose();
    } catch (err) {
      console.error("Error adding item:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2>Agregar Nuevo Producto</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            placeholder="Nombre"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Serie (Anime/Manga)"
            value={formData.series}
            onChange={(e) => setFormData({ ...formData, series: e.target.value })}
          />
          <input
            type="text"
            placeholder="Descripción corta"
            value={formData.shortDescription}
            onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Descripción completa"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Categoría"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Stock"
            value={formData.stock}
            onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
          />
          <input
            type="number"
            placeholder="Precio"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
            required
          />
          <input
            type="number"
            placeholder="Costo"
            step="0.01"
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
          />
          <input
            type="text"
            placeholder="URL de imagen"
            value={formData.image}
            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
          />

          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.buttonSecondary} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className={styles.buttonPrimary} disabled={loading}>
              {loading ? "Agregando..." : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
