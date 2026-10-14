-- Drivers and buses/vehicles are no longer used in the admin portal
-- (Trip Coordination keeps the guide only). Run once on each database
-- that already has them, after deploying the code.
ALTER TABLE `departures` DROP COLUMN `driver_id`;
DROP TABLE IF EXISTS `drivers`;
ALTER TABLE `departures` DROP COLUMN `vehicle_id`;
DROP TABLE IF EXISTS `vehicles`;
