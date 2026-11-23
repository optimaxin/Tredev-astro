-- Notifies the configured admin address (platform_settings.notify_admin_email)
-- that a staff member proposed a Reports-catalog change awaiting approval.
INSERT INTO email_templates (id, name, subject, body, created_at, updated_at) VALUES
('tpl-report-change-pending', 'Report Catalog Change Pending Approval', 'Report catalog change needs your approval',
'Dear {{name}},

{{staffName}} proposed a {{action}} on the report "{{reportTitle}}" in the Reports catalog.

Log in to the admin console''s Reports > Pending Approvals tab to review and approve or reject it. Nothing changes on the live site until you decide.

Warm regards,
The TredevaAstro Team', 0, 0)
ON CONFLICT (id) DO NOTHING;
