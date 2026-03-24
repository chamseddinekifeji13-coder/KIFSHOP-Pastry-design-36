#!/bin/bash

# 🔍 Script de Vérification des Données Récupérées
# Exécute des requêtes pour vérifier l'état complet du système

echo "=========================================="
echo "KIFSHOP - Rapport de Récupération des Données"
echo "=========================================="
echo ""

# Utiliser psql pour exécuter les requêtes
PGPASSWORD=$SUPABASE_PASSWORD psql -h $SUPABASE_HOST -U postgres -d postgres << 'EOF'

echo "1. CLIENTS RÉCUPÉRÉS"
SELECT COUNT(*) as total, 
       COUNT(DISTINCT city) as cities,
       COUNT(DISTINCT gouvernorat) as governorates
FROM public.clients;

echo ""
echo "2. LIVRAISONS BEST DELIVERY"
SELECT COUNT(*) as total_shipments,
       COUNT(DISTINCT status) as status_count,
       MAX(created_at) as last_shipment
FROM public.best_delivery_shipments;

echo ""
echo "3. PRODUITS FINIS"
SELECT COUNT(*) as total_products,
       COUNT(DISTINCT category_id) as categories,
       SUM(current_stock) as total_stock
FROM public.finished_products
WHERE is_published = true;

echo ""
echo "4. ÉTAT DES AUTRES TABLES"
SELECT table_name, count
FROM (
  VALUES 
    ('stock_movements', (SELECT COUNT(*) FROM stock_movements)),
    ('suppliers', (SELECT COUNT(*) FROM suppliers)),
    ('raw_materials', (SELECT COUNT(*) FROM raw_materials)),
    ('recipes', (SELECT COUNT(*) FROM recipes)),
    ('orders', (SELECT COUNT(*) FROM orders))
) t(table_name, count)
WHERE count > 0;

EOF

echo ""
echo "=========================================="
echo "✅ Vérification Complète"
echo "=========================================="
