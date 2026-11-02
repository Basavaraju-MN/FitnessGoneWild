import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '../api';
import { useAdmin } from '../context';
import { date, dateTime, money, whatsappLink } from '../format';
import { useToast } from './ui';

const POLL_MS = 30000;

// Last event each person has read, per type (remembered in this browser)
const SEEN_KEYS = {
  booking: 'fgw-admin-booking-seen-id',
  brochure: 'fgw-admin-brochure-lead-seen-id',
  interest: 'fgw-admin-interest-seen-id',
};

const readSeen = (type) => {
  try {
    const value = localStorage.getItem(SEEN_KEYS[type]);
    return value === null ? null : Number(value);
  } catch {
    return null;
  }
};

const writeSeen = (type, id) => {
  try {
    localStorage.setItem(SEEN_KEYS[type], String(id));
  } catch {
    // private mode: the badge just resets on reload
  }
};

// How each event type is shown
const describe = {
  booking: (item) => ({
    icon: '🎉',
    title: `${item.name} booked ${item.trip_name || 'a trip'}`,
    detail: `${item.booking_ref} · ${item.people} ${Number(item.people) === 1 ? 'person' : 'people'} · ${date(item.trek_start_date)} · ${
      item.payment_type === 'advance'
        ? `advance ${money(item.amount_paid)}, balance ${money(item.balance_amount)}`
        : `paid ${money(item.amount_paid)}`
    }`,
    toast: `🎉 New booking: ${item.name} · ${item.trip_name || ''}`,
    heading: 'New booking',
    notification: `${item.name} · ${item.trip_name || ''} · ${item.people} people · ${money(item.amount_paid)} paid`,
  }),
  brochure: (item) => ({
    icon: '📄',
    title: `${item.name} downloaded the ${item.trip_name || ''} brochure`,
    detail: item.phone,
    toast: `📄 ${item.name} downloaded the ${item.trip_name || ''} brochure`,
    heading: 'New brochure download',
    notification: `${item.name} · ${item.phone} · ${item.trip_name || ''}`,
  }),
  interest: (item) => ({
    icon: '⭐',
    title: `Someone is interested in ${item.trip_name || 'a trip'}`,
    detail: `${item.trip_total} interested in total`,
    toast: `⭐ Someone is interested in ${item.trip_name || 'a trip'}`,
    heading: 'New interest in a trip',
    notification: `${item.trip_name || 'A trip'} · ${item.trip_total} interested in total`,
  }),
};

/**
 * Bell in the top bar. Lists only unread alerts (new bookings, brochure
 * downloads, "Interested" clicks — whatever this role may see); closing
 * the list marks them read so they go away.
 */
const BellIcon = () => (
  <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
    {/* clapper */}
    <ellipse cx="32" cy="54" rx="8" ry="6" fill="#E8A21B" />
    {/* top knob */}
    <rect x="28" y="5" width="8" height="9" rx="4" fill="#F5B82E" />
    {/* body */}
    <path d="M32 10c-11 0-19 8.5-19 20v11.5c0 2.6-1.6 5-4 6.1l-1.6.8c-1.3.6-2 1.9-2 3.3 0 1.8 1.5 3.3 3.3 3.3h46.6c1.8 0 3.3-1.5 3.3-3.3 0-1.4-.8-2.7-2-3.3l-1.6-.8c-2.4-1.1-4-3.5-4-6.1V30c0-11.5-8-20-19-20z" fill="#F7C531" />
    {/* rim */}
    <rect x="6.5" y="47.5" width="51" height="7.5" rx="3.75" fill="#F5B82E" />
  </svg>
);

