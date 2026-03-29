-- =============================================
-- RESTORATION SCRIPT 053
-- Restaurer les produits finis manquants
-- =============================================

-- Obtenir d'abord le tenant_id actuel (le premier tenant actif)
INSERT INTO public.finished_products (
  tenant_id, name, description, category_id, unit, 
  current_stock, min_stock, selling_price, cost_price, 
  packaging_cost, ingredient_cost, weight, is_published, created_at, updated_at
)
SELECT 
  t.tenant_id,
  name,
  description,
  NULL::uuid as category_id,
  'piece'::text as unit,
  current_stock,
  min_stock,
  selling_price,
  cost_price,
  packaging_cost,
  ingredient_cost,
  weight,
  true as is_published,
  NOW(),
  NOW()
FROM (
  VALUES
    -- BSISSAS - Produits de base
    ('BSISSAS AMANDE MIEL 1KG', 'Produit alimentaire - Bsissas aux amandes et miel', 0, 5, 40000, 25000, 5000, 8000, '1kg'),
    ('BSISSAS AMANDE 500G', 'Produit alimentaire - Bsissas aux amandes', 0, 3, 25000, 15000, 3000, 4000, '500g'),
    ('BSISSAS CACAHUETE MIEL 1KG', 'Produit alimentaire - Bsissas cacahuète miel', 0, 5, 35000, 20000, 4000, 7000, '1kg'),
    ('BSISSAS CACAHUETE 500G', 'Produit alimentaire - Bsissas cacahuète', 0, 3, 22000, 13000, 2500, 3500, '500g'),
    
    -- BAKLAI - Produits spécialisés
    ('BAKLAI BOURGE PISTACHIO', 'Pâtisserie - Baklai bourge pistachio', 0, 4, 110000, 70000, 15000, 20000, '500g'),
    ('BAKLAI FRUIT NOIX 1KG', 'Pâtisserie - Baklai fruits et noix', 0, 4, 85000, 50000, 10000, 15000, '1kg'),
    ('BAKLAI CLASSIQUE 750G', 'Pâtisserie - Baklai classique', 0, 3, 75000, 45000, 8000, 12000, '750g'),
    
    -- BISCUITS - Gamme biscuiterie
    ('BISCUIT DIARI MIEL', 'Biscuits - Diari miel', 0, 5, 15000, 8000, 2000, 3000, '200g'),
    ('BISCUIT DIARI CHOCOLAT', 'Biscuits - Diari chocolat', 0, 5, 14000, 7500, 1800, 2800, '200g'),
    
    -- CAFES - Gamme café
    ('BSISSAS CAFE 1KG', 'Café - Bsissas 1kg', 0, 3, 75000, 45000, 8000, 12000, '1kg'),
    ('BSISSAS CAFE 750G', 'Café - Bsissas 750g', 0, 4, 56000, 35000, 6000, 9000, '750g'),
    ('BSISSAS CAFE MOULLU', 'Café - Bsissas café moulu', 0, 5, 45000, 28000, 4500, 7000, '500g'),
    
    -- CHOCOLATS - Gamme chocolat
    ('BSISSAS CHOCOLAT 500G', 'Chocolat - Bsissas 500g', 0, 3, 35000, 20000, 4000, 6000, '500g'),
    ('BSISSAS CHOCOLAT NOIR', 'Chocolat - Noir intensité', 0, 4, 38000, 22000, 4500, 6500, '500g'),
    
    -- CITRON - Produits saveur citron
    ('BSISSAS CITRON MIEL', 'Citron - Bsissas citron miel', 0, 5, 38000, 22000, 4000, 6500, '500g'),
    ('BSISSAS CITRON FRAIS', 'Citron - Bsissas citron frais', 0, 4, 40000, 24000, 4500, 7000, '500g'),
    ('BSISSAS CITRON ANIS', 'Citron - Bsissas citron anis', 0, 5, 42000, 25000, 5000, 7500, '500g'),
    
    -- MIEL - Gamme miel
    ('MIEL BIO MASSIF 500G', 'Miel - Bio massif 500g', 0, 3, 50000, 30000, 5000, 8000, '500g'),
    ('MIEL BIO MASSIF 1KG', 'Miel - Bio massif 1kg', 0, 3, 95000, 55000, 9000, 15000, '1kg'),
    
    -- NOUGAT - Gamme nougat
    ('NOUGAT TRADITIONNEL 400G', 'Nougat - Traditionnel 400g', 0, 4, 60000, 35000, 6000, 10000, '400g'),
    ('NOUGAT PISTACHIO 400G', 'Nougat - Pistachio 400g', 0, 4, 65000, 38000, 6500, 11000, '400g'),
    
    -- FRUITS SECS - Gamme fruits secs
    ('FRUITS SECS ASSORTIS 500G', 'Fruits secs - Assortis 500g', 0, 5, 55000, 32000, 5000, 8500, '500g'),
    ('DATTES DENLET 1KG', 'Fruits secs - Dattes denlet 1kg', 0, 3, 45000, 26000, 4000, 7000, '1kg'),
    
    -- GRAINES - Gamme graines
    ('GRAINES TOURNESOL 500G', 'Graines - Tournesol 500g', 0, 5, 20000, 11000, 2000, 3500, '500g'),
    ('GRAINES SESAME 300G', 'Graines - Sésame 300g', 0, 6, 22000, 12000, 2000, 3800, '300g'),
    
    -- PATES - Gamme pâtes
    ('PATE PISTACHE PREMIUM 300G', 'Pâte - Pistache premium 300g', 0, 4, 80000, 48000, 8000, 12000, '300g'),
    ('PATE AMANDE COMPLETE 350G', 'Pâte - Amande complète 350g', 0, 4, 55000, 32000, 5000, 8500, '350g')
) AS data(name, description, current_stock, min_stock, selling_price, cost_price, packaging_cost, ingredient_cost, weight)
CROSS JOIN (SELECT DISTINCT tenant_id FROM tenant_users LIMIT 1) t;

-- Vérifier que les produits ont été insérés
SELECT COUNT(*) as inserted_products FROM public.finished_products;
