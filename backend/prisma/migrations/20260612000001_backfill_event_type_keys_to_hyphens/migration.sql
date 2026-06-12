-- Normalize existing EventType keys from snake_case to kebab-case.
-- All FK relationships use the UUID id column, so changing key is purely cosmetic.
UPDATE "EventType"
SET key = regexp_replace(
            regexp_replace(key, '[^a-z0-9]+', '-', 'g'),
            '^-+|-+$', '', 'g'
          )
WHERE key ~ '[^a-z0-9-]';
