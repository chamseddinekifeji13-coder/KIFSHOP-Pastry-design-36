-- =============================================
-- Migration: Ajouter les colonnes 'barcode' manquantes
-- =============================================
-- Cette migration ajoute la colonne barcode nullable aux tables principales

-- Vérifier si la colonne existe avant de l'ajouter pour les tables nécessaires

-- 1. raw_materials - Add barcode column as nullable text
ALTER TABLE IF EXISTS public.raw_materials 
ADD COLUMN IF NOT EXISTS barcode TEXT DEFAULT NULL;

-- 2. finished_products - Add barcode column as nullable text  
ALTER TABLE IF EXISTS public.finished_products
ADD COLUMN IF NOT EXISTS barcode TEXT DEFAULT NULL;

-- 3. suppliers - Add barcode column as nullable text
ALTER TABLE IF EXISTS public.suppliers
ADD COLUMN IF NOT EXISTS barcode TEXT DEFAULT NULL;

-- Créer des index pour les recherches rapides par barcode
CREATE INDEX IF NOT EXISTS idx_raw_materials_barcode 
  ON public.raw_materials(barcode) 
  WHERE barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finished_products_barcode 
  ON public.finished_products(barcode) 
  WHERE barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_suppliers_barcode 
  ON public.suppliers(barcode) 
  WHERE barcode IS NOT NULL;
