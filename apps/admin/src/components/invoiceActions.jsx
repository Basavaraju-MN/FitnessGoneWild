import { useEffect, useRef, useState } from 'react';

import { api, API_URL } from '../api';
import { whatsappAppLink, whatsappLink, whatsappWebLink } from '../format';
import { Modal, useToast } from './ui';

// How WhatsApp is opened on this computer (remembered in this browser)
const MODE_KEY = 'fgw-whatsapp-mode';
export const WHATSAPP_MODES = {
  web: { label: 'WhatsApp Web', hint: 'Opens web.whatsapp.com on the customer\'s chat (same tab each time). The PDF downloads — drag it into the chat.' },
  app: { label: 'WhatsApp app', hint: 'Opens the WhatsApp app installed on this computer or phone. The PDF downloads — attach it with 📎.' },
  share: { label: 'Share sheet (PDF attached)', hint: 'Best on phones: the PDF is attached for you — pick WhatsApp and the customer.' },
};
const readMode = () => {
  try {
    const mode = localStorage.getItem(MODE_KEY);
    return WHATSAPP_MODES[mode] ? mode : null;
  } catch {
    return null;
  }
};
const saveMode = (mode) => {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // not remembered; asked again next time
  }
};

let apiStatus = null;
const whatsappApiStatus = () => {
  if (!apiStatus) apiStatus = api('/whatsapp/status').then(({ data }) => data).catch(() => ({ configured: false }));
  return apiStatus;
};

/**
 * Invoice actions for one booking, using the invoice PDF saved in the database:
 *  - send(): WhatsApp with the PDF attached
 *      phones / Windows / Mac → share sheet with the PDF (pick WhatsApp + the customer)
 *      otherwise → the PDF downloads and the customer's WhatsApp chat opens with the
 *                  message (attach the PDF there with 📎 or drag it in)
 *  - download(), view()
 * Render {dialog} once in the component.
 */
