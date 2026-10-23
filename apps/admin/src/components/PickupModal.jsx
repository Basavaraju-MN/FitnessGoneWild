import { useEffect, useState } from 'react';

import { api } from '../api';
import { useAdmin } from '../context';
import { useToast } from './ui';

const MIN_PICKUP_POINTS = 2;
const emptyPickup = (cityId = '') => ({ name: '', address: '', city_id: cityId });

/**
 * A trek's pickup points in a window, the same list as step 3 of the trek
 * form: city, name, landmark, move up/down, remove, add. Saved with the trek
 * (removed points are hidden, not deleted: past bookings still use them).
 */
export default function PickupModal({ tripId, onClose, onSaved }) {
  const toast = useToast();
  const { lookups } = useAdmin();
  const [trip, setTrip] = useState(null);
  const [points, setPoints] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const cities = (lookups?.departureCities || []).filter(
    (c) => Number(c.is_active) || points.some((p) => String(p.city_id) === String(c.id))
  );
  const firstCityId = cities[0]?.id || '';

  useEffect(() => {
    api(`/trips/${tripId}`)
      .then(({ data }) => {
        setTrip(data);
        const list = (data.pickup_points || []).map((p) => ({ id: p.id, name: p.name, address: p.address || '', city_id: p.city_id || '' }));
        while (list.length < MIN_PICKUP_POINTS) list.push(emptyPickup(firstCityId));
        setPoints(list);
      })
      .catch((err) => {
        toast(err.message, 'error');
        onClose();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !saving && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saving, onClose]);

  const setPoint = (index, key, value) => setPoints((list) => list.map((p, i) => (i === index ? { ...p, [key]: value } : p)));
  const add = () => setPoints((list) => [...list, emptyPickup(list[list.length - 1]?.city_id || firstCityId)]);
  const remove = (index) => setPoints((list) => list.filter((_, i) => i !== index));
  const move = (index, delta) => setPoints((list) => {
    const next = [...list];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    return next;
  });

  const save = async () => {
    const named = points.filter((p) => String(p.name || '').trim());
    if (named.length < MIN_PICKUP_POINTS) return setError(`Add at least ${MIN_PICKUP_POINTS} pickup points`);
    if (cities.length && named.some((p) => !p.city_id)) return setError('Choose the departure city of every pickup point');

    setSaving(true);
    setError('');
    try {
      await api(`/trips/${tripId}`, { method: 'PUT', body: { pickup_points: named } });
      toast('Pickup points saved');
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
    return undefined;
  };

  const usedCities = [...new Set(points
    .filter((p) => String(p.name || '').trim() && p.city_id)
    .map((p) => cities.find((c) => String(c.id) === String(p.city_id))?.name)
    .filter(Boolean))];

  return (
    <div className="trip-modal-bg" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div className="trip-modal pickup-modal" role="dialog" aria-label={`Pickup points · ${trip?.name || ''}`}>
        <div className="trip-modal-head">
          <div>
            <h2>{trip ? trip.name : 'Loading…'}</h2>
            <small>
              Pickup points{usedCities.length ? ` · departs from ${usedCities.join(', ')}` : ''}
            </small>
          </div>
          <button type="button" className="btn alt" onClick={onClose} disabled={saving} aria-label="Close">✕</button>
        </div>

        <div className="trip-modal-body">
          {!trip ? (
            <div className="loading">Loading…</div>
          ) : (
            <div className="form">
              <div className="field full">
                <label>Pickup points * <span className="muted">(at least {MIN_PICKUP_POINTS}, in pickup order)</span></label>
                <div className="pickup-list">
                  {points.map((p, i) => (
                    <div key={p.id || `new-${i}`} className="pickup-row">
                      <span className="pickup-num">{i + 1}</span>
                      {cities.length > 0 && (
                        <select
                          className="pickup-city"
                          value={p.city_id ?? ''}
                          onChange={(e) => setPoint(i, 'city_id', e.target.value)}
                          aria-label="Departure city"
                        >
                          <option value="">City…</option>
                          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      )}
                      <input
                        value={p.name}
                        onChange={(e) => setPoint(i, 'name', e.target.value)}
                        placeholder="Name, e.g. Indiranagar"
                      />
                      <input
                        value={p.address}
                        onChange={(e) => setPoint(i, 'address', e.target.value)}
                        placeholder="Landmark, e.g. Karachi Bakery"
                      />
                      <div className="pickup-actions">
                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0 || saving} aria-label="Move up">↑</button>
                        <button type="button" onClick={() => move(i, 1)} disabled={i === points.length - 1 || saving} aria-label="Move down">↓</button>
                        <button
                          type="button"
                          className="remove"
                          onClick={() => remove(i)}
                          disabled={points.length <= MIN_PICKUP_POINTS || saving}
                          aria-label="Remove pickup point"
                          title={points.length <= MIN_PICKUP_POINTS ? `At least ${MIN_PICKUP_POINTS} needed` : 'Remove'}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" className="add-pickup" onClick={add} disabled={saving}>＋ Add pickup point</button>
                <small>
                  Shown in the website booking form for this trek. The name is saved with each booking.
                  {cities.length > 0 && ' The trek shows as leaving from every city used here.'}
                </small>
              </div>
              {error && <div className="error-box full">{error}</div>}
            </div>
          )}
        </div>

        <div className="trip-modal-foot">
          <span className="muted">{points.filter((p) => String(p.name || '').trim()).length} pickup points</span>
          <div className="foot-buttons">
            <button type="button" className="btn alt" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="button" className="btn" onClick={save} disabled={saving || !trip}>
              {saving ? 'Saving…' : 'Save pickup points'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