export default function NotificationBell() {
  const toast = useToast();
  const { go, user } = useAdmin();
  const [feeds, setFeeds] = useState({}); // only the alert types this role may see
  const [seen, setSeen] = useState(() =>
    Object.fromEntries(Object.keys(SEEN_KEYS).map((t) => [t, readSeen(t)]))
  );
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  );
  const announced = useRef(null); // newest id already announced, per type
  const feedsRef = useRef(feeds);
  feedsRef.current = feeds;
  const boxRef = useRef(null);

  const check = useCallback(async () => {
    try {
      const { data } = await api('/notifications');
      const types = Object.keys(data).filter((type) => SEEN_KEYS[type]);

      // First visit on this browser: start counting from now
      setSeen((current) => {
        const next = { ...current };
        for (const type of types) {
          if (next[type] === null) {
            next[type] = data[type].latestId;
            writeSeen(type, next[type]);
          }
        }
        return next;
      });

      if (announced.current === null) {
        announced.current = Object.fromEntries(types.map((t) => [t, data[t].latestId]));
      } else {
        const fresh = [];
        for (const type of types) {
          for (const item of data[type].items) {
            if (item.id > (announced.current[type] ?? Infinity)) fresh.push({ type, item });
          }
          announced.current[type] = data[type].latestId;
        }

        if (fresh.length) {
          const first = describe[fresh[0].type](fresh[0].item);
          toast(fresh.length === 1 ? first.toast : `🔔 ${fresh.length} new alerts`);

          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(fresh.length === 1 ? first.heading : 'Fitness Gone Wild alerts', {
              body: fresh.length === 1 ? first.notification : `${fresh.length} new alerts`,
              tag: 'fgw-admin',
            });
          }
        }
      }

      setFeeds(Object.fromEntries(types.map((t) => [t, data[t].items])));
    } catch {
      // network blip: try again on the next poll
    }
  }, [toast]);

  // Checks only while the admin tab is on screen; coming back checks at once
  useEffect(() => {
    const visible = () => document.visibilityState === 'visible';
    check();
    const timer = setInterval(() => visible() && check(), POLL_MS);
    const onShow = () => visible() && check();
    document.addEventListener('visibilitychange', onShow);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onShow);
    };
  }, [check]);

  // Closing the list marks everything shown as read, so it disappears
  const close = useCallback(() => {
    setOpen(false);
    setSeen((current) => {
      const next = { ...current };
      for (const type of Object.keys(feedsRef.current)) {
        next[type] = Math.max(current[type] ?? 0, feedsRef.current[type][0]?.id ?? 0);
        writeSeen(type, next[type]);
      }
      return next;
    });
  }, []);

  // Close the list when clicking elsewhere
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) close();
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open, close]);

  // Only unread alerts, newest first
  const events = Object.keys(feeds)
    .flatMap((type) =>
      feeds[type]
        .filter((item) => seen[type] !== null && item.id > seen[type])
        .map((item) => ({ type, item }))
    )
    .sort((a, b) => String(b.item.at).localeCompare(String(a.item.at)));

  const askPermission = async () => {
    if (typeof Notification === 'undefined') return;
    setPermission(await Notification.requestPermission());
  };

  return (
    <div className="bell" ref={boxRef}>
      <button
        type="button"
        className="bell-button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={`${events.length} new alerts`}
      >
        <BellIcon />
        {events.length > 0 && (
          <span className="bell-badge">{events.length > 19 ? '19+' : events.length}</span>
        )}
      </button>

      {open && (
        <div className="bell-panel">
          <div className="bell-head">
            <b>Alerts</b>
            {events.length > 0 && <button className="link" onClick={close}>Mark all read</button>}
          </div>

          {permission === 'default' && (
            <button className="bell-enable" onClick={askPermission}>
              🔔 Turn on desktop alerts
            </button>
          )}

          {events.length === 0 ? (
            <div className="empty">✓ You're all caught up</div>
          ) : (
            events.map(({ type, item }) => {
              const text = describe[type](item);
              return (
                <div key={`${type}-${item.id}`} className="bell-item unread">
                  <div>
                    {text.icon} <b>{text.title}</b>
                    <small>{text.detail} · {dateTime(item.at)}</small>
                  </div>
                  {(type === 'brochure' || type === 'booking') && (
                    <a className="link" href={whatsappLink(item.phone)} target="_blank" rel="noreferrer">WhatsApp</a>
                  )}
                </div>
              );
            })
          )}

          <div className="bell-links">
            <button
              className="bell-all"
              onClick={() => {
                close();
                go('bookings');
              }}
            >
              View bookings →
            </button>
            {user.modules.includes('enquiries') && (
              <button
                className="bell-all"
                onClick={() => {
                  close();
                  go('enquiries');
                }}
              >
                Leads →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
