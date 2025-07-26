-- Get all tournaments with their IDs
SELECT 
    id,
    name,
    status,
    created_at
FROM tournaments 
ORDER BY created_at DESC; 