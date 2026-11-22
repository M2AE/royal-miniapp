import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Crown, CheckCircle2, Clock3, AlertCircle, Sparkles, Star, CreditCard, Bot, MessageSquare,
  Zap, Layers, ChevronDown, RefreshCw, ShieldCheck, Hourglass, XCircle,
} from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { api } from '../api';
import GoldButton from '../components/GoldButton';
import GoldProgress from '../components/GoldProgress';
import CardPaySheet from '../components/CardPaySheet';

const BENEFITS = [
  { icon: Bot, title: 'هوش مصنوعی بیشتر', text: 'سقف روزانه پرسش‌های هوش مصنوعی بالاتر از کاربران رایگان است.' },
  { icon: MessageSquare, title: 'کامنت‌گذار کانال', text: 'پلن مخصوص کامنت‌گذاری هوشمند در گروه گفت‌وگوی کانال.' },
  { icon: Layers, title: 'تمدید روی اعتبار فعلی', text: 'اگر اشتراک فعال داری، زمان جدید به انتهای آن اضافه می‌شود.' },
  { icon: Zap, title: 'فعال‌سازی سریع', text: 'با استارز بلافاصله؛ با کارت‌به‌کارت پس از تأیید رسید.' },
];

const STEPS = ['پلن را انتخاب کن', 'با استارز یا کارت‌به‌کارت پرداخت کن', 'اشتراک فعال می‌شود و در ربات اطلاع می‌گیری'];

const FAQ = [
  { q: 'اشتراک چه زمانی فعال می‌شود؟', a: 'پرداخت با استارز بلافاصله فعال می‌شود. در کارت‌به‌کارت، بعد از بررسی رسید توسط مدیر فعال می‌شود و در ربات برایت پیام می‌آید.' },
  { q: 'اگر پرداخت انجام شد ولی اشتراک فعال نشد؟', a: 'در ربات دستور /paysupport را بزن و شناسه سفارش یا تصویر رسید را بفرست.' },
  { q: 'خرید دوباره باعث سوختن زمان قبلی می‌شود؟', a: 'نه. مدت پلن جدید به انتهای اعتبار فعلی اضافه می‌شود.' },
];

const ORDER_STATUS = {
  pending: { label: 'در انتظار بررسی', icon: Hourglass, cls: 'text-amber-300' },
  approved: { label: 'تأیید شد', icon: CheckCircle2, cls: 'text-emerald-400' },
  rejected: { label: 'رد شد', icon: XCircle, cls: 'text-red-400' },
};

function describeLoadError(error) {
  const status = error?.response?.status;
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string' && detail) return detail;
  if (status) return `دریافت پلن‌ها ناموفق بود (کد ${status}).`;
  return 'ارتباط با سرور برقرار نشد؛ اینترنت را بررسی کن و دوباره تلاش کن.';
}

