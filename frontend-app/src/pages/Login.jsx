/**
 * Login.jsx — Dual-Theme Glassmorphism Authentication Interface
 *
 * Design System:
 *   - True Dual-Theme: Every element has explicit Light and dark: variants.
 *   - Interactive Parallax: Three luminous orbs track mouse movement with
 *     varying speeds and sizes, creating a living depth effect.
 *   - Glassmorphism: Heavy backdrop-blur-3xl with translucent containers,
 *     edge glare highlights, and frosted input fields.
 *   - Micro-interactions: Icon color transitions on focus, shimmer button
 *     effect, smooth error slide-in via max-height transition.
 *   - Strict Constraint: Zero public registration or password recovery links.
 *
 * @module pages/Login
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore.js';
import { httpClient } from '../services/httpClient.js';
import { Leaf, Lock, User, Loader2, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Interactive Parallax Background State
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const rafRef = useRef(null);

  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  // Mouse tracking with requestAnimationFrame for buttery-smooth performance
  const handleMouseMove = useCallback((e) => {
    if (rafRef.current) return; // throttle to 1 update per frame
    rafRef.current = requestAnimationFrame(() => {
      if (!containerRef.current) { rafRef.current = null; return; }
      const { clientWidth, clientHeight } = containerRef.current;
      const x = (e.clientX / clientWidth - 0.5) * 2;  // -1 to 1
      const y = (e.clientY / clientHeight - 0.5) * 2;  // -1 to 1
      setMousePos({ x, y });
      rafRef.current = null;
    });
  }, []);

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Masukkan username dan password Anda.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await httpClient.login(username, password);
      if (response.success && response.data) {
        login(response.data.token, response.data.user);
        navigate('/', { replace: true });
      } else {
        setError(response.error || 'Kredensial tidak valid');
      }
    } catch {
      setError('Koneksi gagal. Pastikan backend aktif dan terjangkau.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans
                 bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/40
                 dark:bg-none dark:bg-[#020817]"
    >

      {/* ─── Interactive Reactive Background Orbs ─── */}
      {/* Orb 1: Emerald — large, slow-follow (inverted axis for depth) */}
      <div
        className="absolute w-[700px] h-[700px] rounded-full blur-[180px] pointer-events-none
                   transition-transform duration-[1200ms] ease-out
                   bg-emerald-300/40 dark:bg-emerald-500/25"
        style={{
          transform: `translate(calc(-50% + ${mousePos.x * -50}px), calc(-50% + ${mousePos.y * -50}px))`,
          top: '25%', left: '15%',
        }}
      />
      {/* Orb 2: Teal — medium, fast-follow */}
      <div
        className="absolute w-[550px] h-[550px] rounded-full blur-[150px] pointer-events-none
                   transition-transform duration-700 ease-out
                   bg-teal-300/35 dark:bg-teal-500/25"
        style={{
          transform: `translate(calc(-50% + ${mousePos.x * 70}px), calc(-50% + ${mousePos.y * 70}px))`,
          bottom: '5%', right: '5%',
        }}
      />
      {/* Orb 3: Green — pulsing ambient center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[900px] h-[900px] rounded-full blur-[200px] animate-pulse pointer-events-none
                      bg-green-200/30 dark:bg-green-900/30" />

      {/* Noise + Grid texture overlays */}
      <div className="absolute inset-0 opacity-[0.15] dark:opacity-[0.08] mix-blend-overlay pointer-events-none
                      bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      <div className="absolute inset-0 pointer-events-none
                      bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)]
                      dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)]
                      bg-[size:56px_56px]
                      [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />

      <div className="w-full max-w-md relative z-10 px-6">

        {/* ─── Glass Container ─── */}
        <div className="relative overflow-hidden rounded-[2rem]
                        bg-white/70 dark:bg-[#0f172a]/60
                        backdrop-blur-3xl
                        border border-white/60 dark:border-slate-700/50
                        shadow-[0_8px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.5)]">

          {/* Top edge glare */}
          <div className="absolute top-0 inset-x-0 h-[1px]
                          bg-gradient-to-r from-transparent via-emerald-400/40 dark:via-emerald-400/25 to-transparent" />

          {/* Header */}
          <div className="pt-12 pb-8 px-8 text-center">
            {/* Icon badge with hover glow */}
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl
                            flex items-center justify-center mb-6
                            shadow-lg shadow-emerald-500/30 dark:shadow-emerald-500/20
                            relative group overflow-hidden">
              {/* Swipe glare on hover */}
              <div className="absolute inset-0 bg-white/25 blur-md
                              translate-y-full group-hover:-translate-y-full
                              transition-transform duration-700 ease-in-out" />
              <Leaf className="text-white w-8 h-8 relative z-10 drop-shadow" />
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight mb-2 flex items-center justify-center gap-2
                           text-slate-800 dark:text-white">
              HydroTect
              <ShieldCheck className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
            </h1>
            <p className="text-sm font-semibold tracking-wide uppercase
                          text-slate-500 dark:text-slate-400">
              Smart Agriculture Analytics
            </p>
          </div>

          {/* Form */}
          <div className="px-8 pb-12">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Error Banner — smooth slide in/out */}
              <div className={`overflow-hidden transition-all duration-300 ease-in-out
                              ${error ? 'max-h-24 opacity-100 mb-2' : 'max-h-0 opacity-0'}`}>
                <div className="p-3.5 rounded-xl flex items-center gap-2.5 text-sm font-semibold
                                bg-red-100/80 dark:bg-red-500/10
                                border border-red-300/50 dark:border-red-500/25
                                text-red-700 dark:text-red-400
                                backdrop-blur-md">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest pl-1
                                  text-slate-500 dark:text-slate-400">
                  Operator ID
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-4 w-4 transition-colors duration-300
                                     text-slate-400 dark:text-slate-500
                                     group-focus-within:text-emerald-500 dark:group-focus-within:text-emerald-400" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none
                               transition-all duration-300 disabled:opacity-50
                               bg-slate-100/60 dark:bg-slate-900/50
                               border border-slate-200/80 dark:border-slate-700/50
                               text-slate-900 dark:text-white
                               placeholder-slate-400 dark:placeholder-slate-600
                               focus:ring-2 focus:ring-emerald-500/40 dark:focus:ring-emerald-500/30
                               focus:border-emerald-400/50 dark:focus:border-emerald-500/40
                               focus:bg-white/80 dark:focus:bg-slate-800/60"
                    placeholder="admin"
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest pl-1
                                  text-slate-500 dark:text-slate-400">
                  Passcode
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 transition-colors duration-300
                                     text-slate-400 dark:text-slate-500
                                     group-focus-within:text-emerald-500 dark:group-focus-within:text-emerald-400" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none
                               transition-all duration-300 disabled:opacity-50
                               bg-slate-100/60 dark:bg-slate-900/50
                               border border-slate-200/80 dark:border-slate-700/50
                               text-slate-900 dark:text-white
                               placeholder-slate-400 dark:placeholder-slate-600
                               focus:ring-2 focus:ring-emerald-500/40 dark:focus:ring-emerald-500/30
                               focus:border-emerald-400/50 dark:focus:border-emerald-500/40
                               focus:bg-white/80 dark:focus:bg-slate-800/60"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="relative w-full overflow-hidden flex items-center justify-center gap-2
                           py-4 px-4 mt-6 rounded-2xl text-sm font-bold
                           bg-emerald-500 text-white
                           transition-all duration-300
                           hover:bg-emerald-400 hover:-translate-y-0.5
                           hover:shadow-[0_0_35px_rgba(16,185,129,0.45)]
                           active:translate-y-0 active:shadow-[0_0_15px_rgba(16,185,129,0.3)]
                           focus:ring-4 focus:ring-emerald-500/30
                           disabled:opacity-60 disabled:cursor-not-allowed
                           disabled:hover:shadow-none disabled:hover:translate-y-0
                           group"
              >
                {/* Shimmer overlay */}
                <div className="absolute inset-0 -translate-x-full
                                bg-gradient-to-r from-transparent via-white/25 to-transparent
                                group-hover:animate-shimmer pointer-events-none" />

                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Authorize Access'
                )}
              </button>
            </form>

            {/* Footer divider + restriction notice */}
            <div className="mt-10 pt-6 relative
                            border-t border-slate-200/60 dark:border-slate-700/50">
              <div className="flex justify-center">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-center leading-relaxed
                                 text-slate-400 dark:text-slate-500">
                  Dashboard Operasional Rahasia<br/>
                  <span className="text-slate-300 dark:text-slate-600">
                    Akses Khusus Personel Berwenang
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
