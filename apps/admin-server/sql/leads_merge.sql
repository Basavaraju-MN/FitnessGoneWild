-- =====================================================================
-- Enquiries & Leads: brochure downloads become leads (source = brochure)
-- Run once on every database (local and Hostinger), after admin_portal.sql.
-- =====================================================================

-- 1. "brochure" as a lead source
ALTER TABLE `enquiries`
  MODIFY `source` enum('website','brochure','whatsapp','phone','instagram','walkin') NOT NULL DEFAULT 'website';

-- 2. Copy the brochure leads saved so far into enquiries
--    (follow-up status mapped to the enquiry status)
INSERT INTO `enquiries`
  (`customer_id`, `name`, `phone`, `email`, `trip_id`, `people`, `note`, `status`, `source`, `assigned_to`, `received_at`)
SELECT
  bd.customer_id, bd.name, bd.phone, bd.email, bd.trip_id, 1,
  bd.notes,
  CASE bd.follow_up_status
    WHEN 'not_contacted' THEN 'new'
    WHEN 'contacted' THEN 'contacted'
    WHEN 'interested' THEN 'interested'
    WHEN 'converted' THEN 'booked'
    ELSE 'closed'
  END,
  'brochure', bd.assigned_to, bd.downloaded_at
FROM `brochure_downloads` bd;

-- The website now saves new brochure downloads straight into enquiries.
-- brochure_downloads is kept as a record and is no longer written to.
