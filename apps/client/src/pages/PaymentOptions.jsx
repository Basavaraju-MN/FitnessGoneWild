import { CreditCard, QrCode, ShieldCheck, Smartphone, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import '../styles/payment.css';

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');
const API_BASE_URL = configuredApiBaseUrl || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

const paymentMethods = [
  {
    id: 'upi',
    title: 'UPI',
    description: 'Pay with any UPI app',
    icon: Smartphone,
  },
  {
    id: 'qr',
    title: 'Scan & Pay',
    description: 'Scan a secure QR code from your UPI app',
    icon: QrCode,
  },
  {
    id: 'card',
    title: 'Credit or debit card',
    description: 'Visa, Mastercard, RuPay and more',
    icon: CreditCard,
  },
];

function readPendingBooking() {
  try {
    return JSON.parse(sessionStorage.getItem('pendingBooking') || 'null');
  } catch {
    return null;
  }
}

export function PaymentMethodChooser({ booking, onBack }) {
  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [error, setError] = useState('');

  const total = Number(booking?.total || 0);

  const startPayment = async () => {
    if (!Number.isFinite(total) || total <= 0) {
      setError('Your booking amount is invalid. Please return to the booking page and try again.');
      return;
    }

    setError('');
    setIsStartingPayment(true);

    try {
      const response = await fetch(`${API_BASE_URL}/create-payment`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total,
          user_id: booking?.userId || null,
          preferred_payment_method: selectedMethod,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Unable to start secure payment.');
      }

      const redirectUrl = result?.data?.redirectUrl;
      if (!redirectUrl) {
        throw new Error('Payment provider did not return a checkout link.');
      }

      window.location.assign(redirectUrl);
    } catch (paymentError) {
      setError(paymentError.message || 'Unable to start secure payment. Please try again.');
      setIsStartingPayment(false);
    }
  };

  return (
    <section className="payment-card">
      {onBack && (
        <button type="button" className="payment-back" onClick={onBack}>
          <ArrowLeft size={18} /> Back to booking
        </button>
      )}

      <header className="payment-heading">
        <div className="payment-shield"><ShieldCheck size={24} /></div>
        <div>
          <p>Secure payment</p>
          <h1>Choose a payment method</h1>
        </div>
        </header>

      <div className="payment-order-summary">
        <span>{booking.trekName}</span>
        <strong>₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
      </div>

      <div className="payment-methods" role="radiogroup" aria-label="Payment method">
        {paymentMethods.map(({ id, title, description, icon: Icon }) => (
          <button
            type="button"
            key={id}
            className={`payment-method ${selectedMethod === id ? 'selected' : ''}`}
            onClick={() => setSelectedMethod(id)}
            role="radio"
            aria-checked={selectedMethod === id}
          >
            <span className="payment-method-icon"><Icon size={23} /></span>
            <span><strong>{title}</strong><small>{description}</small></span>
            <span className="payment-method-radio" aria-hidden="true" />
          </button>
        ))}
      </div>

      <p className="payment-provider-note">
        You will be taken to PhonePe’s secure checkout to complete payment with your selected option.
      </p>

      {error && <p className="payment-error" role="alert">{error}</p>}

      <button type="button" className="payment-continue" onClick={startPayment} disabled={isStartingPayment}>
        {isStartingPayment ? 'Opening secure checkout…' : `Pay ₹${total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
      </button>
    </section>
  );
}

export default function PaymentOptions() {
  const location = useLocation();
  const navigate = useNavigate();
  const booking = useMemo(
    () => location.state?.booking || readPendingBooking(),
    [location.state]
  );

  if (!booking) {
    return (
      <main className="payment-page">
        <section className="payment-card payment-empty-state">
          <h1>Booking details not found</h1>
          <p>Please choose your tickets again before continuing to payment.</p>
          <button type="button" onClick={() => navigate('/')}>Return home</button>
        </section>
      </main>
    );
  }

  return (
    <main className="payment-page">
      <PaymentMethodChooser booking={booking} onBack={() => navigate(-1)} />
    </main>
  );
}
