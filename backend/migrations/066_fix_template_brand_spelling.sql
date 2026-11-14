-- 064/065 misspelled the brand as "TredevAastro" in template copy — the
-- actual brand used everywhere else in this app is "TredevaAstro". Safe to
-- run regardless of whether 065 already landed with the typo.
UPDATE email_templates
SET subject = replace(subject, 'TredevAastro', 'TredevaAstro'),
    body = replace(body, 'TredevAastro', 'TredevaAstro')
WHERE subject LIKE '%TredevAastro%' OR body LIKE '%TredevAastro%';
