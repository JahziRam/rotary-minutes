DO $do$
BEGIN
  CREATE ROLE rotary WITH LOGIN PASSWORD 'rotary';
EXCEPTION WHEN duplicate_object THEN
  ALTER ROLE rotary WITH LOGIN PASSWORD 'rotary';
END
$do$;

SELECT 'CREATE DATABASE rotary_minutes OWNER rotary'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'rotary_minutes')\gexec

GRANT ALL PRIVILEGES ON DATABASE rotary_minutes TO rotary;