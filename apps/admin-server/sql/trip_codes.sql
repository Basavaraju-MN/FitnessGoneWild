-- Your own trip code for each trip coordination (instead of TC-<number>).
-- Given automatically when the first customer booking is added, using the
-- pattern in Settings (prefix + number, e.g. TC-0001); can be changed later.
-- Run once on each database.
SET NAMES utf8mb4;
ALTER TABLE `departures`
  ADD COLUMN `trip_code` varchar(30) DEFAULT NULL AFTER `id`,
  ADD UNIQUE KEY `uq_departures_trip_code` (`trip_code`);

INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`, `label`) VALUES
  ('trip_code_prefix', 'TC', 'Trip code prefix (e.g. TC, FGW, BLR)'),
  ('trip_code_digits', '4', 'Trip code number length (4 = 0001)');
