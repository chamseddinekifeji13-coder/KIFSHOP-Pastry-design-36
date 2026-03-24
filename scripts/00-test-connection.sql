-- Test de connexion à la base de données
-- Ce script teste la connexion et affiche les tables existantes

SELECT 'Connexion à Supabase établie' as status;

-- Vérifier les tables existantes
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
