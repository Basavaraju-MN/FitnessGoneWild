import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import '../styles/payment.css';

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL
  ?.trim()
  .replace(/\/+$/, '');

const API_BASE_URL =
  configuredApiBaseUrl ||
  (import.meta.env.DEV
    ? 'http://localhost:4000/api'
    : '/api');

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const merchantOrderId =
    searchParams.get('merchantOrderId');

  const [state, setState] = useState({
    status: 'PROCESSING',
    error: '',
  });

  useEffect(() => {
    if (!merchantOrderId) {
      setState({
        status: 'UNKNOWN',
        error: 'Payment reference is missing.',
      });

      return undefined;
    }

    let cancelled = false;
    let timeoutId;

const checkStatus = async () => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/payment-status/${encodeURIComponent(
        merchantOrderId
      )}`,
      {
        credentials: 'include',
      }
    );

    const result = await response.json();

    console.log('Payment status API response:', result);

    if (!response.ok || !result?.success) {
      throw new Error(
        result?.message ||
          'Unable to verify payment.'
      );
    }

    if (cancelled) return;

    const status =
      result.data?.status || 'PROCESSING';

    console.log('PhonePe payment status:', status);

    /*
     * IMPORTANT:
     * Check the exact value returned by your backend.
     */
    if (
  status === 'SUCCESS' ||
  status === 'COMPLETED'
) {
  console.log(
    'Payment successful. Calling payment-success API...'
  );

  // Get booking details saved before going to PhonePe
  let pendingBooking = null;

  try {
    const storedBooking =
      sessionStorage.getItem('pendingBooking');

    console.log(
      'pendingBooking raw:',
      storedBooking
    );

    if (storedBooking) {
      pendingBooking = JSON.parse(storedBooking);
    }

    console.log(
      'Pending booking:',
      pendingBooking
    );
  } catch (error) {
    console.error(
      'Unable to read pendingBooking:',
      error
    );
  }

  try {
    const receiptResponse = await fetch(
      `${API_BASE_URL}/payment-success`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          merchantOrderId,

          customerName:
            pendingBooking?.customerName ||
            pendingBooking?.name ||
            '',

          customerEmail:
            pendingBooking?.customerEmail ||
            pendingBooking?.email ||
            '',

          trekName:
            pendingBooking?.trekName ||
            pendingBooking?.tripName ||
            '',

          subtotal:
            pendingBooking?.subtotal || 0,

          gst:
            pendingBooking?.gst || 0,

          totalAmount:
            pendingBooking?.totalAmount ||
            pendingBooking?.amount ||
            0,
        }),
      }
    );

    const receiptResult =
      await receiptResponse.json();

    console.log(
      'Payment-success API response:',
      receiptResult
    );

    if (!receiptResponse.ok) {
      console.error(
        'Payment-success API failed:',
        receiptResult
      );
    }
  } catch (receiptError) {
    console.error(
      'Payment-success API call failed:',
      receiptError
    );
  }

  setState({
    status: 'SUCCESS',
    error: '',
  });

  return;
}

    setState({
      status,
      error: '',
    });

    if (status === 'PROCESSING') {
      timeoutId = window.setTimeout(
        checkStatus,
        3000
      );
    }
  } catch (error) {
    console.error(
      'Payment status check failed:',
      error
    );

    if (!cancelled) {
      setState({
        status: 'UNKNOWN',
        error:
          error.message ||
          'Unable to verify payment.',
      });
    }
  }
};

    checkStatus();

    return () => {
      cancelled = true;

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [merchantOrderId]);

  useEffect(() => {
    if (state.status !== 'SUCCESS') {
      return undefined;
    }

    sessionStorage.removeItem(
      'pendingBooking'
    );

    const timeoutId =
      window.setTimeout(
        () =>
          navigate('/', {
            replace: true,
          }),
        1500
      );

    return () =>
      window.clearTimeout(timeoutId);
  }, [navigate, state.status]);

  const isSuccess =
    state.status === 'SUCCESS';

  const isFailed =
    state.status === 'FAILED';

  const Icon = isSuccess
    ? CheckCircle2
    : isFailed
      ? XCircle
      : Clock3;

  const heading = isSuccess
    ? 'Payment successful'
    : isFailed
      ? 'Payment was not completed'
      : 'Verifying your payment';

  const description = isSuccess
    ? 'Your payment has been received. Taking you to the home page…'
    : isFailed
      ? 'No payment was collected. You can return to the trek page and try again.'
      : state.error ||
        'Please wait while we confirm your payment with PhonePe.';

  return (
    <main className="payment-page">
      <section
        className={`payment-card payment-result ${
          isSuccess
            ? 'success'
            : isFailed
              ? 'failed'
              : ''
        }`}
      >
        <Icon
          className="payment-result-icon"
          size={52}
        />

        <h1>{heading}</h1>

        <p>{description}</p>

        {merchantOrderId && (
          <small>
            Order reference:{' '}
            {merchantOrderId}
          </small>
        )}

        <Link
          className="payment-continue"
          to="/"
        >
          Return home
        </Link>
      </section>
    </main>
  );
}