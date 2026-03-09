-- Script to delete records with empty or null names
-- This cleans up data integrity issues

-- Delete raw materials with empty/null names
DELETE FROM raw_materials 
WHERE name IS NULL 
   OR TRIM(name) = '' 
   OR LENGTH(TRIM(name)) < 2;

-- Delete finished products with empty/null names
DELETE FROM finished_products 
WHERE name IS NULL 
   OR TRIM(name) = '' 
   OR LENGTH(TRIM(name)) < 2;

-- Delete packaging with empty/null names
DELETE FROM packaging 
WHERE name IS NULL 
   OR TRIM(name) = '' 
   OR LENGTH(TRIM(name)) < 2;
