-- Make barcode column optional (nullable) for raw_materials, finished_products, and suppliers
-- This allows products without barcodes to be created

ALTER TABLE raw_materials 
ALTER COLUMN barcode DROP NOT NULL;

ALTER TABLE finished_products 
ALTER COLUMN barcode DROP NOT NULL;

ALTER TABLE suppliers 
ALTER COLUMN barcode DROP NOT NULL;
