-- Two more automatic-notification templates: a free-AI-chat grant (staff
-- dispute resolution) and a post-consultation thank-you/feedback request.
INSERT INTO email_templates (id, name, subject, body, created_at, updated_at) VALUES
('tpl-free-ai-chat-granted', 'Free AI Chat Granted', 'You''ve received extra free AI chat time',
'Dear {{name}},

Good news — our team has added {{minutes}} minutes of free Ask TredevaAstro AI chat time to your account.

Log in whenever you''d like to use it.

Warm regards,
The TredevaAstro Team', 0, 0),

('tpl-consultation-thanks', 'Consultation Thank You + Feedback', 'Thank you for your consultation with {{astrologerName}}',
'Dear {{name}},

Thank you for your {{consultationType}} consultation with {{astrologerName}} on TredevaAstro.

We''d love to hear how it went — log in to your account and leave a rating and review for {{astrologerName}} whenever you have a moment. Your feedback helps other seekers choose the right astrologer, and helps us keep quality high across the platform.

Warm regards,
The TredevaAstro Team', 0, 0)
ON CONFLICT (id) DO NOTHING;
