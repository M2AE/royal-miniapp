import React, { useCallback, useEffect, useState } from 'react';
import { Sparkles, Save } from 'lucide-react';
import { api } from '../api';
import GoldButton from '../components/GoldButton';

export default function AIPrompts({ user, apiBase = '' }) {
  const [prompts, setPrompts] = useState([]);
  const [template, setTemplate] = useState('balanced');
  const [tone, setTone] = useState('balanced');
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    try {
      const r = await api.get(`${apiBase}/api/v1/ai/prompts`);
      setPrompts(r.data?.prompts || []);
      setTemplate(r.data?.preference?.template_code || 'balanced');
      setTone(r.data?.preference?.tone || 'balanced');
      setCustomPrompt(r.data?.preference?.custom_prompt || '');
    } catch (e) { setNotice(e.response?.data?.detail || 'دریافت تنظیمات ناموفق بود.'); }
    finally { setLoading(false); }
  }, [apiBase, user?.id]);
  useEffect(() => { if (user?.id) load(); }, [user?.id, load]);
  const save = async () => {
    try {
      setSaving(true);
      await api.put(`${apiBase}/api/v1/ai/preferences`, { template_code: template || null, tone, custom_prompt: customPrompt });
      setNotice('تنظیمات برای گفتگوهای هوش مصنوعی ذخیره شد.');
    } catch (e) { setNotice(e.response?.data?.detail || 'ذخیره تنظیمات ناموفق بود.'); }
    finally { setSaving(false); }
  };
  return <main className="max-w-md mx-auto px-4 pt-6 space-y-4 text-white" dir="rtl">
    <section className="glass-card p-5 space-y-2"><div className="flex items-center gap-3"><Sparkles className="text-amber-300"/><h2 className="font-bold">شخصی‌سازی هوش مصنوعی</h2></div><p className="text-xs text-gray-400 leading-6">قالب و لحن در مسیرهای متصل به موتور مشترک هوش مصنوعی اعمال می‌شوند.</p></section>
    {notice && <div className="glass-card p-3 text-xs text-gray-300">{notice}</div>}
    {loading ? <p className="text-center text-xs text-gray-500 py-8">در حال دریافت...</p> : <section className="glass-card p-4 space-y-3">
      <label className="text-xs text-gray-300">قالب پاسخ</label>
      <select value={template} onChange={e=>setTemplate(e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/10 p-3 text-sm text-white"><option value="">بدون قالب</option>{prompts.map(p=><option key={p.code} value={p.code}>{p.title}</option>)}</select>
      <label className="text-xs text-gray-300">لحن</label>
      <select value={tone} onChange={e=>setTone(e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/10 p-3 text-sm text-white"><option value="balanced">متعادل</option><option value="formal">رسمی</option><option value="friendly">دوستانه</option><option value="concise">کوتاه</option><option value="detailed">مفصل</option></select>
      <label className="text-xs text-gray-300">دستور اختصاصی</label>
      <textarea rows={4} maxLength={1200} value={customPrompt} onChange={e=>setCustomPrompt(e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/10 p-3 text-sm text-white" placeholder="مثلاً پاسخ را با مثال و مرحله‌به‌مرحله بنویس..."/>
      <div className="text-left text-[10px] text-gray-500">{customPrompt.length}/1200</div>
      <GoldButton loading={saving} onClick={save}><Save size={15}/> ذخیره تنظیمات</GoldButton>
    </section>}
  </main>;
}
