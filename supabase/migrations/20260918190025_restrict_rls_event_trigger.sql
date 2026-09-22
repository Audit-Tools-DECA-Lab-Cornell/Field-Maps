-- Dashboard-created event trigger; browser API roles never need to invoke it.
-- Event-trigger execution itself does not require these client EXECUTE grants.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated, service_role;
