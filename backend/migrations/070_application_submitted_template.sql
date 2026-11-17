-- Sent to the applicant's own email the moment their "Become an Astrologer"
-- application is submitted (see astrologers.routes.ts's POST /applications).
INSERT INTO email_templates (id, name, subject, body, created_at, updated_at) VALUES
('tpl-application-submitted', 'Application Submitted', 'Your TredevaAstro application has been submitted',
'Dear {{name}},

Thank you for applying to join TredevaAstro as an astrologer/pandit. We have received your application and our hiring team will review it shortly.

We will reach out to you by email or phone with an update once a decision has been made. If you have any questions in the meantime, feel free to reply to this email.

Warm regards,
The TredevaAstro Hiring Team', 0, 0)
ON CONFLICT (id) DO NOTHING;
