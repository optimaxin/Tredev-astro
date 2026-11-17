-- The 5 starter templates (064) were written as HTML and as terse one-line
-- notes. Staff compose/edit these as plain text now (see
-- emailService.ts's plainTextToEmailHtml, which formats it into an email
-- automatically) — rewritten here as plain, professionally-worded copy.
UPDATE email_templates SET subject = 'Welcome to TredevaAstro, {{name}}!', body =
'Dear {{name}},

Welcome to TredevaAstro! We''re delighted to have you join our community of seekers exploring the wisdom of Vedic astrology.

Your account is now ready. You can generate your free Kundli, explore personalized predictions, and connect with our verified astrologers whenever you need guidance.

If you have any questions along the way, our team is always happy to help.

Warm regards,
The TredevaAstro Team'
WHERE id = 'tpl-welcome';

UPDATE email_templates SET subject = 'Your astrologer application has been approved', body =
'Dear {{name}},

Congratulations! After a thorough review, we''re pleased to let you know that your application to join TredevaAstro as an astrologer has been approved.

You can now log in to your account to complete your profile, set your availability, and start accepting consultations from our users. {{extra}}

We''re excited to have you as part of our team of astrologers, and we look forward to the guidance you''ll bring to our community.

Warm regards,
The TredevaAstro Team'
WHERE id = 'tpl-application-approved';

UPDATE email_templates SET subject = 'Update on your astrologer application', body =
'Dear {{name}},

Thank you for taking the time to apply to join TredevaAstro as an astrologer, and for sharing your background and experience with us.

After careful review, we are unable to move forward with your application at this time. This decision is not a reflection of your abilities, and we would encourage you to apply again in the future should your circumstances change.

Thank you again for your interest in TredevaAstro.

Warm regards,
The TredevaAstro Team'
WHERE id = 'tpl-application-rejected';

UPDATE email_templates SET subject = 'Your report "{{reportName}}" is ready', body =
'Dear {{name}},

Good news — your report, {{reportName}}, has been generated and is now ready to view.

Log in to your TredevaAstro account to read your complete, personalized analysis at your convenience.

Warm regards,
The TredevaAstro Team'
WHERE id = 'tpl-report-ready';

UPDATE email_templates SET subject = 'An update on your TredevaAstro account', body =
'Dear {{name}},

{{message}}

If you have any questions, please do not hesitate to reach out to our team.

Warm regards,
The TredevaAstro Team'
WHERE id = 'tpl-general-update';
