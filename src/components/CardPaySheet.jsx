import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Copy, CreditCard, ImagePlus, X, AlertCircle } from 'lucide-react';
import { api } from '../api';
import GoldButton from './GoldButton';

const MAX_SIDE = 1400;

const formatCard = (digits = '') => digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch (__) {
      return false;
    }
  }
}

// Shrinks the receipt photo in the browser so the upload stays small and fast.
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('bad image'));
    };
    img.src = url;
  });
}

export default function CardPaySheet({ open, plan, card, user, apiBase = '', onClose, onDone }) {
  const [copied, setCopied] = useState('');
  const [tracking, setTracking] = useState('');
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setCopied('');
      setTracking('');
      setPreview('');
      setError('');
      setBusy(false);
    }
  }, [open, plan?.code]);

  if (!plan || !card) return null;
  const amount = Number(plan.card_price_toman || 0);

  const copy = async (key, value) => {
    if (await copyText(value)) {
      setCopied(key);
      setTimeout(() => setCopied(''), 1800);
    }
  };

  const pickFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('فقط تصویر رسید قابل قبول است.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('حجم تصویر خیلی زیاد است.');
      return;
    }
    try {
      setError('');
      setPreview(await compressImage(file));
    } catch (_) {
      setError('خواندن تصویر ممکن نشد؛ یک عکس دیگر انتخاب کن.');
    }
  };

  const submit = async () => {
    if (busy) return;
    if (!preview) {
      setError('ابتدا تصویر رسید پرداخت را انتخاب کن.');
      return;
    }
    try {
      setBusy(true);
      setError('');
      await api.post(`${apiBase}/api/v1/subscriptions/card-order`, {
        user_id: user.id,
        plan_code: plan.code,
        tracking_code: tracking.trim(),
        receipt_b64: preview,
      }, { timeout: 60000 });
      onDone?.('رسید ثبت شد و برای مدیر ارسال شد. بعد از تأیید، اشتراک به‌صورت خودکار فعال می‌شود و پیام آن را در ربات می‌گیری.');
    } catch (e) {
      setError(e.response?.data?.detail || 'ثبت رسید ناموفق بود؛ اتصال را بررسی کن و دوباره تلاش کن.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            dir="rtl"
            className="w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-t-3xl p-5 space-y-4"
            style={{ backgroundColor: '#111115', border: '1px solid rgba(212,175,55,0.25)', paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <CreditCard size={18} className="text-amber-300" /> پرداخت کارت‌به‌کارت
              </div>
              <button onClick={onClose} className="p-1 text-gray-400" aria-label="بستن"><X size={20} /></button>
            </div>

            <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: '#0b0b0f', border: '1px solid rgba(212,175,55,0.18)' }}>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{plan.title}</span>
                <span>{plan.duration_days} روز</span>
              </div>
              <button className="w-full flex items-center justify-between" onClick={() => copy('amount', String(amount))}>
                <span className="text-xs text-gray-400">مبلغ قابل پرداخت</span>
                <span className="text-lg font-black gold-text tabular-nums">
                  {amount.toLocaleString('fa-IR')} تومان
                </span>
              </button>
              <div className="border-t border-white/5 pt-3">
                <div className="text-[11px] text-gray-500 mb-1">شماره کارت</div>
                <button
                  className="w-full flex items-center justify-between gap-2 rounded-xl px-3 py-3"
                  style={{ backgroundColor: '#15151b', border: '1px solid rgba(212,175,55,0.2)' }}
                  onClick={() => copy('card', card.number)}
                >
                  <span dir="ltr" className="text-base font-bold tracking-widest text-white tabular-nums">{formatCard(card.number)}</span>
                  {copied === 'card' ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Copy size={18} className="text-amber-300" />}
                </button>
                {(card.holder || card.bank) && (
                  <div className="flex items-center justify-between text-xs text-gray-300 mt-2">
                    <span>{card.holder ? `به نام ${card.holder}` : ''}</span>
                    <span className="text-gray-500">{card.bank}</span>
                  </div>
                )}
              </div>
            </div>

            <ol className="text-[11px] leading-6 text-gray-400 space-y-1 list-decimal pr-4">
              <li>مبلغ بالا را دقیقاً به شماره کارت واریز کن.</li>
              <li>از رسید پرداخت عکس یا اسکرین‌شات بگیر و همین‌جا بارگذاری کن.</li>
              <li>مدیر رسید را بررسی می‌کند و اشتراک فعال می‌شود.</li>
            </ol>

            <div className="space-y-2">
              <input
                type="text" inputMode="numeric" dir="ltr" maxLength={32}
                value={tracking} onChange={(e) => setTracking(e.target.value.replace(/[^0-9A-Za-z-]/g, ''))}
                placeholder="شماره پیگیری (اختیاری)"
                className="w-full rounded-xl bg-black/30 border border-white/10 p-3 text-xs text-white placeholder-gray-600 text-right"
              />
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
              {preview ? (
                <div className="relative rounded-xl overflow-hidden border border-amber-400/30">
                  <img src={preview} alt="رسید" className="w-full max-h-56 object-contain bg-black" />
                  <button
                    className="absolute top-2 left-2 rounded-full bg-black/70 p-1.5 text-white"
                    onClick={() => setPreview('')} aria-label="حذف تصویر"
                  ><X size={14} /></button>
                </div>
              ) : (
                <button
                  onClick={() => inputRef.current?.click()}
                  className="w-full rounded-xl border border-dashed border-amber-400/40 py-6 flex flex-col items-center gap-2 text-xs text-amber-200"
                >
                  <ImagePlus size={24} /> انتخاب تصویر رسید
                </button>
              )}
            </div>

            {error && (
              <div className="flex gap-2 items-start text-xs text-red-300">
                <AlertCircle size={15} className="shrink-0 mt-0.5" /> <span>{error}</span>
              </div>
            )}

            <GoldButton fullWidth loading={busy} disabled={!preview} onClick={submit}>
              ارسال رسید برای بررسی
            </GoldButton>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
