INSERT INTO fieldmaps.organizations (id, name) VALUES (
  '10000000-0000-4000-8000-000000000001', 'FieldMaps training'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO fieldmaps.projects (id, organization_id, name) VALUES (
  '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
  'Mobile shell practice'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO fieldmaps.sites (id, organization_id, project_id, code, name) VALUES (
  '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002', 'sample-garden', 'Sample garden'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO fieldmaps.form_versions (id, organization_id, project_id, code, definition) VALUES (
  '10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002', 'shell-v1',
  '{"status":"practice-only","fields":[
    {"code":"people","type":"integer","required":true,"minimum":0,"maximum":999},
    {"code":"notes","type":"text","required":false,"maxLength":1000}
  ]}'
) ON CONFLICT (id) DO NOTHING;
