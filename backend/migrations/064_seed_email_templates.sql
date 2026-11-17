-- Starter templates staff can send as-is, edit, or duplicate. {{placeholders}}
-- are filled in by notificationService.ts / the compose screen.
INSERT INTO email_templates (id, name, subject, body, created_at, updated_at) VALUES
('tpl-welcome', 'Welcome', 'Welcome to TredevAastro, {{name}}!',
 '<p>Hi {{name}},</p><p>Welcome to TredevAastro — glad to have you with us.</p>', 0, 0),
('tpl-application-approved', 'Astrologer Application Approved', 'Your astrologer application has been approved',
 '<p>Hi {{name}},</p><p>Great news — your application to join TredevAastro as an astrologer/pandit has been <strong>approved</strong>. {{extra}}</p>', 0, 0),
('tpl-application-rejected', 'Astrologer Application Rejected', 'Update on your astrologer application',
 '<p>Hi {{name}},</p><p>Thank you for applying to TredevAastro. After review, we are not able to approve your application at this time.</p>', 0, 0),
('tpl-report-ready', 'Report Ready', 'Your report "{{reportName}}" is ready',
 '<p>Hi {{name}},</p><p>Your report <strong>{{reportName}}</strong> has been generated and is ready to view.</p>', 0, 0),
('tpl-general-update', 'General Update', 'An update on your TredevAastro account',
 '<p>Hi {{name}},</p><p>{{message}}</p>', 0, 0)
ON CONFLICT (id) DO NOTHING;
