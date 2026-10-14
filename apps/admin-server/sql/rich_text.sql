-- Trip texts are rich text (HTML from the admin editor).
-- The short description needs room for its formatting tags; the
-- 300-character limit on its text is checked by the admin.
ALTER TABLE `trips` MODIFY `blurb` text COLLATE utf8mb4_general_ci NOT NULL;
