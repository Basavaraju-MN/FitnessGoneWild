import { useEffect, useMemo, useState } from 'react';
import '../../styles/bookingmodal.css';
import '../../styles/payment.css';
import { PaymentMethodChooser } from '../../pages/PaymentOptions';

const PICKUP_LOCATIONS = [
  'Indiranagar',
  'Domlur',
  'Yeshwanthpura',
  'Goraguntepalya',
];

const GST_RATE = 0.05;

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

    const sunday = new Date(friday);
    sunday.setDate(friday.getDate() + 2);

    weekends.push({
      id: friday.toISOString().split('T')[0],
      friday,
      sunday,
    });
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

  const [step, setStep] = useState(1);

  const [selectedWeekend, setSelectedWeekend] =
    useState(weekends[0] || null);

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [pickupLocation, setPickupLocation] =
    useState('');

  const [transportTickets, setTransportTickets] =
    useState(0);

  const [withoutTransportTickets, setWithoutTransportTickets] =
    useState(0);

  const [termsAccepted, setTermsAccepted] =
    useState(false);

  const [error, setError] = useState('');
  const [paymentBooking, setPaymentBooking] = useState(null);

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

  const withoutTransportationAmount =
    withoutTransportTickets * price;

  const transportationAmount =
    transportTickets *
    (transportationPrice || price);

  const subtotal =
    withoutTransportationAmount +
    transportationAmount;

  const gst = subtotal * GST_RATE;

  const total = subtotal + gst;

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

    if (!pickupLocation) {
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

    if (transportTickets + withoutTransportTickets < 1) {
      setError('Please select at least one ticket.');
      return;
    }

    const booking = {
      trekId: trek.id,
      trekName: trek.name,
      selectedDate: selectedWeekend.id,
      name,
      mobile,
      email,
      pickupLocation,
      transportTickets,
      withoutTransportTickets,
      subtotal,
      gst,
      total,
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
              className={`booking-step ${
                step >= 1 ? 'active' : ''
              }`}
            >
              <span>✓</span>
              <small>Details</small>
            </div>

            <div className="booking-step-line" />

            <div
              className={`booking-step ${
                step >= 2 ? 'active' : ''
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
                  src={`/images/${trek.slug}1.jpg`}
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
                    {price.toLocaleString('en-IN')}
                    <small> / person</small>
                  </strong>
                </div>
              </div>

              {/* SELECT DATE */}
              <div className="booking-section">

                <div className="booking-section-title">
                  <span>Select Date</span>

                  <label className="all-dates">
                    <span>▣</span>
                    All Dates
                    <input
                      type="date"
                      onChange={(event) => {
                        const selected =
                          event.target.value;

                        const weekend =
                          weekends.find(
                            (item) =>
                              item.id === selected
                          );

                        if (weekend) {
                          setSelectedWeekend(
                            weekend
                          );
                        }
                      }}
                    />
                  </label>
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
                      {formatDateWithDay(
                        weekend.friday
                      )}{' '}
                      -{' '}
                      {formatDate(
                        weekend.sunday
                      )}
                    </button>
                  ))}

                </div>

                <p className="date-help">
                  Departure Friday night and return
                  Sunday night.
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
                  onChange={(event) =>
                    setPickupLocation(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Select pickup location
                  </option>

                  {PICKUP_LOCATIONS.map(
                    (location) => (
                      <option
                        key={location}
                        value={location}
                      >
                        {location}
                      </option>
                    )
                  )}
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
                  src={`/images/${trek.slug}1.jpg`}
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
                      ? `${formatDateWithDay(
                          selectedWeekend.friday
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

                {/* WITHOUT TRANSPORT */}
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

              </div>

              {/* PRICE */}
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

                <div className="total-row">
                  <span>Total</span>
                  <strong>
                    ₹
                    {total.toLocaleString(
                      'en-IN',
                      {
                        maximumFractionDigits: 2,
                      }
                    )}
                  </strong>
                </div>

              </div>

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

                <div>
                  <span>Total payable</span>

                  <strong>
                    ₹
                    {total.toLocaleString(
                      'en-IN',
                      {
                        maximumFractionDigits: 2,
                      }
                    )}
                  </strong>

                  <button
                    type="button"
                    className="view-details-button"
                  >
                    View Details
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
          🛡 secured by: logout.studio
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
            />
          </div>
        </div>
      )}
    </div>
  );
}
