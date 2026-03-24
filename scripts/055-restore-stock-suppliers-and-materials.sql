-- =============================================
-- STOCK RESTORATION SCRIPT 055
-- Restore Suppliers and Raw Materials for KIFSHOP Pastry
-- =============================================

-- Get the current tenant_id
WITH tenant AS (
  SELECT DISTINCT tenant_id FROM public.tenant_users LIMIT 1
)

-- 1. INSERT SUPPLIERS
INSERT INTO public.suppliers (tenant_id, name, contact_person, email, phone, address, city, postal_code, country, payment_terms, is_active, created_at, updated_at)
SELECT 
  t.tenant_id,
  name,
  contact_person,
  email,
  phone,
  address,
  city,
  postal_code,
  country,
  payment_terms,
  true as is_active,
  NOW(),
  NOW()
FROM (
  VALUES
    -- Fournisseurs de matières premières principales
    ('Groupe Amandes Algérie', 'Mohamed Karim', 'contact@amandes-alg.dz', '+213 21 123 4567', 'Lot 15, Zone Industrielle Blida', 'Blida', '09000', 'Algeria'),
    ('Miel Pur du Djurdjura', 'Fatima Bennabi', 'info@mieldjurdjura.dz', '+213 26 456 7890', 'Route Nationale 1, Vallée du Djurdjura', 'Tizi Ouzou', '15000', 'Algeria'),
    ('Sucre Raffiné Béni Abbès', 'Ahmed Chebel', 'ventes@sucre-ba.dz', '+213 49 234 5678', 'Rue de l''Industrie, Zone ASFAR', 'Béni Abbès', '03200', 'Algeria'),
    ('Farine Premium du Mitidja', 'Khaled Saïdi', 'commandes@farine-mitidja.dz', '+213 25 345 6789', 'RN5 Koléa, Région Blida', 'Koléa', '42700', 'Algeria'),
    ('Oeufs Bio Kabylie', 'Zahra Lounas', 'admin@oeufs-kabylie.dz', '+213 26 678 9012', 'Ferme Tamazouza, Vallée de l''Oued', 'Béjaïa', '06000', 'Algeria'),
    ('Beurre et Produits Laitiers', 'Hassan Boudiba', 'laiterie@boudiba.dz', '+213 23 567 8901', 'Zone Laitière, Km 20 Chéraga', 'Tipaza', '42400', 'Algeria'),
    ('Chocolat Professionnel Cacao', 'Sophie Durand', 'export@cacao-pro.fr', '+33 4 92 123 456', 'Chemin des Hauts Plateaux, Provence', 'Grasse', '06130', 'France'),
    ('Fruits Secs Spécialiste', 'Ibrahim Ziane', 'fruits@ziane.dz', '+213 27 789 0123', 'Souk Eldjemaa, Marché Fruits Secs', 'Sétif', '19000', 'Algeria'),
    ('Épices et Aromates Méditerranée', 'Nadia Messaoudi', 'epices@mediter.dz', '+213 21 456 7890', 'Rue Didouche Mourad, Kasbah', 'Alger', '16000', 'Algeria'),
    ('Emballage Alimentaire Maghreb', 'Rachid Hamidi', 'emballage@maghreb.dz', '+213 25 678 9012', 'Rue du Commerce, Zone d''Activités', 'Blida', '09000', 'Algeria')
) AS data(name, contact_person, email, phone, address, city, postal_code, country)
CROSS JOIN tenant t
ON CONFLICT DO NOTHING;

