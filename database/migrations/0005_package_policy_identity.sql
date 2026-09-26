-- Package policies that name the caller.
--
-- 0004's policies found the caller's role by joining project_memberships without a user_id
-- predicate, and were correct only because the memberships SELECT policy shows each account its
-- own rows. Any later policy that lets members see each other's memberships (a team page needs
-- one) would turn "a manager exists on this project" into "you are a manager". Each membership
-- test now filters on fieldmaps.request_user_id() itself.
--
-- A package's checks are also written only while it is being prepared: by the preparing
-- manager, while still a manager, in the transaction that inserted the package. Prepared
-- packages are immutable; without this a former manager could append checks to an old package.

DROP POLICY assigned_packages ON fieldmaps.site_packages;
CREATE POLICY assigned_packages ON fieldmaps.site_packages FOR SELECT TO fieldmaps_api
  USING (EXISTS (SELECT FROM fieldmaps.project_memberships m
    WHERE m.project_id = site_packages.project_id
      AND m.user_id = fieldmaps.request_user_id()));

DROP POLICY assigned_package_checks ON fieldmaps.package_checks;
CREATE POLICY assigned_package_checks ON fieldmaps.package_checks FOR SELECT TO fieldmaps_api
  USING (EXISTS (SELECT FROM fieldmaps.site_packages p
    JOIN fieldmaps.project_memberships m ON m.project_id = p.project_id
    WHERE p.id = package_checks.package_id
      AND m.user_id = fieldmaps.request_user_id()));

DROP POLICY manager_prepares_package ON fieldmaps.site_packages;
CREATE POLICY manager_prepares_package ON fieldmaps.site_packages FOR INSERT TO fieldmaps_api
  WITH CHECK (prepared_by = fieldmaps.request_user_id()
    AND EXISTS (SELECT FROM fieldmaps.project_memberships m
      WHERE m.project_id = site_packages.project_id
        AND m.user_id = fieldmaps.request_user_id() AND m.role = 'manager'));

DROP POLICY manager_prepares_package_checks ON fieldmaps.package_checks;
CREATE POLICY manager_prepares_package_checks ON fieldmaps.package_checks FOR INSERT TO fieldmaps_api
  WITH CHECK (EXISTS (SELECT FROM fieldmaps.site_packages p
    JOIN fieldmaps.project_memberships m ON m.project_id = p.project_id
    WHERE p.id = package_checks.package_id
      AND p.prepared_by = fieldmaps.request_user_id()
      AND p.prepared_at >= transaction_timestamp()
      AND m.user_id = fieldmaps.request_user_id() AND m.role = 'manager'));
