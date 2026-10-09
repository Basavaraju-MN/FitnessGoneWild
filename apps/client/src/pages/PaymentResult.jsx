
import {
  CheckCircle2,
  Clock3,
  XCircle,
  Camera,
  Printer,
} from 'lucide-react';

import { useEffect, useRef, useState } from 'react';

import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import '../styles/payment.css';

const configuredApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL
    ?.trim()
    .replace(/\/+$/, '');

const API_BASE_URL =
  configuredApiBaseUrl ||
  (import.meta.env.DEV
    ? 'http://localhost:4000/api'
    : '/api');

const STATUS_CHECK_INTERVAL_MS = 3000;

// About 2 minutes of retries before showing an error.
const MAX_FAILED_STATUS_CHECKS = 40;

const MAX_RECEIPT_ATTEMPTS = 5;

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const merchantOrderId =
    searchParams.get('merchantOrderId');

  const [state, setState] = useState({
    status: 'PROCESSING',
    error: '',
  });

  const [receiptHtml, setReceiptHtml] =
    useState('');

  const [receiptLoading, setReceiptLoading] =
    useState(false);

  const receiptFrameRef = useRef(null);

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
    let failedAttempts = 0;

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

        if (!response.ok || !result?.success) {
          throw new Error(
            result?.message ||
            'Unable to verify payment.'
          );
        }

        if (cancelled) return;

        const status = String(
          result.data?.status || 'PROCESSING'
        ).toUpperCase();

        if (
          status === 'SUCCESS' ||
          status === 'COMPLETED'
        ) {
          setState({
            status: 'SUCCESS',
            error: '',
          });

          // Payment is verified by the backend.
          // Now request the receipt from the backend.
          await generateReceipt();

          return;
        }

        if (
          status === 'FAILED' ||
          status === 'DECLINED' ||
          status === 'CANCELLED'
        ) {
          setState({
            status: 'FAILED',
            error: '',
          });

          return;
        }

        setState({
          status: 'PROCESSING',
          error: '',
        });

        timeoutId = window.setTimeout(
          checkStatus,
          STATUS_CHECK_INTERVAL_MS
        );
      } catch (error) {
        console.error(
          'Payment status check failed:',
          error
        );

        if (cancelled) return;

        // Temporary failures (PhonePe delay, server waking up)
        // are common right after the redirect, so keep retrying
        // before giving up.
        if (failedAttempts < MAX_FAILED_STATUS_CHECKS) {
          failedAttempts += 1;

          setState({
            status: 'PROCESSING',
            error: '',
          });

          timeoutId = window.setTimeout(
            checkStatus,
            STATUS_CHECK_INTERVAL_MS
          );

          return;
        }

        setState({
          status: 'UNKNOWN',
          error:
            'We could not confirm your payment yet. If money was deducted, please contact us with your order reference.',
        });
      }
    };

    const generateReceipt = async () => {
      if (cancelled) return;

      setReceiptLoading(true);

      try {
        let pendingBooking = {};

        try {
          const storedBooking =
            sessionStorage.getItem(
              'pendingBooking'
            );

          if (storedBooking) {
            pendingBooking =
              JSON.parse(storedBooking);
          }
        } catch (error) {
          console.error(
            'Unable to read pending booking:',
            error
          );
        }

        const requestReceipt = () => fetch(
          `${API_BASE_URL}/payment-success`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              merchantOrderId,

              // Customer details
              customerName:
                pendingBooking.customerName ||
                pendingBooking.name ||
                '',

              customerEmail:
                pendingBooking.customerEmail ||
                pendingBooking.email ||
                '',

              customerMobile:
                pendingBooking.customerMobile ||
                pendingBooking.mobile ||
                pendingBooking.customerPhone ||
                pendingBooking.phone ||
                '',

              // Trek details
              trekName:
                pendingBooking.trekName ||
                pendingBooking.tripName ||
                '',

              trekDate:
                pendingBooking.trekDate ||
                pendingBooking.date ||
                '',

              pickupLocation:
                pendingBooking.pickupLocation || '',

              // Transportation
              transportation:
                pendingBooking.transportation || '',

              transportationAmount: Number(
                pendingBooking.transportationAmount || 0
              ),

              // Without transportation
              withoutTransportTickets: Number(
                pendingBooking.withoutTransportTickets ??
                pendingBooking.withoutTransportationTickets ??
                0
              ),

              withoutTransportPrice: Number(
                pendingBooking.withoutTransportPrice || 0
              ),

              withoutTransportAmount: Number(
                pendingBooking.withoutTransportAmount || 0
              ),

              // With transportation
              withTransportTickets: Number(
                pendingBooking.withTransportTickets ??
                pendingBooking.withTransportationTickets ??
                0
              ),

              withTransportPrice: Number(
                pendingBooking.withTransportPrice || 0
              ),

              withTransportAmount: Number(
                pendingBooking.withTransportAmount || 0
              ),

              // Payment breakdown
              subtotal: Number(
                pendingBooking.subtotal || 0
              ),

              gst: Number(
                pendingBooking.gst || 0
              ),

              totalAmount: Number(
                pendingBooking.total ??
                pendingBooking.totalAmount ??
                pendingBooking.amount ??
                0
              ),

              // Full payment or advance
              paymentType: pendingBooking.paymentType || 'full',
              tripTotal: Number(pendingBooking.tripTotal || 0),
              balanceDue: Number(pendingBooking.balanceDue || 0),
            }),
          }
        );

        // The receipt endpoint re-verifies the payment with
        // PhonePe, which can fail briefly, so retry a few times.
        let receiptResult;

        for (
          let attempt = 1;
          attempt <= MAX_RECEIPT_ATTEMPTS;
          attempt++
        ) {
          try {
            const receiptResponse =
              await requestReceipt();

            receiptResult =
              await receiptResponse.json();

            if (
              !receiptResponse.ok ||
              !receiptResult.success
            ) {
              throw new Error(
                receiptResult.message ||
                'Unable to generate receipt.'
              );
            }

            break;
          } catch (error) {
            if (
              cancelled ||
              attempt === MAX_RECEIPT_ATTEMPTS
            ) {
              throw error;
            }

            await new Promise((resolve) => {
              timeoutId = window.setTimeout(
                resolve,
                STATUS_CHECK_INTERVAL_MS
              );
            });
          }
        }

        if (cancelled) return;

        setReceiptHtml(
          receiptResult.receiptHtml || ''
        );

      } catch (error) {
        console.error(
          'Receipt generation failed:',
          error
        );

        if (!cancelled) {
          setState({
            status: 'SUCCESS',
            error:
              'Payment successful, but receipt generation failed. Please contact support.',
          });
        }
      } finally {
        if (!cancelled) {
          setReceiptLoading(false);
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

  // Grow the iframe to fit the receipt so the whole
  // receipt is visible for a screenshot.
  function resizeReceiptFrame() {
    const frame = receiptFrameRef.current;
    const frameDocument = frame?.contentDocument;

    if (!frame || !frameDocument) return;

    frame.style.height = `${frameDocument.documentElement.scrollHeight}px`;
  }

  function printReceipt() {
    receiptFrameRef.current?.contentWindow?.print();
  }

  function returnHome() {
    sessionStorage.removeItem(
      'pendingBooking'
    );

    navigate('/', {
      replace: true,
    });
  }

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
    ? 'Your payment has been received.'
    : isFailed
      ? 'No payment was collected. You can return to the trek page and try again.'
      : state.error ||
      'Please wait while we confirm your payment with PhonePe.';

  return (
    <main className="payment-page">
      <section
        className={`payment-card payment-result ${isSuccess
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

        {isSuccess && state.error && (
          <p>{state.error}</p>
        )}

        {receiptLoading && (
          <p>
            Preparing your receipt...
          </p>
        )}

        {receiptHtml && (
          <>
            <div className="receipt-screenshot-notice">
              <Camera size={20} />

              <span>
                Please take a screenshot of this
                receipt and keep it for your
                reference.
              </span>
            </div>

            <iframe
              ref={receiptFrameRef}
              className="receipt-frame"
              title="Payment receipt"
              srcDoc={receiptHtml}
              sandbox="allow-same-origin allow-modals"
              onLoad={resizeReceiptFrame}
            />

            <button
              type="button"
              className="receipt-print-btn"
              onClick={printReceipt}
            >
              <Printer size={18} />
              Print / Save receipt
            </button>
          </>
        )}

        {merchantOrderId && (
          <small>
            Order reference:{' '}
            {merchantOrderId}
          </small>
        )}

        <button
          type="button"
          className="payment-continue"
          onClick={returnHome}
        >
          Return home
        </button>
      </section>
    </main>
  );
}
