-- =============================================
-- Migration: Ajouter la colonne 'barcode' manquante
-- Problème: La colonne barcode est référencée dans le code mais n'existe pas
-- Solution: Ajouter la colonne barcode nullable à raw_materials, finished_products, suppliers
-- =============================================

-- Ajouter la colonne barcode à raw_materials si elle n'existe pas
ALTER TABLE public.raw_materials 
ADD COLUMN IF NOT EXISTS barcode text DEFAULT NULL;

-- Ajouter la colonne barcode à finished_products si elle n'existe pas
ALTER TABLE public.finished_products 
ADD COLUMN IF NOT EXISTS barcode text DEFAULT NULL;

-- Ajouter la colonne barcode à suppliers si elle n'existe pas
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS barcode text DEFAULT NULL;

-- Créer un index sur barcode pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_raw_materials_barcode ON public.raw_materials(barcode) 
  WHERE barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finished_products_barcode ON public.finished_products(barcode) 
  WHERE barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_suppliers_barcode ON public.suppliers(barcode) 
  WHERE barcode IS NOT NULL;
