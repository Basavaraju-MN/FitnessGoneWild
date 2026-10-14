-- Brochure leads used to get an automatic note ("Downloaded the brochure").
-- Notes are now left empty for the sales team. Run once on each database.
UPDATE enquiries
SET note = NULL
WHERE source = 'brochure' AND note LIKE 'Downloaded the brochure%';
