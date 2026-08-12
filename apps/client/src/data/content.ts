import type { Review } from '../types/trek';

export const featuredTrips = [
  {
    id: 1,
    rank: 'Most booked',
    name: 'Kudremukh Trek',
    meta: '2 days · Easy · Departs Fri 10:30 PM',
    price: '₹2,499',
    includes: ['Return transport from Bangalore', '4 meals + forest permits', 'Certified trek leader'],
  },
  {
    id: 2,
    rank: 'Best for beginners',
    name: 'Kodachadri Trek',
    meta: '2 days · Moderate · Departs Fri 10:00 PM',
    price: '₹2,199',
    includes: ['Return transport from Bangalore', 'Homestay night + 4 meals', 'Waterfall stop en route'],
  },
  {
    id: 3,
    rank: 'Long weekend',
    name: 'Goa Backpacking',
    meta: '3 days · Easy · Departs Thu 9:00 PM',
    price: '₹6,999',
    includes: ['Sleeper bus both ways', '2 nights hostel, breakfast', 'Scooter arranged on arrival'],
  },
];

export const whyUs = [
  ['🧭', 'Leaders, not tour guides', 'Every trip is led by someone with wilderness first-aid certification who has walked that trail at least ten times.'],
  ['👥', 'Groups capped at 25', 'Small enough that nobody gets left at the back, and quiet enough that you still hear the forest.'],
  ['🚌', 'Transport from your side of town', 'Five pickup points across Bangalore. No 4 AM cab to a mystery meeting spot.'],
  ['🩹', 'Safety kit on every trip', 'First-aid kit, pulse oximeter, emergency oxygen on high treks, and a backup vehicle on call.'],
  ['🧾', 'One price, printed upfront', 'Permits, meals and stay are in the number you see. Full refund if you cancel 7 days out.'],
  ['🌿', 'We carry our waste back', 'Leave-no-trace briefing before every trek, and a bag of collected litter comes down with us.'],
];

export const stats = [
  ['10,000+', 'Travellers taken out'],
  ['300+', 'Trips organised'],
  ['4.9★', 'Average rating'],
  ['24×7', 'Support on trip days'],
];

export const reviews: Review[] = [
  { id: 1, name: 'Rahul Menon', initial: 'R', trek: 'Kudremukh Trek', date: 'March 2026', rating: 5, text: "The leader noticed I was struggling on the last climb and quietly stayed back with me the whole way. I finished. That's the whole review." },
  { id: 2, name: 'Sneha Iyer', initial: 'S', trek: 'Tadiandamol Trek', date: 'February 2026', rating: 5, text: 'Solo female traveller, first trek ever. Pickup was on time, the group was decent, and I never once felt out of place.' },
  { id: 3, name: 'Kiran Shetty', initial: 'K', trek: 'Skandagiri Night Trek', date: 'January 2026', rating: 5, text: 'Bus broke down near Hassan and they had a replacement in 40 minutes. We still made sunrise. Handled better than most airlines.' },
  { id: 4, name: 'Aditya Rao', initial: 'A', trek: 'Kodachadri Trek', date: 'December 2025', rating: 4, text: 'Food at the homestay was excellent, trail was gorgeous. Only gripe — the return bus got in an hour late on Sunday night.' },
  { id: 5, name: 'Priya Nair', initial: 'P', trek: 'Gokarna Beach Trek', date: 'November 2025', rating: 5, text: 'Booked for a team of nine. They rearranged pickup points for us without charging extra and sent a packing list a week ahead.' },
  { id: 6, name: 'Vikram Joshi', initial: 'V', trek: 'Coorg Bike Ride', date: 'October 2025', rating: 5, text: 'Rode my own bike, they had a mechanic sweeping the group. Puncture at km 180 cost me fifteen minutes instead of my whole Sunday.' },
];

export const faq = [
  ['Do I need any trekking experience?', 'Not for anything marked Easy. If you can walk 5 km without stopping, you can do Tadiandamol or Savandurga. Moderate treks assume you have done one trek before.'],
  ["What's included in the price?", "Return transport from Bangalore, stay, the meals listed on the trip page, forest permits and your trek leader. Personal expenses aren't included."],
  ['Where do you pick up from?', 'Majestic, Marathahalli, Silk Board, Yeshwanthpur and Banashankari. You pick one when you book, and we send the exact spot with a map link the day before.'],
  ['What if I need to cancel?', "Full refund up to 7 days before departure, 50% up to 3 days before. After that we can move you to another date instead."],
  ['What should I pack?', 'Shoes with grip, two litres of water, a rain jacket in monsoon, and a change of clothes. We email a full checklist once your booking is confirmed.'],
  ['Is it safe for solo travellers?', "About 40% of our travellers come alone. Stays are separated by gender unless you're booking as a group, and there's a leader reachable through the night."],
];
