-- SAMPLE reviews for testing the website's Reviews section and the admin
-- Reviews screen. These are made up: use them on a local / test database
-- only. Do not publish them on the live site — real customers would read
-- them as genuine. Every name starts with "Sample ·" so they are easy to
-- spot, and the DELETE at the bottom removes them all.
-- 9 reviews: 8 published (shown on the website), 1 pending (admin only).

INSERT INTO `reviews`
  (`source`, `trip_id`, `author_name`, `rating`, `body`, `trip_month`, `avatar_colour`, `status`, `created_at`, `published_at`)
VALUES
  ('website', 2,  'Sample · Rahul M',   5, 'Leader stayed with the slowest group the whole way up and we still made the summit before the clouds rolled in. Pickup at Majestic was on time.', 'September 2026', '#14524A', 'published', '2026-09-22 10:15:00', '2026-09-22 10:15:00'),
  ('website', 1,  'Sample · Sneha I',   5, 'First trek ever, travelling solo. The group was friendly, the homestay food was great and I never felt out of place.', 'August 2026', '#B4562B', 'published', '2026-08-30 18:40:00', '2026-08-30 18:40:00'),
  ('website', 6,  'Sample · Kiran S',   4, 'Tough climb from Kukke but very well organised. Would have liked a slightly longer break at the top.', 'August 2026', '#2C6E8F', 'published', '2026-08-18 09:05:00', '2026-08-18 09:05:00'),
  ('website', 8,  'Sample · Aditya R',  5, 'Dudhsagar in the monsoon is unreal. The team handled the rain, the train timings and a twisted ankle without any drama.', 'July 2026', '#5A6B2F', 'published', '2026-07-28 21:10:00', '2026-07-28 21:10:00'),
  ('website', 12, 'Sample · Priya N',   5, 'Booked for a group of eight friends. Hostel, scooters and the Saturday night plan were all sorted — we just showed up.', 'July 2026', '#7A4B8C', 'published', '2026-07-14 12:30:00', '2026-07-14 12:30:00'),
  ('website', 9,  'Sample · Vikram J',  4, 'The jeep ride to Kodachadri was the highlight. Hidlumane falls trail is slippery, so good shoes are a must.', 'June 2026', '#A8761E', 'published', '2026-06-25 08:45:00', '2026-06-25 08:45:00'),
  ('website', 7,  'Sample · Meghana D', 5, 'Kyathanmakki sunrise above the clouds was worth the 4 AM wake-up. Hot chai at the viewpoint was a lovely touch.', 'June 2026', '#3C6E5A', 'published', '2026-06-10 07:20:00', '2026-06-10 07:20:00'),
  ('website', 4,  'Sample · Arjun P',   3, 'Beautiful trek, but the return bus left an hour late on Sunday night. The team kept us updated and apologised.', 'May 2026', '#14524A', 'pending',   '2026-05-19 23:55:00', NULL),
  ('website', 14, 'Sample · Divya K',   5, 'Ooty and Coonoor at an easy pace — tea gardens, the toy train and great food stops. Perfect for my parents too.', 'May 2026', '#B4562B', 'published', '2026-05-04 16:00:00', '2026-05-04 16:00:00');

-- Remove all sample reviews:
-- DELETE FROM `reviews` WHERE `author_name` LIKE 'Sample · %';
