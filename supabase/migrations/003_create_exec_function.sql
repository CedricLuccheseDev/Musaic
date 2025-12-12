-- RPC function to execute dynamic SQL queries
-- Used by the AI search feature to run generated queries

CREATE OR REPLACE FUNCTION exec(query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (' || query || ') t'
  INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION exec(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION exec(TEXT) TO authenticated;

-- Note: This function has SECURITY DEFINER which means it runs with
-- the privileges of the function owner (postgres). Be careful with
-- the queries you pass to it. The AI should only generate SELECT queries.
