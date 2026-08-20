import React from 'react';
import { Settings, ShieldCheck, Lock, Moon, Sun, Cloud, Sparkles } from 'lucide-react';
import { useSpotOn } from '../context/SpotOnContext';

export const Header: React.FC = () => {
  const {
    settings,
    openSettings,
    updateSettings,
    setIsLocked,
    isGoogleConnected,
    googleUser,
    setActiveTab,
  } = useSpotOn();

  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: nextTheme });
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/80 transition-colors">
      <div className="max-w-lg mx-auto px-5 py-3.5 flex items-center justify-between">
        {/* App Branding */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center font-extrabold text-base shadow-sm">
            S
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                SpotOn
              </span>
              <button
                onClick={() => setActiveTab('export')}
                title={isGoogleConnected ? `Google Drive connected (${googleUser?.email})` : 'Local only mode'}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                {isGoogleConnected ? (
                  <>
                    <Cloud className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                    <span>Drive</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Local</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {isGoogleConnected && googleUser?.photoURL && (
            <button
              onClick={() => setActiveTab('export')}
              title={`Connected as ${googleUser.displayName || googleUser.email}`}
              className="mr-1 ring-1 ring-blue-500/30 rounded-full p-0.5 hover:ring-blue-500 transition"
            >
              <img
                src={googleUser.photoURL}
                alt="Google avatar"
                referrerPolicy="no-referrer"
                className="w-6 h-6 rounded-full object-cover"
              />
            </button>
          )}

          {settings.requirePin && (
            <button
              onClick={() => setIsLocked(true)}
              title="Lock app"
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Lock App"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={toggleTheme}
            title={settings.theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Toggle theme"
          >
            {settings.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={openSettings}
            title="Settings"
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
