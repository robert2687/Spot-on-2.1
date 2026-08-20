import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Shield,
  Wallet,
  Sliders,
  Moon,
  Sun,
  Laptop,
  Lock,
  RefreshCw,
  Trash2,
  Plus,
  Sparkles,
  Check,
  Database,
  Cloud,
  HardDrive,
  LogOut,
  FolderSync,
} from 'lucide-react';
import { useSpotOn } from '../../context/SpotOnContext';
import { CURRENCY_OPTIONS, PLACES_LIST } from '../../data/defaultPresets';
import { Category, Place } from '../../types';
import { GoogleSignInButton } from '../GoogleSignInButton';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    closeSettings,
    settings,
    updateSettings,
    presets,
    addPreset,
    deletePreset,
    loadSampleData,
    clearAllData,
    showToast,
    googleUser,
    isGoogleConnected,
    isAuthLoading,
    driveQuota,
    lastDriveSync,
    isSyncingDrive,
    loginWithGoogle,
    logoutFromGoogle,
    backupToDrive,
  } = useSpotOn();

  // Local state for budget input
  const [budgetInput, setBudgetInput] = useState<string>(settings.monthlyBudget.toString());
  const [pinInput, setPinInput] = useState<string>(settings.pinCode || '1234');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // New Preset state
  const [isAddingPreset, setIsAddingPreset] = useState(false);
  const [newPresetCat, setNewPresetCat] = useState<Category>('alcohol');
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetPrice, setNewPresetPrice] = useState('4.00');
  const [newPresetPlace, setNewPresetPlace] = useState<Place>('Bar');

  if (!isSettingsOpen) return null;

  const handleSaveBudget = () => {
    const val = parseFloat(budgetInput);
    if (!isNaN(val) && val >= 0) {
      updateSettings({ monthlyBudget: val });
      showToast('Budget saved');
    }
  };

  const handleCurrencyChange = (code: string) => {
    const selected = CURRENCY_OPTIONS.find((c) => c.code === code);
    if (selected) {
      updateSettings({
        currency: selected.code,
        currencySymbol: selected.symbol,
      });
      showToast(`Currency changed to ${selected.name}`);
    }
  };

  const handleAddNewPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    const price = parseFloat(newPresetPrice) || 2.50;
    addPreset({
      category: newPresetCat,
      name: newPresetName.trim(),
      defaultPrice: price,
      place: newPresetPlace,
    });
    setNewPresetName('');
    setIsAddingPreset(false);
    showToast('Preset added');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Settings</h2>
            <button
              onClick={closeSettings}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto p-5 space-y-6 flex-1">
            {/* Section 1: Privacy & Google Drive */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Privacy & Google Drive</span>
              </div>

              {/* Google Drive Account Card */}
              <div className="bg-slate-50 dark:bg-slate-850 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      Google Drive
                    </span>
                  </div>
                  {isGoogleConnected ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Connected
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">Not connected</span>
                  )}
                </div>

                {!isGoogleConnected ? (
                  <div className="space-y-2.5 pt-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Connect Google Drive to safely backup your records and restore them whenever needed.
                    </p>
                    <GoogleSignInButton
                      onClick={() => loginWithGoogle()}
                      isLoading={isAuthLoading}
                      text="Connect Google Drive"
                      className="w-full"
                    />
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {googleUser?.photoURL ? (
                          <img
                            src={googleUser.photoURL}
                            alt={googleUser.displayName || 'Google Account'}
                            referrerPolicy="no-referrer"
                            className="w-7 h-7 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                            {googleUser?.displayName?.charAt(0) || 'G'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
                            {googleUser?.displayName || 'Google Account'}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {googleUser?.email}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => logoutFromGoogle()}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shrink-0"
                        title="Disconnect Google Drive"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => backupToDrive()}
                        disabled={isSyncingDrive}
                        className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-60"
                      >
                        {isSyncingDrive ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FolderSync className="w-3.5 h-3.5" />
                        )}
                        <span>Backup Now</span>
                      </button>
                      {lastDriveSync && (
                        <span className="text-[10px] text-slate-400">
                          Last sync: {lastDriveSync}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-slate-850 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-4">
                {/* Local-only mode */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm text-slate-900 dark:text-white block">
                      Local-only mode
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Keep 100% of data private on this device
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSettings({ localOnly: !settings.localOnly })}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      settings.localOnly ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        settings.localOnly ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Cloud backup */}
                <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800 pt-3">
                  <div>
                    <span className="font-semibold text-sm text-slate-900 dark:text-white block">
                      Cloud backup
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Sync across personal devices (optional)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSettings({ cloudBackup: !settings.cloudBackup })}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      settings.cloudBackup ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        settings.cloudBackup ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Require PIN */}
                <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800 pt-3">
                  <div>
                    <span className="font-semibold text-sm text-slate-900 dark:text-white block">
                      Require PIN / Biometrics
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Protect app when sharing phone
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSettings({ requirePin: !settings.requirePin })}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      settings.requirePin ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        settings.requirePin ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* PIN Code Setup */}
                {settings.requirePin && (
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Set 4-Digit Passcode
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={pinInput}
                      onChange={(e) => {
                        setPinInput(e.target.value);
                        if (e.target.value.length === 4) {
                          updateSettings({ pinCode: e.target.value });
                          showToast('Passcode updated');
                        }
                      }}
                      placeholder="1234"
                      className="w-32 px-3 py-1.5 text-center tracking-widest font-mono text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Budget */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Monthly Budget</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-850 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Monthly spending target ({settings.currencySymbol})
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                        {settings.currencySymbol}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="5"
                        value={budgetInput}
                        onChange={(e) => setBudgetInput(e.target.value)}
                        onBlur={handleSaveBudget}
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={handleSaveBudget}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
                    >
                      Save
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800 pt-3">
                  <div>
                    <span className="font-semibold text-sm text-slate-900 dark:text-white block">
                      Show budget progress on Home
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Display progress bar & percentage on dashboard
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSettings({ showBudgetOnHome: !settings.showBudgetOnHome })}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      settings.showBudgetOnHome ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        settings.showBudgetOnHome ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Section 3: General */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>General Preferences</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-850 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-4">
                {/* Currency selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Currency
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {CURRENCY_OPTIONS.map((c) => {
                      const isSelected = settings.currency === c.code;
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => handleCurrencyChange(c.code)}
                          className={`p-2 rounded-xl text-left border transition ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-900 dark:text-blue-300 font-bold'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="text-xs font-bold">{c.code} ({c.symbol})</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Theme Selector */}
                <div className="border-t border-slate-200/60 dark:border-slate-800 pt-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Theme
                  </label>
                  <div className="grid grid-cols-3 gap-2 bg-slate-200/70 dark:bg-slate-900 p-1 rounded-xl text-xs font-medium">
                    <button
                      onClick={() => updateSettings({ theme: 'light' })}
                      className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                        settings.theme === 'light'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      Light
                    </button>
                    <button
                      onClick={() => updateSettings({ theme: 'dark' })}
                      className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                        settings.theme === 'dark'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      Dark
                    </button>
                    <button
                      onClick={() => updateSettings({ theme: 'system' })}
                      className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                        settings.theme === 'system'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Laptop className="w-3.5 h-3.5" />
                      System
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Presets Manager */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Quick Presets ({presets.length})
                </span>
                <button
                  onClick={() => setIsAddingPreset(!isAddingPreset)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Preset
                </button>
              </div>

              {isAddingPreset && (
                <form onSubmit={handleAddNewPreset} className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newPresetCat}
                      onChange={(e) => setNewPresetCat(e.target.value as Category)}
                      className="px-2 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="alcohol">Alcohol</option>
                      <option value="tobacco">Tobacco</option>
                    </select>
                    <select
                      value={newPresetPlace}
                      onChange={(e) => setNewPresetPlace(e.target.value as Place)}
                      className="px-2 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      {PLACES_LIST.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Preset name (e.g. Cider)"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      required
                      className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Default price"
                      value={newPresetPrice}
                      onChange={(e) => setNewPresetPrice(e.target.value)}
                      required
                      className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingPreset(false)}
                      className="px-2.5 py-1 text-xs text-slate-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                    >
                      Save Preset
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {presets.map((p) => (
                  <div
                    key={p.id}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {settings.currencySymbol}{p.defaultPrice.toFixed(2)} · {p.place}
                      </span>
                    </div>
                    {presets.length > 2 && (
                      <button
                        onClick={() => deletePreset(p.id)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                        title="Remove preset"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Data Management Actions */}
            <div className="space-y-3 pt-2 border-t border-slate-200/70 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Data Management
              </span>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    loadSampleData();
                    closeSettings();
                  }}
                  className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-between transition"
                >
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                    Load 30 Days Sample Data
                  </span>
                  <span className="text-[10px] text-slate-400">Populate demo</span>
                </button>

                {showClearConfirm ? (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl space-y-2 text-xs">
                    <p className="font-semibold text-rose-800 dark:text-rose-300">
                      Are you sure you want to clear all tracked purchases?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          clearAllData();
                          setShowClearConfirm(false);
                          closeSettings();
                        }}
                        className="px-3 py-1.5 bg-rose-600 text-white rounded-lg font-bold"
                      >
                        Yes, Delete All
                      </button>
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="w-full py-2.5 px-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center justify-between transition"
                  >
                    <span className="flex items-center gap-2">
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear All Tracked Data
                    </span>
                    <span className="text-[10px] opacity-75">Permanent</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
