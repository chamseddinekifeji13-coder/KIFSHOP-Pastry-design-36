-- =============================================
-- STOCK RESTORATION SCRIPT 056
-- Restore Stock Movements History
-- =============================================

WITH tenant AS (
  SELECT DISTINCT tenant_id FROM public.tenant_users LIMIT 1
),
materials AS (
  SELECT id, name, current_stock FROM public.raw_materials 
  WHERE tenant_id IN (SELECT tenant_id FROM tenant)
)
INSERT INTO public.stock_movements (
  tenant_id, item_type, raw_material_id, quantity, movement_type, 
  reason, reference_number, notes, created_by, created_at, updated_at
)
SELECT 
  t.tenant_id,
  'raw_material'::text,
  m.id,
  quantity,
  movement_type,
  reason,
  reference_number,
  notes,
  NULL::uuid,
  created_at,
  created_at
FROM (
  VALUES
    -- AMANDES - Historique d'approvisionnement et utilisation
    ('IN', 'Achat fournisseur', 'BON-2024-001', 'Amandes mondées 100kg arrivées', '2024-01-15'::timestamp),
    ('OUT', 'Production Bsissas', 'PROD-2024-001', 'Utilisation production', '2024-01-20'::timestamp),
    ('IN', 'Achat fournisseur', 'BON-2024-002', 'Amandes décortiquées 50kg', '2024-02-01'::timestamp),
    ('OUT', 'Production Baklai', 'PROD-2024-002', 'Utilisation baklai', '2024-02-05'::timestamp),
    ('IN', 'Achat fournisseur', 'BON-2024-003', 'Approvisionnement mensuel', '2024-02-25'::timestamp),
    ('OUT', 'Production Bsissas', 'PROD-2024-003', 'Production février', '2024-02-28'::timestamp),
    ('ADJ', 'Correction inventaire', 'INV-2024-001', 'Ajustement suite inventaire', '2024-03-01'::timestamp),
    
    -- MIEL - Historique d'approvisionnement
    ('IN', 'Achat fournisseur', 'BON-2024-004', 'Miel clair 80kg', '2024-01-10'::timestamp),
    ('OUT', 'Production Bsissas', 'PROD-2024-004', 'Utilisation miel clair', '2024-01-25'::timestamp),
    ('IN', 'Achat fournisseur', 'BON-2024-005', 'Miel foncé 40kg', '2024-02-15'::timestamp),
    ('OUT', 'Production Miel', 'PROD-2024-005', 'Empotage miel', '2024-03-01'::timestamp),
    
    -- SUCRE - Historique approvisionnement
    ('IN', 'Achat fournisseur', 'BON-2024-006', 'Sucre cristallisé 200kg', '2024-01-05'::timestamp),
    ('OUT', 'Production Nougat', 'PROD-2024-006', 'Production nougat', '2024-01-28'::timestamp),
    ('OUT', 'Production Bsissas', 'PROD-2024-007', 'Production bsissas', '2024-02-10'::timestamp),
    ('IN', 'Achat fournisseur', 'BON-2024-007', 'Sucre glace 100kg', '2024-02-20'::timestamp),
    ('OUT', 'Production Glaçage', 'PROD-2024-008', 'Glaçage produits', '2024-03-02'::timestamp),
    
    -- FARINE - Historique approvisionnement
    ('IN', 'Achat fournisseur', 'BON-2024-008', 'Farine T65 150kg', '2024-01-08'::timestamp),
    ('OUT', 'Production', 'PROD-2024-009', 'Utilisation mensuelle', '2024-02-01'::timestamp),
    ('IN', 'Achat fournisseur', 'BON-2024-009', 'Farine complète 75kg', '2024-02-10'::timestamp),
    ('OUT', 'Production', 'PROD-2024-010', 'Utilisation production', '2024-02-20'::timestamp),
    
    -- OEUFS - Stock frais
    ('IN', 'Achat fournisseur', 'BON-2024-010', 'Oeufs 10 boîtes', '2024-03-01'::timestamp),
    ('OUT', 'Production', 'PROD-2024-011', 'Utilisation pâtisserie', '2024-03-02'::timestamp),
    
    -- BEURRE - Stock régulier
    ('IN', 'Achat fournisseur', 'BON-2024-011', 'Beurre 40kg', '2024-02-15'::timestamp),
    ('OUT', 'Production', 'PROD-2024-012', 'Utilisation production', '2024-02-28'::timestamp),
    ('IN', 'Achat fournisseur', 'BON-2024-012', 'Beurre 20kg', '2024-03-01'::timestamp),
    
    -- CHOCOLAT - Stock consommable
    ('IN', 'Achat fournisseur', 'BON-2024-013', 'Chocolat noir 30kg', '2024-01-20'::timestamp),
    ('OUT', 'Production', 'PROD-2024-013', 'Production chocolat', '2024-02-05'::timestamp),
    ('IN', 'Achat fournisseur', 'BON-2024-014', 'Chocolat au lait 20kg', '2024-02-20'::timestamp),
    
    -- FRUITS SECS - Approvisionnement
    ('IN', 'Achat fournisseur', 'BON-2024-015', 'Fruits secs assortis', '2024-01-25'::timestamp),
    ('OUT', 'Production', 'PROD-2024-014', 'Utilisation mélanges', '2024-02-15'::timestamp),
    
    -- ÉPICES - Stock spécialisé
    ('IN', 'Achat fournisseur', 'BON-2024-016', 'Épices aromates', '2024-02-01'::timestamp),
    ('OUT', 'Production', 'PROD-2024-015', 'Utilisation recettes', '2024-02-20'::timestamp),
    
    -- LEVURE - Stock sensible à la date
    ('IN', 'Achat fournisseur', 'BON-2024-017', 'Levure chimique', '2024-02-25'::timestamp),
    ('OUT', 'Production', 'PROD-2024-016', 'Utilisation pâtes', '2024-03-01'::timestamp)
) AS data(movement_type, reason, reference_number, notes, created_at)
CROSS JOIN tenant t
CROSS JOIN materials m
WHERE m.name = CASE
    WHEN data.reason LIKE '%Amandes%' THEN 'Amandes Monde'
    WHEN data.reason LIKE '%Amandes%' THEN 'Amandes Décortiquées'
    WHEN data.reason LIKE '%miel%' THEN 'Miel Clair'
    WHEN data.reason LIKE '%Miel%' THEN 'Miel Foncé'
    WHEN data.reason LIKE '%Sucre%' THEN 'Sucre Cristallisé'
    WHEN data.reason LIKE '%Glaçage%' THEN 'Sucre Glace'
    WHEN data.reason LIKE '%Farine%' THEN 'Farine Classique'
    WHEN data.reason LIKE '%Oeufs%' THEN 'Oeufs Frais'
    WHEN data.reason LIKE '%Beurre%' THEN 'Beurre Doux'
    WHEN data.reason LIKE '%Chocolat%' THEN 'Chocolat Noir 70%'
    WHEN data.reason LIKE '%Chocolat au lait%' THEN 'Chocolat au Lait'
    WHEN data.reason LIKE '%Fruits secs%' THEN 'Fruits Secs Assortis'
    WHEN data.reason LIKE '%Épices%' THEN 'Anis Vert'
    WHEN data.reason LIKE '%Levure%' THEN 'Levure Chimique'
    ELSE m.name
  END
ON CONFLICT DO NOTHING;

-- Verification
SELECT 
  COUNT(*) as total_movements,
  COUNT(DISTINCT movement_type) as movement_types,
  MIN(created_at) as oldest_movement,
  MAX(created_at) as latest_movement
FROM public.stock_movements
WHERE tenant_id IN (SELECT tenant_id FROM tenant);
