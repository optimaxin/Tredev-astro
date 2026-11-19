-- Sent on every login (password, Google, or phone OTP) for a returning
-- account — see authService.ts's login()/loginWithFirebase().
INSERT INTO email_templates (id, name, subject, body, created_at, updated_at) VALUES
('tpl-welcome-back', 'Welcome Back', 'Welcome back to TredevaAstro, {{name}}!',
'Dear {{name}},

Welcome back to TredevaAstro! We''re glad to see you again.

Pick up right where you left off — check your Kundli, continue a consultation, or explore something new.

Warm regards,
The TredevaAstro Team', 0, 0)
ON CONFLICT (id) DO NOTHING;