-- 2. INSERT RAW MATERIALS
INSERT INTO public.raw_materials (
  tenant_id, supplier_id, name, description, unit, 
  current_stock, min_stock, reorder_quantity, unit_cost, 
  expiry_date, storage_location_id, is_active, created_at, updated_at
)
WITH tenant AS (
  SELECT DISTINCT tenant_id FROM public.tenant_users LIMIT 1
),
suppliers_list AS (
  SELECT id, tenant_id, name FROM public.suppliers WHERE tenant_id IN (SELECT tenant_id FROM tenant)
)
SELECT 
  t.tenant_id,
  CASE 
    WHEN data.supplier_name LIKE 'Amandes%' THEN (SELECT id FROM suppliers_list WHERE name LIKE 'Amandes%' LIMIT 1)
    WHEN data.supplier_name LIKE 'Miel%' THEN (SELECT id FROM suppliers_list WHERE name LIKE 'Miel%' LIMIT 1)
    WHEN data.supplier_name LIKE 'Sucre%' THEN (SELECT id FROM suppliers_list WHERE name LIKE 'Sucre%' LIMIT 1)
    WHEN data.supplier_name LIKE 'Farine%' THEN (SELECT id FROM suppliers_list WHERE name LIKE 'Farine%' LIMIT 1)
    WHEN data.supplier_name LIKE 'Oeufs%' THEN (SELECT id FROM suppliers_list WHERE name LIKE 'Oeufs%' LIMIT 1)
    WHEN data.supplier_name LIKE 'Beurre%' THEN (SELECT id FROM suppliers_list WHERE name LIKE 'Beurre%' LIMIT 1)
    WHEN data.supplier_name LIKE 'Chocolat%' THEN (SELECT id FROM suppliers_list WHERE name LIKE 'Chocolat%' LIMIT 1)
    WHEN data.supplier_name LIKE 'Fruits%' THEN (SELECT id FROM suppliers_list WHERE name LIKE 'Fruits%' LIMIT 1)
    WHEN data.supplier_name LIKE 'Épices%' THEN (SELECT id FROM suppliers_list WHERE name LIKE 'Épices%' LIMIT 1)
    ELSE (SELECT id FROM suppliers_list LIMIT 1)
  END,
  data.name,
  data.description,
  data.unit,
  data.current_stock,
  data.min_stock,
  data.reorder_quantity,
  data.unit_cost,
  data.expiry_date,
  NULL::uuid,
  true,
  NOW(),
  NOW()
FROM (
  VALUES
    ('Amandes Monde', 'Amandes mondées premium', 'kg', 150, 50, 100, 550, NULL),
    ('Amandes Décortiquées', 'Amandes décortiquées tranchées', 'kg', 80, 30, 50, 650, NULL),
    ('Miel Clair', 'Miel Miel pur du Djurdjura clair', 'kg', 120, 40, 80, 1500, NULL),
    ('Miel Foncé', 'Miel pur du Djurdjura foncé', 'kg', 60, 20, 40, 1200, NULL),
    ('Sucre Cristallisé', 'Sucre blanc raffiné 2mm', 'kg', 500, 200, 300, 120, NULL),
    ('Sucre Glace', 'Sucre glace pour glaçage', 'kg', 200, 50, 100, 180, NULL),
    ('Farine Classique', 'Farine blé T65', 'kg', 300, 100, 200, 100, NULL),
    ('Farine Complète', 'Farine complète', 'kg', 150, 50, 100, 110, NULL),
    ('Oeufs Frais', 'Oeufs bio catégorie A, boîte 30', 'boîte', 20, 5, 15, 350, NULL),
    ('Beurre Doux', 'Beurre doux français 250g', 'kg', 80, 20, 50, 2800, NULL),
    ('Huile Argan', 'Huile d''argan pure', 'litre', 30, 10, 20, 4000, NULL),
    ('Chocolat Noir 70%', 'Chocolat noir intense 1kg', 'kg', 50, 15, 30, 3500, NULL),
    ('Chocolat au Lait', 'Chocolat au lait 1kg', 'kg', 40, 10, 25, 2800, NULL),
    ('Cacao Poudre', 'Cacao non sucré, poudre fine', 'kg', 30, 10, 20, 2500, NULL),
    ('Cacahuètes Grillées', 'Cacahuètes grillées décortiquées', 'kg', 100, 30, 60, 450, NULL),
    ('Pistaches Grillées', 'Pistaches grillées et salées', 'kg', 60, 20, 40, 1800, NULL),
    ('Noisettes Grillées', 'Noisettes grillées concassées', 'kg', 40, 15, 25, 1200, NULL),
    ('Anis Vert', 'Graines anis vert entières', 'kg', 15, 5, 10, 850, NULL),
    ('Cannelle Poudre', 'Cannelle poudre fine', 'kg', 8, 2, 5, 1500, NULL),
    ('Vanille Poudre', 'Vanille Madagascar poudre', 'kg', 5, 1, 3, 8000, NULL),
    ('Levure Chimique', 'Levure chimique 500g', 'kg', 20, 5, 10, 200, NULL),
    ('Levure Boulangère', 'Levure pressée fraîche', 'kg', 30, 10, 20, 150, NULL),
    ('Sel Fin', 'Sel fin alimentaire', 'kg', 50, 10, 30, 50, NULL),
    ('Crème Fraîche', 'Crème fraîche 500ml', 'litre', 40, 10, 25, 800, NULL),
    ('Lait Entier', 'Lait entier frais', 'litre', 100, 20, 60, 250, NULL)
) AS data(supplier_name, name, description, unit, current_stock, min_stock, reorder_quantity, unit_cost, expiry_date)
CROSS JOIN tenant t
ON CONFLICT DO NOTHING;

