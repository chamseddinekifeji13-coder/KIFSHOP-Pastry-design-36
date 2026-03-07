-- Delete clients where phone is NULL or empty string
-- This will remove all clients without phone numbers from the database
DELETE FROM clients
WHERE (phone IS NULL OR phone = '' OR TRIM(phone) = '');
