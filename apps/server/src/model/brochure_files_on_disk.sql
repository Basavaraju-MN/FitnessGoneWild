-- Brochure PDFs now live in apps/server/brochures/<slug>.pdf.
-- The brochures table keeps the download name and count; the file
-- itself no longer has to be stored in the database.
-- Run once on every database (local and Hostinger).

ALTER TABLE `brochures`
  MODIFY `file_data` longblob NULL,
  MODIFY `file_size` int UNSIGNED NOT NULL DEFAULT 0;

-- Optional: free the space used by PDFs already in the database
-- (only after their files are in the brochures folder)
-- UPDATE `brochures` SET `file_data` = NULL, `file_size` = 0;