export function useInvoiceActions() {
  const toast = useToast();
  const [busy, setBusy] = useState(null); // booking id being prepared
  const [fallback, setFallback] = useState(null); // chat link when the new tab was blocked
  const [mode, setModeState] = useState(readMode);
  const [choosing, setChoosing] = useState(null); // booking waiting for the WhatsApp choice
  const [automatic, setAutomatic] = useState(false); // WhatsApp Business API set up
  const [apiFailed, setApiFailed] = useState(null); // { booking, message } when the API could not send

  useEffect(() => {
    let alive = true;
    whatsappApiStatus().then((s) => alive && setAutomatic(Boolean(s?.configured)));
    return () => {
      alive = false;
    };
  }, []);
  const setMode = (value) => {
    saveMode(value);
    setModeState(value);
  };

  const fetchPdf = async (booking) => {
    const response = await fetch(`${API_URL}/bookings/${booking.id}/invoice.pdf`, { credentials: 'include' });
    if (!response.ok) throw new Error('The invoice could not be loaded');
    const name = /filename="([^"]+)"/.exec(response.headers.get('content-disposition') || '')?.[1]
      || `Invoice-${booking.booking_ref}.pdf`;
    return new File([await response.blob()], name, { type: 'application/pdf' });
  };

  const save = (file) => {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const send = async (booking, chosen = mode, { manual = false } = {}) => {
    if (automatic && !manual) {
      setBusy(booking.id);
      try {
        const { data } = await api(`/bookings/${booking.id}/invoice/whatsapp`, { method: 'POST' });
        toast(`${data.invoiceNo} sent on WhatsApp to +${data.to} — PDF attached`);
      } catch (error) {
        setApiFailed({ booking, message: error.message });
      } finally {
        setBusy(null);
      }
      return;
    }
    if (!chosen) {
      setChoosing(booking); // first time on this computer: ask how WhatsApp is used
      return;
    }
    // WhatsApp Web: open (or reuse) its tab now, while the click still counts
    const webTab = chosen === 'web' ? window.open('', 'fgw-whatsapp-web') : null;
    setBusy(booking.id);
    try {
      const [{ data }, file] = await Promise.all([
        api(`/bookings/${booking.id}/invoice`, { method: 'POST', body: { send: true } }),
        fetchPdf(booking),
      ]);

      if (chosen === 'share' && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: file.name, text: data.message });
          toast(`${data.invoiceNo || 'Invoice'} shared`);
          return;
        } catch (error) {
          if (error?.name === 'AbortError') return; // share sheet closed
        }
      }

      save(file);
      if (chosen === 'web') {
        const chat = whatsappWebLink(data.phone, data.message);
        if (webTab) {
          webTab.location.href = chat;
          webTab.focus?.();
        } else {
          setFallback(chat);
        }
        toast(`${file.name} downloaded — drag it into the WhatsApp Web chat and press Send`);
      } else if (chosen === 'app') {
        window.location.href = whatsappAppLink(data.phone, data.message);
        toast(`${file.name} downloaded — attach it in the WhatsApp chat (📎) and press Send`);
      } else {
        // share sheet not available in this browser: normal chat link
        const chat = whatsappLink(data.phone, data.message);
        if (!window.open(chat, '_blank')) setFallback(chat);
        toast(`${file.name} downloaded — attach it in the WhatsApp chat (📎) and press Send`);
      }
    } catch (error) {
      // Close the tab only if it is still empty (an open WhatsApp Web tab cannot be read)
      try {
        if (webTab && webTab.location.href === 'about:blank') webTab.close();
      } catch {
        // already on WhatsApp Web: leave it open
      }
      toast(error.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const download = async (booking) => {
    setBusy(booking.id);
    try {
      save(await fetchPdf(booking));
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const view = async (booking) => {
    const tab = window.open('', '_blank'); // opened now, so it is not blocked
    try {
      const { data } = await api(`/bookings/${booking.id}/invoice`, { method: 'POST' });
      if (tab) tab.location.href = data.url;
    } catch (error) {
      if (tab) tab.close();
      toast(error.message, 'error');
    }
  };

  const chooser = choosing && (
    <Modal title="How do you use WhatsApp on this computer?" onClose={() => setChoosing(null)}>
      <div className="body wa-choice">
        {Object.entries(WHATSAPP_MODES).map(([key, item]) => (
          <button
            key={key}
            type="button"
            className="wa-choice-option"
            onClick={() => {
              const booking = choosing;
              setMode(key);
              setChoosing(null);
              if (booking.change) toast(`WhatsApp: ${item.label}`);
              else send(booking, key);
            }}
          >
            <b>{item.label}</b>
            <small>{item.hint}</small>
          </button>
        ))}
        <p className="muted">Remembered on this computer. Change it any time from the ⋮ menu.</p>
      </div>
    </Modal>
  );

  const fallbackDialog = fallback && (
    <Modal
      title="Open WhatsApp"
      onClose={() => setFallback(null)}
      footer={
        <a className="btn whatsapp-btn" href={fallback} target={fallback.startsWith('https://web.whatsapp.com') ? 'fgw-whatsapp-web' : '_blank'} rel="noreferrer" onClick={() => setFallback(null)}>
          Open the customer's WhatsApp chat
        </a>
      }
    >
      <div className="body">The invoice PDF is downloaded. Open the chat, attach the PDF with 📎 (or drag it in) and press Send.</div>
    </Modal>
  );

  const apiFailedDialog = apiFailed && (
    <Modal
      title="WhatsApp could not send the invoice"
      onClose={() => setApiFailed(null)}
      footer={
        <>
          <button className="btn alt" onClick={() => setApiFailed(null)}>Close</button>
          <button
            className="btn whatsapp-btn"
            onClick={() => {
              const { booking } = apiFailed;
              setApiFailed(null);
              send(booking, mode, { manual: true });
            }}
          >
            Send it myself instead
          </button>
        </>
      }
    >
      <div className="body">
        <p style={{ marginTop: 0 }}>{apiFailed.message}</p>
        <p className="muted" style={{ marginBottom: 0 }}>
          Common reasons: the invoice template is not approved yet, the access token expired, or the number is not on WhatsApp.
          You can still send it yourself (WhatsApp Web / app).
        </p>
      </div>
    </Modal>
  );

  const dialog = (
    <>
      {chooser}
      {fallbackDialog}
      {apiFailedDialog}
    </>
  );

  // ⋮ menu item to change the choice
  const modeItem = automatic
    ? { icon: '✓', label: 'WhatsApp: sent automatically (Business API)', onClick: () => toast('Invoices are sent by the WhatsApp Business API with the PDF attached') }
    : {
      icon: '⚙',
      label: `WhatsApp: ${mode ? WHATSAPP_MODES[mode].label : 'not chosen'} (change)`,
      onClick: () => setChoosing({ change: true }),
    };

  return { send, download, view, busy, dialog, mode, modeItem, automatic };
}

/**
 * ⋮ menu for a table row. items: [{ label, onClick, danger?, disabled?, hidden? }]
 * Opens floating (fixed position), so a scrolling table does not cut it off.
 */
export function RowMenu({ items, label = 'More actions' }) {
  const [open, setOpen] = useState(null); // { top, left }
  const button = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!event.target.closest?.('.row-menu-list') && event.target !== button.current) setOpen(null);
    };
    const onKey = (event) => event.key === 'Escape' && setOpen(null);
    const onScroll = () => setOpen(null);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const toggle = () => {
    if (open) return setOpen(null);
    const rect = button.current.getBoundingClientRect();
    const width = 230;
    const spaceBelow = window.innerHeight - rect.bottom;
    setOpen({
      left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
      top: spaceBelow > 240 ? rect.bottom + 4 : undefined,
      bottom: spaceBelow > 240 ? undefined : window.innerHeight - rect.top + 4,
      width,
    });
  };

  return (
    <>
      <button ref={button} type="button" className="row-menu-button" onClick={toggle} aria-label={label} aria-expanded={Boolean(open)} title={label}>⋮</button>
      {open && (
        <div className="row-menu-list" role="menu" style={open}>
          {items.filter((item) => !item.hidden).map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={item.danger ? 'danger' : ''}
              disabled={item.disabled}
              onClick={() => {
                setOpen(null);
                item.onClick();
              }}
            >
              {item.icon && <span aria-hidden="true">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
