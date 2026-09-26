
import {
  CheckCircle2,
  Clock3,
  XCircle,
  Download,
} from 'lucide-react';

import { useEffect, useState } from 'react';

import {
  Link,
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

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const merchantOrderId =
    searchParams.get('merchantOrderId');

  const [state, setState] = useState({
    status: 'PROCESSING',
    error: '',
  });

  const [showReceiptPopup, setShowReceiptPopup] =
    useState(false);

  const [receiptPdfBase64, setReceiptPdfBase64] =
    useState('');

  const [receiptFilename, setReceiptFilename] =
    useState('Payment-Receipt.pdf');

  const [receiptLoading, setReceiptLoading] =
    useState(false);

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
          // Now request the PDF from the backend.
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
          3000
        );
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
            }),
          }
        );

        const receiptResult =
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

        if (cancelled) return;

        setReceiptPdfBase64(
          receiptResult.receiptPdfBase64 || ''
        );

        setReceiptFilename(
          receiptResult.receiptFilename ||
          'Payment-Receipt.pdf'
        );

        setShowReceiptPopup(true);

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

  function downloadReceipt() {
    if (!receiptPdfBase64) {
      setState((previous) => ({
        ...previous,
        error: 'Receipt PDF is not available.',
      }));

      return;
    }

    try {
      const binaryString = window.atob(
        receiptPdfBase64
      );

      const bytes = new Uint8Array(
        binaryString.length
      );

      for (
        let index = 0;
        index < binaryString.length;
        index++
      ) {
        bytes[index] =
          binaryString.charCodeAt(index);
      }

      const pdfBlob = new Blob(
        [bytes],
        {
          type: 'application/pdf',
        }
      );

      const downloadUrl =
        window.URL.createObjectURL(pdfBlob);

      const link =
        document.createElement('a');

      link.href = downloadUrl;
      link.download = receiptFilename;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(
          downloadUrl
        );
      }, 1000);

      setShowReceiptPopup(false);

      sessionStorage.removeItem(
        'pendingBooking'
      );

      navigate('/', {
        replace: true,
      });
    } catch (error) {
      console.error(
        'Receipt download failed:',
        error
      );

      setState((previous) => ({
        ...previous,
        error: 'Unable to download receipt.',
      }));
    }
  }

  function closeReceiptPopup() {
    setShowReceiptPopup(false);

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
        {!showReceiptPopup && (
          <>
            <Icon
              className="payment-result-icon"
              size={52}
            />

            <h1>{heading}</h1>

            <p>{description}</p>

            {receiptLoading && (
              <p>
                Preparing your receipt...
              </p>
            )}

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
          </>
        )}

        {showReceiptPopup && (
          <div
            className="receipt-modal-overlay"
          >
            <div
              className="receipt-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="receipt-title"
            >
              <CheckCircle2
                size={56}
                color="#16a34a"
              />

              <h2 id="receipt-title">
                Payment Successful!
              </h2>

              <p>
                Your payment has been
                received successfully.
              </p>

              <p>
                Do you want to download your
                receipt PDF?
              </p>

              <div className="receipt-modal-actions">
                <button
                  type="button"
                  className="receipt-no-btn"
                  onClick={closeReceiptPopup}
                >
                  No
                </button>

                <button
                  type="button"
                  className="receipt-yes-btn"
                  onClick={downloadReceipt}
                >
                  <Download size={18} />
                  Yes, Download Receipt
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}