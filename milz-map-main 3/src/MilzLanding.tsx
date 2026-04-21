import React, { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, X, Plus, ShieldCheck, User as UserIcon, MapPin, Mail, Lock, Eye, EyeOff } from 'lucide-react';

type UserRole = 'admin' | 'user';
type AuthMode = 'login' | 'signup' | 'signin';

interface MilzLandingProps {
  authOpen: boolean;
  setAuthOpen: (open: boolean) => void;
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  selectedAuthRole: UserRole;
  setSelectedAuthRole: (role: UserRole) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  authError: string;
  authEmailSent: boolean;
  clearAuthEmailSent: () => void;
  handleEmailAuth: (e: React.FormEvent) => void | Promise<void>;
}

export default function MilzLanding({
  authOpen,
  setAuthOpen,
  authMode,
  setAuthMode,
  selectedAuthRole,
  setSelectedAuthRole,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  authError,
  authEmailSent,
  clearAuthEmailSent,
  handleEmailAuth,
}: MilzLandingProps) {
  const [lang, setLang] = useState<'jp' | 'en'>(() => {
    if (typeof window === 'undefined') return 'en';
    const saved = window.localStorage.getItem('milz_landing_lang');
    return saved === 'jp' ? 'jp' : 'en';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('milz_landing_lang', lang);
    }
  }, [lang]);

  const isJP = lang === 'jp';

  return (
    <div className="min-h-screen bg-white text-[var(--ink)] overflow-x-hidden">
      <div className="bg-black text-white overflow-hidden py-2.5 border-b border-black">
        <div className="marquee-track text-[11px] tracking-[0.35em] font-semibold">
          {Array.from({ length: 3 }).map((_, k) => (
            <div key={k} className="flex gap-10 pr-10 whitespace-nowrap">
              {[
                'ISSUE N°001',
                'FINDING THE UNKNOWN',
                'NEW YORK / TOKYO / KYOTO / SEOUL / HAWAII',
                'A CURATED SELECTION',
                '知られていないものを、編む',
                'MILZ SELECTS',
              ].map((txt, i) => (
                <span key={i}>★ {txt}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-black">
        <div className="max-w-[1500px] mx-auto px-5 md:px-8 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="font-display text-[44px] leading-none">MILZ</div>
            <span className="label hidden md:inline">CURATED · 2025</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 font-cond uppercase text-[14px] tracking-[0.04em]">
            <span className="cursor-default">Index</span>
            <span className="cursor-default">Cities</span>
            <span className="cursor-default">Selection</span>
            <span className="cursor-default">About</span>
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={() => setLang(isJP ? 'en' : 'jp')} className="label-ink hover:opacity-60 transition">
              {isJP ? 'EN' : 'JP'}
            </button>
            <button className="btn" onClick={() => setAuthOpen(true)}>
              {isJP ? 'はじめる' : 'Enter'} <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      <section className="relative border-b border-black">
        <div className="max-w-[1500px] mx-auto px-5 md:px-8 pt-14 pb-8">
          <div className="flex items-center justify-between mb-8 gap-6">
            <div className="label-ink">ISSUE N°001 — MMXXV</div>
            <div className="hidden md:block flex-1 h-px bg-black" />
            <div className="label-ink">CURATING THE UNKNOWN</div>
          </div>

          <h1 className="font-display text-black tracking-[-0.01em] leading-[0.82] text-[22vw] md:text-[19vw] fade-up">
            {isJP ? (
              <>FINDING<br />THE <span className="italic">UNKNOWN.</span></>
            ) : (
              <>FINDING<br />THE <span className="italic">UNKNOWN.</span></>
            )}
          </h1>

          <div className="grid grid-cols-12 gap-6 md:gap-10 mt-10 pt-8 border-t-2 border-black">
            <div className="col-span-12 md:col-span-5">
              <div className="label mb-3">§ COVER STORY</div>
              <div className="font-cond uppercase text-[32px] md:text-[42px] leading-[1.02] font-black">
                {isJP ? '知られていないものを、編む。' : 'Curating the Unknown.'}
              </div>
            </div>
            <div className="col-span-12 md:col-span-4">
              <p className="text-[14px] md:text-[15px] leading-[1.9] text-[var(--gray-700)]">
                {isJP
                  ? 'メジャーな情報はAIが答えてくれる時代。MILZ が拾うのは、その先にある、まだ名前の知られていない場所、サービス、そして人。空気まで感じとれるディテールだけを、静かに編集します。'
                  : 'AI already covers the mainstream. MILZ looks further — toward the distinctive, the underground, the still-unnamed places, services, and people. Only the details that let you feel the atmosphere.'}
              </p>
            </div>
            <div className="col-span-12 md:col-span-3 flex md:justify-end items-end">
              <div className="flex flex-col gap-3 w-full md:w-auto">
                <button className="btn justify-center" onClick={() => setAuthOpen(true)}>
                  {isJP ? 'MILZを開く' : 'Open MILZ'} <ArrowUpRight size={14} />
                </button>
                <button className="btn-ghost justify-center" onClick={() => setAuthOpen(true)}>
                  {isJP ? 'ログイン' : 'Sign in'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-black overflow-hidden">
        <div className="max-w-[1500px] mx-auto">
          <div className="grid grid-cols-5 divide-x divide-black">
            {[
              { c: 'NEW YORK', n: '01', j: 'ニューヨーク' },
              { c: 'TOKYO', n: '02', j: '東京' },
              { c: 'KYOTO', n: '03', j: '京都' },
              { c: 'SEOUL', n: '04', j: 'ソウル' },
              { c: 'HAWAII', n: '05', j: 'ハワイ' },
            ].map((city) => (
              <div key={city.c} className="group relative overflow-hidden">
                <div className="p-3 md:p-5 flex items-center justify-between">
                  <span className="label-ink">N°{city.n}</span>
                  <ArrowUpRight size={13} className="-translate-y-0 group-hover:translate-x-1 group-hover:-translate-y-1 transition" />
                </div>
                <div className="px-3 md:px-5 pb-6 md:pb-10">
                  <div className="font-display text-[28px] md:text-[58px] leading-[0.9] transition group-hover:-translate-y-1">
                    {city.c}
                  </div>
                  <div className="mt-2 label">{city.j}</div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-0 bg-black group-hover:h-1.5 transition-all duration-300" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-black text-white border-b border-black">
        <div className="max-w-[1500px] mx-auto px-5 md:px-8 py-24 md:py-40">
          <div className="label mb-10" style={{ color: 'var(--gray-500)' }}>§ 01 — EDITOR'S NOTE</div>
          <div className="font-display text-[13vw] md:text-[9vw] leading-[0.92] tracking-[-0.01em]">
            {isJP ? (
              <>
                AIが答えるのは、<br />
                メジャーだけ。<br />
                MILZ は<span className="italic">その先を</span>編む。
              </>
            ) : (
              <>
                AI COVERS<br />
                THE MAINSTREAM.<br />
                MILZ <span className="italic">GOES</span> FURTHER.
              </>
            )}
          </div>
          <div className="mt-16 flex justify-between items-center border-t border-white/30 pt-6">
            <div className="label" style={{ color: 'var(--gray-500)' }}>— MILZ MMXXV</div>
            <div className="font-cond uppercase text-[14px] tracking-wider">A SMALL CURATION</div>
          </div>
        </div>
      </section>

      <section className="border-b border-black">
        <div className="max-w-[1500px] mx-auto px-5 md:px-8 py-20 md:py-28">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-6">
            <div>
              <div className="label mb-4">§ 02 — PRINCIPLES</div>
              <h2 className="font-display text-[16vw] md:text-[10vw] leading-[0.85]">
                {isJP ? '3つの、やくそく。' : 'THREE RULES.'}
              </h2>
            </div>
            <div className="max-w-sm text-[14px] leading-[1.9] text-[var(--gray-700)]">
              {isJP
                ? 'AIが語れる「正解」ではなく、まだ知られていないものを編む。MILZ は、量ではなく基準で答えます。'
                : 'Not the answers AI already gives. MILZ edits toward what is still unknown — replying with a standard, not a list.'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 border-t-2 border-black">
            {[
              {
                n: '01',
                t: isJP ? '未知' : 'UNKNOWN',
                s: isJP ? 'を、編む。' : 'FIRST.',
                d: isJP
                  ? 'メジャーはAIに任せる。MILZ が追うのは、まだ名前の知られていない場所、人、サービス。そこにしか残らない空気を、編集で残す。'
                  : 'AI already covers the mainstream. MILZ follows what is still unnamed — the places, people, and services.',
              },
              {
                n: '02',
                t: isJP ? '空気' : 'ATMOSPHERE',
                s: isJP ? 'の、細部。' : 'IN DETAIL.',
                d: isJP
                  ? '評点ではなく、ディテール。光、音、間、距離感。訪れる前から空気を感じられる情報だけを、ひとつずつ手渡しで。'
                  : 'Not ratings. Details. Light, sound, pace, distance. Only the notes that let you feel the atmosphere before you arrive — handed over one by one.',
              },
              {
                n: '03',
                t: isJP ? '基準' : 'ONE',
                s: isJP ? 'は、ひとつ。' : 'STANDARD.',
                d: isJP
                  ? 'ジャンルは関係ない。食、コーヒー、宿、工芸、眺め、人。分野ではなく、ひとつの線引きだけで答える。'
                  : 'Category is irrelevant. Food, coffee, stays, craft, views, people. One line is drawn — and every answer comes from it.',
              },
            ].map((p, i) => (
              <div
                key={p.n}
                className={`p-8 md:p-10 ${i > 0 ? 'md:border-l border-black' : ''} ${i < 2 ? 'border-b md:border-b-0 border-black' : ''} group hover:bg-black hover:text-white transition-colors duration-300`}
              >
                <div className="flex items-baseline justify-between mb-10">
                  <span className="font-display text-[80px] leading-none">{p.n}</span>
                  <span className="label group-hover:text-white/50">PRINCIPLE</span>
                </div>
                <div className="font-display text-[54px] md:text-[64px] leading-[0.9]">
                  {p.t}<br /><span className="italic">{p.s}</span>
                </div>
                <p className="mt-8 text-[14px] leading-[1.9] text-[var(--gray-700)] group-hover:text-white/75">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-black">
        <div className="max-w-[1500px] mx-auto px-5 md:px-8 py-20 md:py-28">
          <div className="label mb-5">§ 03 — THE APP</div>
          <div className="grid grid-cols-12 gap-8 items-start">
            <div className="col-span-12 md:col-span-7">
              <h2 className="font-display text-[18vw] md:text-[12vw] leading-[0.85]">
                MAP.<br />SPOTS.<br /><span className="italic">MILZ.</span>
              </h2>
              <div className="mt-10 border-t-2 border-black pt-6 max-w-lg">
                <p className="text-[15px] leading-[1.9] text-[var(--gray-700)]">
                  {isJP
                    ? 'マップと編集のあいだにある、静かなガイド。AIが答える表通りではなく、その奥にある未知を、空気ごと編む。'
                    : 'A quiet guide between a map and a magazine. Not the main street AI already answers — the unknown behind it, edited with its atmosphere intact.'}
                </p>
                <div className="mt-8">
                  <button className="btn" onClick={() => setAuthOpen(true)}>
                    {isJP ? 'MILZを開く' : 'Open MILZ'} <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>

              <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-0 border-t-2 border-black">
                {[
                  { k: 'CITIES', v: '05' },
                  { k: 'CATEGORIES', v: 'UNIQUE' },
                  { k: 'LANGUAGE', v: 'JP/EN' },
                  { k: 'STANDARD', v: 'ONE' },
                ].map((s, i) => (
                  <div key={s.k} className={`py-5 px-4 ${i !== 0 ? 'md:border-l border-black' : ''} ${i > 0 && i % 2 === 1 ? 'border-l border-black md:border-l' : ''}`}>
                    <div className="label mb-2">{s.k}</div>
                    <div className="font-display text-[40px] md:text-[46px] leading-none">{s.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-12 md:col-span-5 flex justify-center md:justify-end">
              <div className="relative">
                <div className="absolute -top-6 -left-6 label-ink hidden md:block">FIG. 001</div>
                <div className="w-[300px] h-[600px] rounded-[42px] bg-black p-[10px] shadow-[0_40px_90px_-25px_rgba(0,0,0,0.45)]">
                  <div className="w-full h-full rounded-[34px] bg-white overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center px-5 pt-5 pb-4 border-b border-black">
                      <div className="font-display text-[26px] leading-none">MILZ</div>
                      <div className="label">TOKYO</div>
                    </div>
                    <div className="px-4 py-3 flex gap-2 overflow-hidden">
                      {['TOKYO', 'KYOTO', 'NY', 'SEOUL', 'HAWAII'].map((c, i) => (
                        <div key={c} className={`chip ${i === 0 ? 'chip-active' : ''}`} style={{ fontSize: '9px', padding: '5px 10px' }}>
                          {c}
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 bg-[var(--gray-50)] mx-4 relative overflow-hidden border-t border-black">
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage:
                            'linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)',
                          backgroundSize: '28px 28px',
                        }}
                      />
                      {[
                        { l: '28%', t: '32%' },
                        { l: '62%', t: '48%' },
                        { l: '42%', t: '66%' },
                        { l: '76%', t: '22%' },
                      ].map((p, i) => (
                        <div
                          key={i}
                          className="absolute w-3.5 h-3.5 rounded-full bg-black border-2 border-white"
                          style={{ left: p.l, top: p.t, transform: 'translate(-50%, -50%)' }}
                        />
                      ))}
                      <div className="absolute bottom-3 left-3 right-3 bg-white border border-black p-3">
                        <div className="label mb-1">DETAILS</div>
                        <div className="font-display text-[22px] leading-none">FEEL THE ATMOSPHERE</div>
                      </div>
                    </div>
                    <div className="flex justify-around items-center py-3 px-2 border-t border-black mt-3">
                      {['MAP', 'SPOTS', 'AI', 'PROFILE'].map((l, i) => (
                        <div
                          key={l}
                          className={`text-[10px] tracking-[0.2em] font-bold px-3 py-1.5 rounded-full ${
                            i === 0 ? 'bg-black text-white' : 'text-[var(--gray-500)]'
                          }`}
                        >
                          {l}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-b border-black">
        <div className="max-w-[1500px] mx-auto px-5 md:px-8 py-20 md:py-28 text-center">
          <div className="label mb-8">§ 04 — JOIN</div>
          <div className="font-display text-[40vw] md:text-[30vw] leading-[0.78] tracking-[-0.03em]">MILZ</div>
          <div className="mt-6 text-center font-cond uppercase tracking-[0.08em] text-[13px] text-[var(--gray-700)]">
            {isJP ? 'Curating the Unknown.' : 'Curating the Unknown.'}
          </div>
          <div className="mt-12 flex flex-wrap gap-4 justify-center items-center">
            <button className="btn text-[14px]" onClick={() => setAuthOpen(true)}>
              {isJP ? 'MILZをはじめる' : 'Start with MILZ'} <ArrowRight size={16} />
            </button>
            <button className="btn-ghost text-[14px]" onClick={() => setAuthOpen(true)}>
              {isJP ? 'ログイン' : 'Sign in'}
            </button>
          </div>
        </div>
      </section>

      <footer className="bg-black text-white">
        <div className="max-w-[1500px] mx-auto px-5 md:px-8 py-14">
          <div className="grid md:grid-cols-4 gap-10">
            <div className="md:col-span-2">
              <div className="font-display text-[64px] leading-none">MILZ</div>
              <div className="label mt-4" style={{ color: 'var(--gray-500)' }}>A CURATED GUIDE · MMXXV</div>
            </div>
            <div>
              <div className="label mb-4" style={{ color: 'var(--gray-500)' }}>CITIES</div>
              <div className="font-cond uppercase text-[16px] leading-[2]">
                <div>New York</div>
                <div>Tokyo</div>
                <div>Kyoto</div>
                <div>Seoul</div>
                <div>Hawaii</div>
              </div>
            </div>
            <div>
              <div className="label mb-4" style={{ color: 'var(--gray-500)' }}>GUIDE</div>
              <div className="font-cond uppercase text-[16px] leading-[2]">
                <div>Selection</div>
                <div>Unknown</div>
                <div>Atmosphere</div>
                <div>JP / EN</div>
              </div>
            </div>
          </div>
          <div className="mt-14 pt-6 border-t border-white/20 flex justify-between items-center flex-wrap gap-3">
            <div className="label" style={{ color: 'var(--gray-500)' }}>© MMXXV MILZ</div>
            <div className="label" style={{ color: 'var(--gray-500)' }}>— FINDING THE UNKNOWN</div>
          </div>
        </div>
      </footer>

      {authOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setAuthOpen(false)}>
          <div className="bg-white w-full max-w-md relative border-2 border-black fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-4 border-b-2 border-black">
              <div className="label-ink">MILZ · ISSUE 001</div>
              <button className="w-8 h-8 flex items-center justify-center hover:bg-black hover:text-white transition" onClick={() => setAuthOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="p-8 md:p-10 space-y-8">
              {authEmailSent && authMode === 'signup' ? (
                <>
                  <div>
                    <div className="font-display text-[56px] leading-[0.9] mb-3">
                      {isJP ? 'SENT.' : 'SENT.'}
                    </div>
                    <div className="text-[15px] leading-[1.9] text-[var(--gray-700)]">
                      {isJP
                        ? '認証メールを送信しました。メール内のリンクから登録を完了してください。'
                        : 'A confirmation email has been sent. Complete your signup from the link in your inbox.'}
                    </div>
                  </div>

                  <div className="border border-[var(--gray-200)] rounded-[24px] p-5 bg-[var(--gray-100)] text-[13px] text-[var(--gray-600)]">
                    <div className="label mb-2">{isJP ? '送信先' : 'Sent to'}</div>
                    <div className="text-[16px] text-black break-all">{email}</div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <button className="btn w-full justify-center" onClick={() => { clearAuthEmailSent(); setAuthMode('signin'); }}>
                      {isJP ? 'ログイン画面へ' : 'Go to sign in'}
                      <ArrowRight size={14} />
                    </button>
                    <button className="text-[12px] text-[var(--gray-500)] hover:text-black inline-flex items-center justify-center gap-1.5" onClick={() => clearAuthEmailSent()}>
                      {isJP ? '別のメールアドレスで登録する' : 'Use a different email'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="font-display text-[56px] leading-[0.9] mb-2">
                      {authMode === 'signin'
                        ? (isJP ? 'おかえり。' : 'WELCOME BACK.')
                        : (isJP ? 'はじめまして。' : 'HELLO.')}
                    </div>
                  </div>

                  <div className="flex border border-black rounded-full overflow-hidden text-[11px] font-bold tracking-[0.18em] uppercase">
                    <button
                      type="button"
                      onClick={() => setSelectedAuthRole('user')}
                      className={`flex-1 py-3 ${selectedAuthRole === 'user' ? 'bg-black text-white' : 'bg-white text-black'}`}
                    >
                      <span className="inline-flex items-center justify-center gap-2"><UserIcon size={14} /> User</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAuthRole('admin')}
                      className={`flex-1 py-3 ${selectedAuthRole === 'admin' ? 'bg-black text-white' : 'bg-white text-black'}`}
                    >
                      <span className="inline-flex items-center justify-center gap-2"><ShieldCheck size={14} /> Admin</span>
                    </button>
                  </div>

                  <form onSubmit={handleEmailAuth} className="space-y-6">
                    <div>
                      <label className="label block mb-1">{isJP ? 'メール' : 'Email'}</label>
                      <div className="relative">
                        <Mail className="absolute left-0 top-1/2 -translate-y-1/2 text-[var(--gray-500)]" size={18} />
                        <input className="input pl-7" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                      </div>
                    </div>
                    <div>
                      <label className="label block mb-1">{isJP ? 'パスワード' : 'Password'}</label>
                      <div className="relative">
                        <Lock className="absolute left-0 top-1/2 -translate-y-1/2 text-[var(--gray-500)]" size={18} />
                        <input className="input pl-7 pr-8" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                        <button type="button" className="absolute right-0 top-1/2 -translate-y-1/2 text-[var(--gray-500)] hover:text-black" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    {authError && <div className="text-xs text-red-700">{authError}</div>}
                    <button className="btn w-full justify-center">
                      {authMode === 'signin' ? (isJP ? 'ログイン' : 'SIGN IN') : (isJP ? '登録する' : 'CREATE ACCOUNT')}
                      <ArrowRight size={14} />
                    </button>
                  </form>

                  <div className="pt-2 border-t border-[var(--gray-200)] text-center">
                    <button className="text-[12px] text-[var(--gray-500)] hover:text-black inline-flex items-center gap-1.5" onClick={() => { clearAuthEmailSent(); setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); }}>
                      {authMode === 'signin'
                        ? <>{isJP ? '新しく登録する' : 'Create an account'} <Plus size={12} /></>
                        : <>{isJP ? 'ログインに戻る' : 'Back to sign in'} <ArrowRight size={12} /></>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
