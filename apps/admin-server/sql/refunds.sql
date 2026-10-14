-- Refunds on cancelled bookings: through PhonePe (back to the customer's
-- original payment) or paid back by hand (UPI / cash / bank).
-- Run once on each database (local + Hostinger).

-- Every refund attempt, with its PhonePe status
CREATE TABLE IF NOT EXISTS `booking_refunds` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `mode` enum('phonepe','manual') NOT NULL,
  `method` varchar(30) DEFAULT NULL,                -- manual: upi / cash / bank_transfer …
  `merchant_refund_id` varchar(64) DEFAULT NULL,    -- our id sent to PhonePe
  `phonepe_refund_id` varchar(100) DEFAULT NULL,
  `state` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
  `reference` varchar(120) DEFAULT NULL,
  `reason` varchar(500) DEFAULT NULL,
  `error_message` varchar(500) DEFAULT NULL,
  `initiated_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_merchant_refund_id` (`merchant_refund_id`),
  KEY `idx_refunds_booking` (`booking_id`),
  KEY `idx_refunds_state` (`state`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Total refunded so far on the booking (completed refunds only)
ALTER TABLE `bookings`
  ADD COLUMN `refund_amount` decimal(10,2) NOT NULL DEFAULT 0.00 AFTER `balance_amount`,
  ADD COLUMN `refunded_at` datetime DEFAULT NULL AFTER `refund_amount`;