export default function Subscriptions({ user, apiBase = '' }) {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [card, setCard] = useState(null);
  const [cardOrders, setCardOrders] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [buying, setBuying] = useState(null);
  const [notice, setNotice] = useState(null);
  const [cardPlan, setCardPlan] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await api.get(`${apiBase}/api/v1/subscriptions/plans`);
      setPlans(Array.isArray(res.data?.plans) ? res.data.plans : []);
      setSubscription(res.data?.subscription || null);
      setCard(res.data?.card || null);
      setCardOrders(Array.isArray(res.data?.card_orders) ? res.data.card_orders : []);
      setIsAdmin(!!res.data?.is_admin);
    } catch (error) {
      setLoadError(describeLoadError(error));
    } finally {
      setLoading(false);
    }
  }, [apiBase, user?.id]);

  useEffect(() => { if (user?.id) load(); }, [user?.id, load]);

  const savePlan = async (plan) => {
    if (!editing || saving) return;
    try {
      setSaving(true);
      await api.put(`${apiBase}/api/v1/subscriptions/admin/plans/${plan.code}`, {
        title: editing.title,
        description: editing.description,
        price_stars: Number(editing.price_stars),
        price_toman: Number(editing.price_toman) || 0,
        duration_days: Number(editing.duration_days),
        is_active: !!editing.is_active,
      });
      setNotice('تنظیمات پلن ذخیره شد.');
      setEditing(null);
      await load();
    } catch (error) {
      setNotice(error.response?.data?.detail || 'ذخیره تنظیمات پلن ناموفق بود.');
    } finally {
      setSaving(false);
    }
  };

  const buy = async (plan) => {
    if (buying) return;
    let waitingForInvoiceClose = false;
    try {
      setBuying(plan.code);
      setNotice(null);
      const res = await api.post(`${apiBase}/api/v1/subscriptions/invoice`, {
        user_id: user.id,
        plan_code: plan.code,
      });
      const invoiceUrl = res.data?.invoice_url;
      if (!invoiceUrl || typeof WebApp.openInvoice !== 'function') {
        setNotice('فاکتور ساخته شد، اما بازکردن پرداخت فقط داخل نسخه پشتیبانی‌شده تلگرام ممکن است.');
        return;
      }
      waitingForInvoiceClose = true;
      WebApp.openInvoice(invoiceUrl, (status) => {
        setBuying(null);
        if (status === 'paid') {
          setNotice('پرداخت تأیید شد؛ وضعیت اشتراک در حال به‌روزرسانی است.');
          load();
        } else if (status === 'failed') {
          setNotice('پرداخت ناموفق بود. مبلغی بابت سفارش تأییدنشده از اشتراک شما فعال نمی‌شود.');
        } else if (status === 'cancelled') {
          setNotice('پرداخت لغو شد؛ هر زمان خواستی دوباره اقدام کن.');
        }
      });
    } catch (error) {
      setNotice(error.response?.data?.detail || 'ساخت فاکتور پرداخت ناموفق بود.');
    } finally {
      if (!waitingForInvoiceClose) setBuying(null);
    }
  };

  // Value tags: per-day price and the saving of long plans compared with the most expensive per-day plan.
  const planMeta = useMemo(() => {
    const perDay = (p) => (p.duration_days > 0 ? p.price_stars / p.duration_days : 0);
    const baseline = Math.max(0, ...plans.map(perDay));
    const bestValue = plans.length > 1 ? plans.reduce((a, b) => (perDay(b) < perDay(a) ? b : a)).code : null;
    return Object.fromEntries(plans.map((p) => {
      const saving = baseline > 0 ? Math.round((1 - perDay(p) / baseline) * 100) : 0;
      return [p.code, { perDay: perDay(p), saving, best: plans.length > 1 && p.code === bestValue && saving >= 5 }];
    }));
  }, [plans]);

  const visibleOrders = cardOrders.filter((o) => o.status === 'pending' || o.status === 'rejected').slice(0, 3);

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-8 space-y-4" dir="rtl">
      <div className="glass-card p-5 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl gold-gradient flex items-center justify-center">
            <Crown className="text-black" size={24} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">اشتراک‌های رویال</h2>
            <p className="text-xs text-gray-400 mt-1">خرید امن با Telegram Stars یا کارت‌به‌کارت</p>
          </div>
        </div>
      </div>

      {(notice || loadError) && (
        <div className="glass-card p-3 flex gap-2 items-start text-xs text-gray-200">
          <AlertCircle size={16} className="text-amber-300 shrink-0 mt-0.5" />
          <span className="flex-1 leading-6">{loadError || notice}</span>
          {loadError && (
            <button onClick={load} className="flex items-center gap-1 text-amber-300 shrink-0" aria-label="تلاش دوباره">
              <RefreshCw size={14} /> تلاش دوباره
            </button>
          )}
        </div>
      )}

      {subscription && (
        <div className="glass-card p-4 border border-amber-400/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <CheckCircle2 size={17} /> اشتراک فعال
            </div>
            <span className="text-[11px] text-gray-400 tabular-nums">{subscription.days_left} روز باقی‌مانده</span>
          </div>
          <p className="text-white text-sm">{subscription.plan_title}</p>
          <GoldProgress
            current={subscription.days_left}
            max={subscription.total_days || subscription.days_left || 1}
            height="h-2" label={`اعتبار تا ${new Date(subscription.expires_at).toLocaleDateString('fa-IR')}`}
          />
        </div>
      )}

      {visibleOrders.length > 0 && (
        <div className="glass-card p-4 space-y-2">
          <h3 className="text-xs font-bold text-white">رسیدهای کارت‌به‌کارت</h3>
          {visibleOrders.map((order) => {
            const meta = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
            const Icon = meta.icon;
            return (
              <div key={order.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-300">{order.plan_title}</span>
                <span className={`flex items-center gap-1 ${meta.cls}`}><Icon size={14} />{meta.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="text-center text-xs text-gray-500 py-10">در حال دریافت پلن‌ها...</div>
      ) : loadError ? null : plans.length === 0 ? (
        <div className="glass-card p-5 text-center text-sm text-gray-400">فعلاً پلن فعالی برای خرید ثبت نشده است.</div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan, index) => {
            const meta = planMeta[plan.code] || {};
            const cardPrice = Number(plan.card_price_toman || 0);
            const showCard = !!card && cardPrice > 0;
            return (
              <motion.div key={plan.code} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
                className="glass-card p-4 relative overflow-hidden"
                style={meta.best ? { borderColor: 'rgba(252, 246, 186, 0.55)' } : undefined}>
                {meta.best && (
                  <div className="absolute top-0 left-0 gold-gradient text-black text-[10px] font-black px-3 py-1 rounded-br-xl">
                    بهترین ارزش
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">{plan.title}</h3>
                    <p className="text-xs text-gray-400 mt-1 leading-6">{plan.description}</p>
                  </div>
                  <Sparkles size={19} className="text-amber-300 shrink-0" />
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-[10px] text-gray-300 rounded-full px-2.5 py-1 flex items-center gap-1" style={{ backgroundColor: '#18181f' }}>
                    <Clock3 size={11} />{plan.duration_days} روز
                  </span>
                  {meta.perDay > 0 && (
                    <span className="text-[10px] text-gray-300 rounded-full px-2.5 py-1 tabular-nums" style={{ backgroundColor: '#18181f' }}>
                      روزی {meta.perDay.toLocaleString('fa-IR', { maximumFractionDigits: 1 })} ⭐
                    </span>
                  )}
                  {meta.saving >= 5 && (
                    <span className="text-[10px] text-emerald-300 rounded-full px-2.5 py-1 tabular-nums" style={{ backgroundColor: 'rgba(16,185,129,0.12)' }}>
                      {meta.saving.toLocaleString('fa-IR')}٪ صرفه‌جویی
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 space-y-3">
                  <div className="flex items-end justify-between">
                    <div className="text-lg font-black gold-text tabular-nums">{Number(plan.price_stars).toLocaleString('fa-IR')} ⭐</div>
                    {showCard && (
                      <div className="text-xs text-gray-400 tabular-nums">یا {cardPrice.toLocaleString('fa-IR')} تومان</div>
                    )}
                  </div>
                  <div className={`grid gap-2 ${showCard ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <GoldButton fullWidth disabled={!!buying} loading={buying === plan.code} onClick={() => buy(plan)}>
                      <Star size={15} /> پرداخت با استارز
                    </GoldButton>
                    {showCard && (
                      <button
                        onClick={() => setCardPlan(plan)}
                        className="rounded-2xl px-4 py-3 text-sm font-bold text-amber-200 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                        style={{ border: '1px solid rgba(212,175,55,0.45)', backgroundColor: 'rgba(212,175,55,0.06)' }}
                      >
                        <CreditCard size={15} /> کارت‌به‌کارت
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-white px-1">مزایای اشتراک</h3>
        <div className="grid grid-cols-2 gap-3">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="glass-card p-3 space-y-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(212,175,55,0.1)' }}>
                <Icon size={18} className="text-amber-300" />
              </div>
              <div className="text-xs font-bold text-white">{title}</div>
              <p className="text-[10.5px] leading-5 text-gray-400">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">خرید چطور انجام می‌شود؟</h3>
        <ol className="space-y-3">
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-center gap-3 text-xs text-gray-300">
              <span className="w-6 h-6 shrink-0 rounded-full gold-gradient text-black text-[11px] font-black flex items-center justify-center">
                {(i + 1).toLocaleString('fa-IR')}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section className="glass-card divide-y divide-white/5">
        {FAQ.map((item, i) => (
          <div key={item.q}>
            <button
              className="w-full flex items-center justify-between gap-3 p-4 text-right"
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              aria-expanded={openFaq === i}
            >
              <span className="text-xs font-semibold text-white">{item.q}</span>
              <ChevronDown size={16} className={`text-amber-300 shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
              {openFaq === i && (
                <motion.p
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-4 text-[11px] leading-6 text-gray-400 overflow-hidden"
                >
                  {item.a}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        ))}
      </section>

      {isAdmin && (
        <section className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-amber-300">مدیریت قیمت و مدت اشتراک</h3>
          <p className="text-[11px] text-gray-500">این تنظیمات مستقیماً در دیتابیس ذخیره می‌شوند و برای همه کاربران اعمال خواهند شد. قیمت تومانی ۰ یعنی از نرخ هر استار در تنظیمات (در صورت وجود) محاسبه می‌شود.</p>
          {plans.map((plan) => (
            <div key={`admin-${plan.code}`} className="border-t border-white/10 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white font-semibold">{plan.title}</span>
                <button className="text-[11px] text-amber-300" onClick={() => setEditing({
                  code: plan.code, title: plan.title, description: plan.description || '',
                  price_stars: plan.price_stars, price_toman: plan.price_toman || 0,
                  duration_days: plan.duration_days, is_active: !!plan.is_active,
                })}>ویرایش</button>
              </div>
              {editing && editing.code === plan.code && (
                <div className="space-y-2">
                  <input className="w-full rounded-lg bg-black/30 border border-white/10 p-2 text-xs text-white" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="عنوان پلن" />
                  <textarea className="w-full rounded-lg bg-black/30 border border-white/10 p-2 text-xs text-white" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="توضیحات" rows={2} />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" min="1" max="1000000" className="rounded-lg bg-black/30 border border-white/10 p-2 text-xs text-white" value={editing.price_stars} onChange={(e) => setEditing({ ...editing, price_stars: e.target.value })} aria-label="قیمت به استارز" placeholder="استارز" />
                    <input type="number" min="0" className="rounded-lg bg-black/30 border border-white/10 p-2 text-xs text-white" value={editing.price_toman} onChange={(e) => setEditing({ ...editing, price_toman: e.target.value })} aria-label="قیمت به تومان" placeholder="تومان" />
                    <input type="number" min="1" max="3650" className="rounded-lg bg-black/30 border border-white/10 p-2 text-xs text-white" value={editing.duration_days} onChange={(e) => setEditing({ ...editing, duration_days: e.target.value })} aria-label="مدت به روز" placeholder="روز" />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-300">
                    <input type="checkbox" checked={!!editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> پلن فعال باشد
                  </label>
                  <div className="flex gap-2">
                    <GoldButton loading={saving} onClick={() => savePlan(plan)}>ذخیره</GoldButton>
                    <button className="text-xs text-gray-400 px-3" onClick={() => setEditing(null)}>انصراف</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      <p className="flex items-center justify-center gap-2 text-center text-[11px] leading-6 text-gray-400 pt-1">
        <ShieldCheck size={14} className="text-amber-300 shrink-0" />
        تمامی پرداخت‌ها به وسیله استارز و یا کارت به کارت امکان‌پذیر است
      </p>

      <CardPaySheet
        open={!!cardPlan}
        plan={cardPlan}
        card={card}
        user={user}
        apiBase={apiBase}
        onClose={() => setCardPlan(null)}
        onDone={(message) => { setCardPlan(null); setNotice(message); load(); }}
      />
    </div>
  );
}