-- 3. INSERT PACKAGING MATERIALS
INSERT INTO public.packaging (
  tenant_id, name, description, unit, 
  current_stock, min_stock, unit_cost, supplier_id, is_active, created_at, updated_at
)
WITH tenant AS (
  SELECT DISTINCT tenant_id FROM public.tenant_users LIMIT 1
),
emballage_supplier AS (
  SELECT id FROM public.suppliers 
  WHERE tenant_id IN (SELECT tenant_id FROM tenant) 
  AND name LIKE 'Emballage%' 
  LIMIT 1
)
SELECT 
  t.tenant_id,
  name,
  description,
  unit,
  current_stock,
  min_stock,
  unit_cost,
  (SELECT id FROM emballage_supplier),
  true,
  NOW(),
  NOW()
FROM (
  VALUES
    ('Boîte Carton 20x20', 'Boîte carton blanc 20x20cm', 'pièce', 500, 100, 25),
    ('Boîte Carton 30x30', 'Boîte carton blanc 30x30cm', 'pièce', 300, 50, 40),
    ('Sachet Kraft 1kg', 'Sachet kraft blanc 1kg', 'pièce', 1000, 200, 5),
    ('Sachet Kraft 500g', 'Sachet kraft blanc 500g', 'pièce', 1500, 300, 3),
    ('Papier Sulfurisé', 'Papier sulfurisé rouleau 30cm', 'mètre', 200, 50, 0.50),
    ('Film Alimentaire', 'Film transparent alimentaire 30cm', 'mètre', 300, 100, 0.75),
    ('Étiquette Adhésive', 'Étiquette adhésive blanche 10x5cm', 'pièce', 5000, 1000, 0.10),
    ('Ruban Blanc 5cm', 'Ruban blanc satin 5cm', 'mètre', 200, 50, 0.80),
    ('Ficelle Naturelle', 'Ficelle naturelle biodégradable', 'mètre', 500, 100, 0.20),
    ('Plateau Carton', 'Plateau carton dentelé blanc', 'pièce', 600, 150, 15)
) AS data(name, description, unit, current_stock, min_stock, unit_cost)
CROSS JOIN tenant t
ON CONFLICT DO NOTHING;

-- Verification
SELECT 
  (SELECT COUNT(*) FROM public.suppliers WHERE is_active = true) as active_suppliers,
  (SELECT COUNT(*) FROM public.raw_materials WHERE is_active = true) as raw_materials,
  (SELECT COUNT(*) FROM public.packaging WHERE is_active = true) as packaging_items;
