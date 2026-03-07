-- Delete clients where phone is NULL or empty string
DELETE FROM clients
WHERE phone IS NULL
   OR TRIM(phone) = '';
