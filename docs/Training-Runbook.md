# Training project operations

Training is a separate platform project. The original practice project and its observations stay unchanged. Migration application to hosted environments belongs to OPS-14 and OPS-17; this guide does not authorize a deployment.

| Resource | Fixed ID |
| --- | --- |
| Organization | `10000000-0000-4000-8000-000000000101` |
| Project | `10000000-0000-4000-8000-000000000102` |
| Site (`training-garden`) | `10000000-0000-4000-8000-000000000103` |
| Form version (`training-v1`) | `10000000-0000-4000-8000-000000000104` |

## Retention and privacy

Calling `fieldmaps_private.ensure_profile` enrolls an active account as an observer. Trainees can read only their own Training observations, even if temporarily granted the project manager role. Training does not expose other trainees' profiles or memberships, and the GIS practice view does not expose Training observations.

The `fieldmaps_training_purge` pg_cron job deletes observations received more than 30 days ago in the fixed Training project only. It does not use the `is_training` flag to select projects. The retention window remains subject to the research policy decision Q2 in [the decision log](plan/decisions.md).

After an explicitly approved hosted migration, verify the scheduled job as the database owner:

```sql
SELECT jobname, schedule, active, command
FROM cron.job WHERE jobname = 'fieldmaps_training_purge';
```

No user receives membership in the platform organization. Do not grant an organization owner or administrator role to manage Training.

## Uploading the Training site package

The authenticated package-upload workflow is implemented separately in BE-13. Until it exists, seeding the Training site and form does not make a downloadable map package available.

When that workflow is available:

1. Select the intended environment explicitly. Use an operator account that already has an Auth user and profile. Record its user ID in the operation log.
2. As the database owner, give that account temporary **project** manager access. In `psql`, supply its ID at the prompt:

   ```sql
   \prompt 'Operator Auth user ID: ' training_operator_id
   INSERT INTO fieldmaps.project_memberships
     (user_id, organization_id, project_id, role)
   VALUES (:'training_operator_id'::uuid,
     '10000000-0000-4000-8000-000000000101',
     '10000000-0000-4000-8000-000000000102', 'manager')
   ON CONFLICT (user_id, project_id) DO UPDATE SET role = 'manager';
   ```

3. Sign in as that operator and upload the package through BE-13. Record its version and validation result.
4. Remove the temporary manager membership even if upload fails:

   ```sql
   DELETE FROM fieldmaps.project_memberships
   WHERE project_id = '10000000-0000-4000-8000-000000000102'
     AND user_id = :'training_operator_id'::uuid AND role = 'manager';
   ```

   The next profile initialization restores ordinary observer membership.

5. Confirm there are no remaining manager memberships on Training and no platform organization memberships. Record cleanup in the operation log.
