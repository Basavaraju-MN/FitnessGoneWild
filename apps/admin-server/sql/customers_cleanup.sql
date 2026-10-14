-- One-time clean-up: customers who never booked (added by brochure
-- downloads before this change). Their leads stay in Enquiries & Leads
-- with name, phone, email and trip; only the customers row goes.
-- Run once on each database, after deploying the code.

-- 1. Keep the leads, but no longer pointing at those customer rows
UPDATE enquiries e
JOIN customers c ON c.id = e.customer_id
SET e.customer_id = NULL
WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.customer_id = c.id);

-- 2. Remove customers without any booking
DELETE c FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.customer_id = c.id);
