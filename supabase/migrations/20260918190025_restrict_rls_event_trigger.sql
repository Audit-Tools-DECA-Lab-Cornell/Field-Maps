-- Dashboard-created event trigger; browser API roles never need to invoke it.
-- Event-trigger execution itself does not require these client EXECUTE grants.
-- Projects created without the dashboard's automatic-RLS option have no such function.
DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated, service_role;
  END IF;
END;
$$;
