-- Google Business Profile reviews, synced into the website's reviews table.
-- Run once on each database (local + Hostinger).

-- 1. reviews: Google reviews have no trip, can be long, and may have
--    a reply from the business
ALTER TABLE `reviews`
  MODIFY `trip_id` int DEFAULT NULL,
  MODIFY `body` varchar(4100) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
  ADD COLUMN `source` enum('website','google') NOT NULL DEFAULT 'website' AFTER `id`,
  ADD COLUMN `google_review_id` varchar(191) DEFAULT NULL AFTER `source`,
  ADD COLUMN `author_photo_url` varchar(500) DEFAULT NULL AFTER `author_name`,
  ADD COLUMN `owner_reply` varchar(4100) DEFAULT NULL AFTER `body`,
  ADD COLUMN `updated_at` timestamp NULL DEFAULT NULL AFTER `published_at`,
  ADD UNIQUE KEY `uq_reviews_google` (`google_review_id`);

-- 2. The connected Google account and business location (one row)
CREATE TABLE IF NOT EXISTS `google_business` (
  `id` tinyint NOT NULL DEFAULT 1,
  `refresh_token` varchar(1024) DEFAULT NULL,
  `connected_email` varchar(190) DEFAULT NULL,
  `account_name` varchar(120) DEFAULT NULL,
  `location_name` varchar(120) DEFAULT NULL,
  `location_title` varchar(255) DEFAULT NULL,
  `average_rating` decimal(2,1) DEFAULT NULL,
  `total_reviews` int DEFAULT NULL,
  `last_synced_at` timestamp NULL DEFAULT NULL,
  `last_error` varchar(500) DEFAULT NULL,
  `connected_by` int DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
