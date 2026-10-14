-- Lead statuses, managed in the admin (Enquiries & Leads → status
-- dropdown → "Manage statuses…"). Run once on each database.

CREATE TABLE IF NOT EXISTS `lead_statuses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `status_key` varchar(40) NOT NULL,            -- stored in enquiries.status
  `label` varchar(60) NOT NULL,                 -- shown in the dropdown
  `stage` enum('open','won','lost') NOT NULL DEFAULT 'open', -- for the stats: in progress / booked / lost
  `tone` enum('blue','amber','green','red','grey') NOT NULL DEFAULT 'blue',
  `sort_order` smallint NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_system` tinyint(1) NOT NULL DEFAULT 0,    -- New / Booked / Lost: cannot be hidden
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_lead_status_key` (`status_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT IGNORE INTO `lead_statuses` (`status_key`, `label`, `stage`, `tone`, `sort_order`, `is_system`) VALUES
  ('new',               'New Enquiry',       'open', 'blue',  1, 1),
  ('call_not_picked',   'Call Not Picked',   'open', 'amber', 2, 0),
  ('call_not_picked_2', 'Call not picked 2', 'open', 'amber', 3, 0),
  ('call_not_picked_3', 'Call not picked 3', 'open', 'red',   4, 0),
  ('follow_up',         'Follow up',         'open', 'amber', 5, 0),
  ('plan_quote_sent',   'Plan & Quote Sent', 'open', 'blue',  6, 0),
  ('awaiting_payment',  'Awaiting Payment',  'open', 'amber', 7, 0),
  ('booked',            'Booked',            'won',  'green', 8, 1),
  ('lost_closed',       'Lost & Closed',     'lost', 'grey',  9, 1),
  ('future_prospect',   'Future Prospect',   'open', 'blue', 10, 0),
  ('duplicate',         'Duplicate',         'lost', 'grey', 11, 0);

-- enquiries.status: any status key (was a fixed list)
ALTER TABLE `enquiries`
  MODIFY `status` varchar(40) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'new';

-- Old statuses -> new ones
UPDATE `enquiries` SET `status` = 'follow_up'   WHERE `status` IN ('contacted', 'interested');
UPDATE `enquiries` SET `status` = 'lost_closed' WHERE `status` = 'closed';
