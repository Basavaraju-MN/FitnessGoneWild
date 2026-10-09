import { useEffect, useMemo, useRef, useState } from 'react';
import '../../styles/bookingmodal.css';
import '../../styles/payment.css';
import { PaymentMethodChooser } from '../../pages/PaymentOptions';
import { getPickupPoints } from '../../api/treks';
import { isWithTransportOnly } from '../../utils/tripPricing';
import useTrekImages from '../../hooks/useTrekImages';

const GST_RATE = 0.05;

// Advance to reserve a slot, per ticket. GST is charged on the advance.
const ADVANCE_PER_TICKET = 1500;

// YYYY-MM-DD in local time. toISOString() uses UTC, which in India
// gives the previous day for a local midnight date.
function toLocalId(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Customised trips can be 1, 2 or 3 days long
const CUSTOM_DAY_OPTIONS = [1, 2, 3];

// A trip date range. Weekend departures are Fri-Sun (3 days);
// customised trips start on any date for 1-3 days.
function buildDateRange(start, days, isCustom = false) {
  const end = new Date(start);
  end.setDate(start.getDate() + days - 1);

  const startId = toLocalId(start);

  return {
    id: isCustom ? `custom-${startId}-${days}` : startId,
    startId,
    start,
    end,
    days,
    isCustom,
  };
}

function buildWeekend(friday) {
  return buildDateRange(friday, 3);
}

function formatRange(range) {
  return range.days > 1
    ? `${formatDateWithDay(range.start)} - ${formatDate(range.end)}`
    : formatDateWithDay(range.start);
}

function getUpcomingWeekends(count = 8) {
  const weekends = [];
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const day = today.getDay();

  let daysUntilFriday = (5 - day + 7) % 7;

  if (daysUntilFriday === 0 && today.getHours() >= 12) {
    daysUntilFriday = 7;
  }

  const firstFriday = new Date(today);
  firstFriday.setDate(
    today.getDate() + daysUntilFriday
  );

  for (let i = 0; i < count; i++) {
    const friday = new Date(firstFriday);
    friday.setDate(
      firstFriday.getDate() + i * 7
    );

    weekends.push(buildWeekend(friday));
  }

  return weekends;
}

function formatDate(date) {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

function formatDateWithDay(date) {
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

export default function BookingModal({
  trek,
  onClose,
}) {
  const weekends = useMemo(
    () => getUpcomingWeekends(),
    []
  );

  // First trek photo in whichever format exists (jpg/png/webp)
  const [trekImage] = useTrekImages(trek?.slug);

  const [step, setStep] = useState(1);

  const [selectedWeekend, setSelectedWeekend] =
    useState(weekends[0] || null);

  // Customised trip: any start date from the calendar, 1-3 days
  const [customStart, setCustomStart] = useState(null);
  const [customDays, setCustomDays] = useState(1);

  const dateInputRef = useRef(null);

  const todayId = toLocalId(new Date());

  const openCalendar = () => {
    const input = dateInputRef.current;
    if (!input) return;

    try {
      input.showPicker();
    } catch {
      // Older browsers without showPicker()
      input.focus();
      input.click();
    }
  };

  const handleCalendarPick = (value) => {
    if (!value) return;

    const [year, month, day] = value.split('-').map(Number);
    const start = new Date(year, month - 1, day);

    setCustomStart(start);
    setSelectedWeekend(buildDateRange(start, customDays, true));
    setError('');
  };

  // Discard the customised date and go back to the first weekend
  const handleDiscardCustom = () => {
    setCustomStart(null);
    setCustomDays(1);

    if (selectedWeekend?.isCustom) {
      setSelectedWeekend(weekends[0] || null);
    }

    setError('');
  };

  const handleCustomDays = (days) => {
    setCustomDays(days);

    if (customStart) {
      setSelectedWeekend(buildDateRange(customStart, days, true));
    }
  };

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [pickupLocation, setPickupLocation] =
    useState('');

  // Pickup points for this trek, from the pickup_points table
  const [pickupPoints, setPickupPoints] = useState([]);
  const [pickupLoading, setPickupLoading] = useState(true);

  const [transportTickets, setTransportTickets] =
    useState(0);

  const [withoutTransportTickets, setWithoutTransportTickets] =
    useState(0);

  const [termsAccepted, setTermsAccepted] =
    useState(false);

  // 'full' = pay the whole amount, 'advance' = reserve the slot
  const [paymentType, setPaymentType] = useState('full');

  // Price breakdown is hidden until "View Details" is clicked
  const [showPriceDetails, setShowPriceDetails] = useState(false);

  useEffect(() => {
    if (!showPriceDetails) return undefined;

    const handleKey = (event) => {
      if (event.key === 'Escape') setShowPriceDetails(false);
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showPriceDetails]);

  const [error, setError] = useState('');
  const [paymentBooking, setPaymentBooking] = useState(null);

  useEffect(() => {
    if (!trek?.id) {
      setPickupLoading(false);
      return undefined;
    }

    const controller = new AbortController();

    setPickupLoading(true);
    setPickupLocation('');

    getPickupPoints(trek.id, { signal: controller.signal })
      .then((points) => setPickupPoints(points))
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error('Failed to load pickup points:', err);
          setPickupPoints([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setPickupLoading(false);
        }
      });

    return () => controller.abort();
  }, [trek?.id]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const price = Number(
    trek?.without_transport_price ??
    trek?.price ??
    0
  );

  /*
   * Trip price with transportation.
   */
  const transportationPrice =
    Number(
      trek?.with_transport_price ??
      trek?.transportation_price ??
      price
    );

  // Backpacking trips are sold only with transportation
  const transportOnly = isWithTransportOnly(trek);

  const withoutTransportationAmount =
    (transportOnly ? 0 : withoutTransportTickets) * price;

  const transportationAmount =
    transportTickets *
    (transportationPrice || price);

  const subtotal =
    withoutTransportationAmount +
    transportationAmount;

  const gst = subtotal * GST_RATE;

  const total = subtotal + gst;

  const totalTickets =
    transportTickets + (transportOnly ? 0 : withoutTransportTickets);

  const advanceSubtotal =
    ADVANCE_PER_TICKET * totalTickets;

  // Advance only makes sense when it is less than the full price
  const canPayAdvance =
    totalTickets > 0 && advanceSubtotal < subtotal;

  const isAdvance =
    paymentType === 'advance' && canPayAdvance;

  const advanceGst = advanceSubtotal * GST_RATE;

  const advanceTotal = advanceSubtotal + advanceGst;

  // What is charged now and what is left to pay later
  const payableNow = isAdvance ? advanceTotal : total;

  // Rounded to paise to avoid values like 523.9499999
  const balanceDue = Math.round((total - payableNow) * 100) / 100;

  const handleDateChange = (weekend) => {
    setSelectedWeekend(weekend);
    setError('');
  };

  const handleProceed = () => {
    setError('');

    if (!selectedWeekend) {
      setError('Please select a trek date.');
      return;
    }

    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError(
        'Please enter a valid 10-digit mobile number.'
      );
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }

    if (pickupPoints.length > 0 && !pickupLocation) {
      setError('Please select a pickup location.');
      return;
    }

    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setError('');
  };

  const handlePayNow = () => {
    if (!termsAccepted) {
      setError(
        'Please agree to the Refund Policy, Cancellation Policy, and Terms & Conditions.'
      );
      return;
    }

    if (totalTickets < 1) {
      setError('Please select at least one ticket.');
      return;
    }

    const booking = {
      trekId: trek.id,
      trekName: trek.name,
      selectedDate: selectedWeekend.startId,
      trekDate: selectedWeekend.isCustom
        ? `${formatRange(selectedWeekend)} (Customised, ${selectedWeekend.days} day${selectedWeekend.days > 1 ? 's' : ''})`
        : formatRange(selectedWeekend),
      tripStartDate: selectedWeekend.startId,
      tripEndDate: toLocalId(selectedWeekend.end),
      tripDays: selectedWeekend.days,
      isCustomTrip: selectedWeekend.isCustom,
      name,
      mobile,
      email,
      pickupLocation,
      transportTickets,
      withoutTransportTickets: transportOnly ? 0 : withoutTransportTickets,
      withTransportPrice: transportationPrice || price,
      withoutTransportPrice: price,
      subtotal,
      gst,
      // Amount charged now (full total or advance)
      total: payableNow,
      tripTotal: total,
      paymentType: isAdvance ? 'advance' : 'full',
      advanceAmount: isAdvance ? advanceTotal : 0,
      balanceDue,
    };

    sessionStorage.setItem('pendingBooking', JSON.stringify(booking));
    setPaymentBooking(booking);
  };

  if (!trek) {
    return null;
  }

  return (
    <div
      className="booking-modal-overlay"
      onClick={onClose}
    >
      <div
        className="booking-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        {/* HEADER */}
        <div className="booking-modal-header">
          <button
            type="button"
            className="booking-close"
            onClick={onClose}
          >
            ×
          </button>

          <div className="booking-title">
            <span
              className="booking-back-icon"
              onClick={
                step === 2
                  ? handleBack
                  : onClose
              }
            >
              ←
            </span>

            <h2>
              {step === 1
                ? 'Personal Details'
                : 'Booking & Payment'}
            </h2>
          </div>

          {/* STEPPER */}
          <div className="booking-stepper">

            <div
              className={`booking-step ${step >= 1 ? 'active' : ''
                }`}
            >
              <span>✓</span>
              <small>Details</small>
            </div>

            <div className="booking-step-line" />

            <div
              className={`booking-step ${step >= 2 ? 'active' : ''
                }`}
            >
              <span>2</span>
              <small>Payment</small>
            </div>

            <div className="booking-step-line" />

            <div className="booking-step">
              <span>3</span>
              <small>Book</small>
            </div>

          </div>
        </div>

        {/* BODY */}
        <div className="booking-modal-body">

          {/* ================================= */}
          {/* STEP 1 */}
          {/* ================================= */}

          {step === 1 && (
            <>
              {/* TREK SUMMARY */}
              <div className="booking-trek-summary">
                <img
                  src={trekImage}
                  alt={trek.name}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                  }}
                />

                <div>
                  <h3>{trek.name}</h3>

                  <p>
                    ◷ {trek.duration_label}
                  </p>

                  <strong>
                    ₹
                    {(transportOnly
                      ? transportationPrice || price
                      : price
                    ).toLocaleString('en-IN')}
                    <small> / person</small>
                  </strong>
                </div>
              </div>

              {/* SELECT DATE */}
              <div className="booking-section">

                <div className="booking-section-title">
                  <span>Select Date</span>

                  <button
                    type="button"
                    className="all-dates"
                    onClick={openCalendar}
                  >
                    <span>▣</span>
                    Customise dates
                  </button>

                  <input
                    ref={dateInputRef}
                    type="date"
                    className="all-dates-input"
                    min={todayId}
                    value={customStart ? toLocalId(customStart) : ''}
                    onChange={(event) =>
                      handleCalendarPick(event.target.value)
                    }
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                </div>

                <div className="date-list">

                  {weekends.map((weekend) => (
                    <button
                      type="button"
                      key={weekend.id}
                      className={
                        selectedWeekend?.id ===
                          weekend.id
                          ? 'date-option selected'
                          : 'date-option'
                      }
                      onClick={() =>
                        handleDateChange(
                          weekend
                        )
                      }
                    >
                      {formatRange(weekend)}
                    </button>
                  ))}

                </div>

                {/* CUSTOMISED TRIP */}
                {customStart && (
                  <div
                    className={`custom-trip ${selectedWeekend?.isCustom ? 'selected' : ''}`}
                  >
                    <button
                      type="button"
                      className="custom-trip-date"
                      onClick={() =>
                        setSelectedWeekend(
                          buildDateRange(customStart, customDays, true)
                        )
                      }
                    >
                      <small>Customised trip</small>
                      {formatRange(
                        buildDateRange(customStart, customDays, true)
                      )}
                    </button>

                    <div className="custom-trip-days">
                      {CUSTOM_DAY_OPTIONS.map((days) => (
                        <button
                          type="button"
                          key={days}
                          className={
                            selectedWeekend?.isCustom && customDays === days
                              ? 'active'
                              : ''
                          }
                          onClick={() => handleCustomDays(days)}
                        >
                          {days} day{days > 1 ? 's' : ''}
                        </button>
                      ))}

                      <button
                        type="button"
                        className="custom-trip-discard"
                        onClick={handleDiscardCustom}
                        aria-label="Remove customised date"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  </div>
                )}

                <p className="date-help">
                  {selectedWeekend?.isCustom
                    ? `Customised trip for ${selectedWeekend.days} day${selectedWeekend.days > 1 ? 's' : ''}.`
                    : 'Departure Friday night and return Sunday night. Need other dates? Use Customise dates.'}
                </p>

              </div>

              {/* PERSONAL DETAILS */}
              <div className="booking-form">

                <input
                  type="text"
                  placeholder="Name"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                />

                <div className="mobile-row">

                  <div className="country-code">
                    🇮🇳 +91
                  </div>

                  <input
                    type="tel"
                    placeholder="Mobile Number"
                    value={mobile}
                    maxLength={10}
                    onChange={(event) =>
                      setMobile(
                        event.target.value
                          .replace(/\D/g, '')
                          .slice(0, 10)
                      )
                    }
                  />

                </div>

                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                />

                <select
                  value={pickupLocation}
                  disabled={pickupLoading || pickupPoints.length === 0}
                  onChange={(event) =>
                    setPickupLocation(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    {pickupLoading
                      ? 'Loading pickup points...'
                      : pickupPoints.length === 0
                        ? 'No pickup points for this trek'
                        : 'Select pickup location'}
                  </option>

                  {pickupPoints.map((point) => (
                    <option
                      key={point.id}
                      value={point.name}
                    >
                      {point.address
                        ? `${point.name} – ${point.address}`
                        : point.name}
                    </option>
                  ))}
                </select>

              </div>

              {error && (
                <p className="booking-error">
                  {error}
                </p>
              )}

              {/* PROCEED */}
              <button
                type="button"
                className="booking-proceed-button"
                onClick={handleProceed}
              >
                Proceed
              </button>
            </>
          )}

          {/* ================================= */}
          {/* STEP 2 */}
          {/* ================================= */}

          {step === 2 && (
            <>
              {/* TREK SUMMARY */}
              <div className="booking-trek-summary">

                <img
                  src={trekImage}
                  alt={trek.name}
                />

                <div>
                  <h3>{trek.name}</h3>

                  <p>
                    ◷ {trek.duration_label}
                  </p>

                  <p>
                    ▣{' '}
                    {selectedWeekend
                      ? selectedWeekend.isCustom
                        ? `${formatRange(selectedWeekend)} (Customised)`
                        : `${formatDateWithDay(
                          selectedWeekend.start
                        )}, 07:00 PM`
                      : ''}
                  </p>
                </div>

              </div>

              {/* TICKETS */}
              <div className="ticket-section">

                <h3>Select Ticket(s)</h3>

                {/* WITH TRANSPORT */}
                <div className="ticket-row">

                  <div>
                    <span>
                      With Transportation
                    </span>

                    <strong>
                      ₹
                      {(
                        transportationPrice ||
                        price
                      ).toLocaleString('en-IN')}
                    </strong>
                  </div>

                  <div className="ticket-controls">

                    <button
                      type="button"
                      onClick={() =>
                        setTransportTickets(
                          Math.max(
                            0,
                            transportTickets - 1
                          )
                        )
                      }
                    >
                      −
                    </button>

                    <span>
                      {transportTickets}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setTransportTickets(
                          transportTickets + 1
                        )
                      }
                    >
                      +
                    </button>

                  </div>

                </div>

                {/* WITHOUT TRANSPORT: not offered for transport-only trips */}
                {!transportOnly && (
                  <div className="ticket-row">

                    <div>
                      <span>
                        Without Transportation
                      </span>

                      <strong>
                        ₹
                        {price.toLocaleString(
                          'en-IN'
                        )}
                      </strong>
                    </div>

                    <div className="ticket-controls">

                      <button
                        type="button"
                        onClick={() =>
                          setWithoutTransportTickets(
                            Math.max(
                              0,
                              withoutTransportTickets -
                              1
                            )
                          )
                        }
                      >
                        −
                      </button>

                      <span>
                        {withoutTransportTickets}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setWithoutTransportTickets(
                            withoutTransportTickets +
                            1
                          )
                        }
                      >
                        +
                      </button>

                    </div>

                  </div>
                )}

              </div>

              {/* RESERVE SLOT: toggle shown once tickets are selected */}
              {canPayAdvance && (
                <label
                  className={`reserve-toggle ${isAdvance ? 'active' : ''}`}
                >
                  <span className="reserve-toggle-text">
                    Reserve your slot
                    <small>
                      Pay ₹{ADVANCE_PER_TICKET.toLocaleString('en-IN')} × {totalTickets} ticket
                      {totalTickets > 1 ? 's' : ''} + 5% GST now
                      {' '}(₹{advanceTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}),
                      balance before the trek
                    </small>
                  </span>

                  <input
                    type="checkbox"
                    role="switch"
                    checked={isAdvance}
                    onChange={(event) =>
                      setPaymentType(event.target.checked ? 'advance' : 'full')
                    }
                  />
                  <span className="reserve-switch" aria-hidden="true" />
                </label>
              )}

              {/* TERMS */}
              <div className="booking-terms">

                <label>
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(event) =>
                      setTermsAccepted(
                        event.target.checked
                      )
                    }
                  />

                  <span>
                    I have read and agree to the{' '}
                    <a href="#refund">
                      Refund Policy
                    </a>
                    ,{' '}
                    <a href="#cancellation">
                      Cancellation Policy
                    </a>
                    , and{' '}
                    <a href="#terms">
                      Terms & Conditions
                    </a>
                    .
                  </span>
                </label>

              </div>

              {error && (
                <p className="booking-error">
                  {error}
                </p>
              )}

              {/* PAYMENT */}
              <div className="booking-payment-footer">

                {/* BILL SUMMARY: opens above the footer */}
                {showPriceDetails && (
                  <div
                    className="bill-summary-popover"
                    role="dialog"
                    aria-label="Bill Summary"
                  >
                    <div className="bill-summary-header">
                      <h4>Bill Summary</h4>
                      <button
                        type="button"
                        className="bill-summary-close"
                        onClick={() => setShowPriceDetails(false)}
                        aria-label="Close bill summary"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="booking-price-summary">
                      <div>
                        <span>Subtotal</span>
                        <strong>
                          ₹
                          {subtotal.toLocaleString(
                            'en-IN'
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>GST (5%)</span>
                        <strong>
                          ₹
                          {gst.toLocaleString(
                            'en-IN',
                            {
                              maximumFractionDigits: 2,
                            }
                          )}
                        </strong>
                      </div>

                      {isAdvance && (
                        <>
                          <div>
                            <span>Trip total</span>
                            <strong>₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
                          </div>

                          <div>
                            <span>Balance (pay before the trek)</span>
                            <strong>₹{balanceDue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
                          </div>
                        </>
                      )}

                      <div className="total-row">
                        <span>{isAdvance ? 'Advance (incl. GST)' : 'Total'}</span>
                        <strong>
                          ₹
                          {payableNow.toLocaleString(
                            'en-IN',
                            {
                              maximumFractionDigits: 2,
                            }
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <span>{isAdvance ? 'Pay now to reserve' : 'Total payable'}</span>

                  <strong>
                    ₹
                    {payableNow.toLocaleString(
                      'en-IN',
                      {
                        maximumFractionDigits: 2,
                      }
                    )}
                  </strong>

                  <button
                    type="button"
                    className="view-details-button"
                    aria-expanded={showPriceDetails}
                    onClick={() =>
                      setShowPriceDetails((shown) => !shown)
                    }
                  >
                    {showPriceDetails ? 'Hide Details' : 'View Details'}
                  </button>
                </div>

                <button
                  type="button"
                  className="pay-now-button"
                  onClick={handlePayNow}
                >
                  Pay Now
                </button>

              </div>

            </>
          )}

        </div>

        {/* SECURED */}
        <div className="booking-secured">
          <span>🛡 Secured by</span>
          <img
            src="/images/logo.png"
            alt="The Fitness Gone Wild"
          />
          <strong>The Fitness Gone Wild</strong>
        </div>

      </div>

      {paymentBooking && (
        <div
          className="payment-method-modal-overlay"
          onClick={() => setPaymentBooking(null)}
        >
          <div onClick={(event) => event.stopPropagation()}>
            <PaymentMethodChooser
              booking={paymentBooking}
              onBack={() => setPaymentBooking(null)}
              onPaymentSuccess={() => {
                setPaymentBooking(null);
                setStep(3);
              }}
            />
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="booking-success">
          <div className="success-icon">✓</div>

          <h2>Payment Successful</h2>

          <p>
            Your payment of ₹
            {payableNow.toLocaleString('en-IN', {
              maximumFractionDigits: 2,
            })}{' '}
            has been received successfully.
          </p>

          {isAdvance && (
            <p>
              Your slot is reserved. Balance of ₹
              {balanceDue.toLocaleString('en-IN', {
                maximumFractionDigits: 2,
              })}{' '}
              is to be paid before the trek.
            </p>
          )}

          <p>
            Your payment receipt has been sent to{' '}
            <strong>{email}</strong>.
          </p>

          <button
            type="button"
            className="booking-proceed-button"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
