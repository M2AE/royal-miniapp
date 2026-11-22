import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

const STATUS_LABELS = { pending: 'در انتظار', paid: 'پرداخت‌شده', failed: 'ناموفق', refunded: 'بازپرداخت‌شده' };

function Stat({ label, value }) {
  return (
    <div className="glass-card p-3 text-center">
      <div className="text-lg font-black gold-text">{value}</div>
      <div className="text-[11px] text-gray-400 mt-1">{label}</div>
    </div>
  );
}

export default function Admin({ apiBase = '' }) {
  const [report, setReport] = useState(null);
  const [orders, setOrders] = useState([]);
  const [usage, setUsage] = useState(null);
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const base = `${apiBase}/api/v1/admin`;
      const [r, o, u, s] = await Promise.all([
        api.get(`${base}/stars-report`),
        api.get(`${base}/orders`, { params: { limit: 20 } }),
        api.get(`${base}/ai-usage`, { params: { days: 7 } }),
        api.get(`${base}/settings`),
      ]);
      setReport(r.data);
      setOrders(Array.isArray(o.data?.orders) ? o.data.orders : []);
      setUsage(u.data);
      setSettings(s.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'دریافت اطلاعات مدیریت ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (key, current) => {
    if (busyKey) return;
    try {
      setBusyKey(key);
      await api.put(`${apiBase}/api/v1/admin/settings/${key}`, { value: current === '0' ? '1' : '0' });
      await load();
    } catch (e) {
      setError(e.response?.data?.detail || 'ذخیره تنظیم ناموفق بود.');
    } finally {
      setBusyKey(null);
    }
  };

  if (loading && !report) {
    return <div className="p-6 text-center text-gray-400 text-sm">در حال بارگذاری…</div>;
  }

  const stored = settings?.settings || {};
  const switches = ['ai_enabled', 'commenter_enabled'];

  return (
    <main className="px-4 pt-6 pb-8 space-y-5 text-white" dir="rtl">
      <h1 className="text-xl font-black gold-text">پنل مدیریت</h1>
      {error && <div className="glass-card p-3 text-xs text-red-300">{error}</div>}

      {report && (
        <section className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Stars ثبت‌شده در ربات" value={report.recorded_stars} />
            <Stat label="سفارش پرداخت‌شده" value={report.paid_orders} />
            <Stat label="اشتراک فعال" value={report.active_subscriptions} />
            <Stat label="بازپرداخت‌شده (Stars)" value={report.refunded_stars} />
          </div>
          <p className="text-[11px] text-gray-500 leading-5">{report.note}</p>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-gray-200">آخرین سفارش‌ها</h2>
        {orders.length === 0 && <div className="text-xs text-gray-500">سفارشی ثبت نشده است.</div>}
        {orders.map((o) => (
          <div key={o.id} className="glass-card p-3 text-xs flex justify-between gap-3">
            <div>
              <div className="font-semibold">{o.plan_title}</div>
              <div className="text-gray-500">کاربر {o.user_id}</div>
            </div>
            <div className="text-left">
              <div>{o.amount_stars} ⭐</div>
              <div className="text-gray-400">{STATUS_LABELS[o.status] || o.status}</div>
            </div>
          </div>
        ))}
      </section>

      {usage && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-200">مصرف هوش مصنوعی (۷ روز)</h2>
          <div className="text-xs text-gray-400">درخواست‌های ناموفق: {usage.failed_requests}</div>
          {usage.users.slice(0, 10).map((u) => (
            <div key={String(u.user_id)} className="glass-card p-3 text-xs flex justify-between">
              <span>کاربر {u.user_id ?? '—'}</span>
              <span>{u.requests} درخواست · {u.prompt_tokens + u.completion_tokens} توکن (تقریبی)</span>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-gray-200">کلیدهای قابلیت</h2>
        {switches.map((key) => {
          const value = stored[key] ?? '1';
          return (
            <button
              key={key}
              disabled={busyKey === key}
              onClick={() => toggle(key, value)}
              className="glass-card w-full p-3 text-xs flex justify-between items-center"
            >
              <span>{settings?.available?.[key] || key}</span>
              <span className={value === '0' ? 'text-red-300' : 'text-emerald-300'}>
                {value === '0' ? 'غیرفعال' : 'فعال'}
              </span>
            </button>
          );
        })}
        {settings?.ai_provider && (
          <div className="text-[11px] text-gray-500 leading-5">
            ارائه‌دهنده: {settings.ai_provider.provider} · مدل: {settings.ai_provider.model || 'تنظیم نشده'} ·
            کلید: {settings.ai_provider.key_set ? 'تنظیم شده' : 'تنظیم نشده'}
          </div>
        )}
      </section>
    </main>
  );
}
