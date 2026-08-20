import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Purchase, AppSettings, NavigationTab, ToastMessage, PresetItem, Category } from '../types';
import { DEFAULT_PRESETS } from '../data/defaultPresets';
import { generateSamplePurchases } from '../data/sampleData';
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  getCurrentUser,
} from '../services/firebaseAuth';
import {
  listSpotOnDriveFiles,
  uploadBackupToDrive,
  uploadCsvToDrive,
  downloadDriveFileContent,
  deleteDriveFile,
  fetchDriveQuota,
  DriveFileItem,
  DriveQuotaInfo,
  SpotOnBackupPayload,
} from '../services/googleDrive';
import { User } from 'firebase/auth';

interface HistoryAction {
  type: 'delete' | 'add' | 'edit';
  previousData?: Purchase;
  currentData?: Purchase;
}

interface SpotOnContextType {
  purchases: Purchase[];
  settings: AppSettings;
  presets: PresetItem[];
  activeTab: NavigationTab;
  isAddModalOpen: boolean;
  editingPurchase: Purchase | null;
  isSettingsOpen: boolean;
  isOnboardingOpen: boolean;
  isLocked: boolean;
  toast: ToastMessage | null;

  // Google Drive & Auth
  googleUser: User | null;
  isGoogleConnected: boolean;
  isAuthLoading: boolean;
  driveFiles: DriveFileItem[];
  isLoadingDriveFiles: boolean;
  isSyncingDrive: boolean;
  driveQuota: DriveQuotaInfo | null;
  lastDriveSync: string | null;

  // Actions
  setActiveTab: (tab: NavigationTab) => void;
  openAddModal: (purchaseToEdit?: Purchase | null) => void;
  closeAddModal: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  setIsLocked: (locked: boolean) => void;
  unlockWithPin: (enteredPin: string) => boolean;

  addPurchase: (purchaseData: Omit<Purchase, 'id' | 'createdAt'>) => void;
  updatePurchase: (id: string, updatedData: Partial<Omit<Purchase, 'id' | 'createdAt'>>) => void;
  deletePurchase: (id: string) => void;
  undoLastAction: () => void;

  updateSettings: (newSettings: Partial<AppSettings>) => void;
  addPreset: (preset: Omit<PresetItem, 'id'>) => void;
  deletePreset: (id: string) => void;

  loadSampleData: () => void;
  clearAllData: () => void;
  showToast: (message: string, action?: { label: string; onClick: () => void }, duration?: number) => void;
  hideToast: () => void;
  completeOnboarding: (currency: string, currencySymbol: string, localOnly: boolean, budget: number) => void;

  // Daily Notifications
  notificationPermission: NotificationPermission | 'unsupported';
  toggleDailyReminder: (enable: boolean, time?: string) => Promise<boolean>;
  sendTestNotification: () => Promise<boolean>;

  // Google Drive Actions
  loginWithGoogle: () => Promise<boolean>;
  logoutFromGoogle: () => Promise<void>;
  refreshDriveFiles: () => Promise<void>;
  backupToDrive: (note?: string) => Promise<boolean>;
  saveCsvToDrive: (csvContent: string, filename: string) => Promise<boolean>;
  restoreBackupFromDrive: (fileId: string) => Promise<boolean>;
  deleteFileFromDrive: (fileId: string) => Promise<boolean>;
}

const STORAGE_KEY_PURCHASES = 'spoton_purchases_v1';
const STORAGE_KEY_SETTINGS = 'spoton_settings_v1';
const STORAGE_KEY_PRESETS = 'spoton_presets_v1';
const STORAGE_KEY_LAST_SYNC = 'spoton_last_drive_sync_v1';

const DEFAULT_SETTINGS: AppSettings = {
  currency: 'EUR',
  currencySymbol: '€',
  monthlyBudget: 120,
  alcoholBudget: 80,
  tobaccoBudget: 40,
  showBudgetOnHome: true,
  localOnly: true,
  cloudBackup: false,
  requirePin: false,
  pinCode: '1234',
  theme: 'light',
  onboardingCompleted: true,
  dailyReminderEnabled: false,
  dailyReminderTime: '20:00',
};

const SpotOnContext = createContext<SpotOnContextType | undefined>(undefined);

export const SpotOnProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. App Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load settings from storage', e);
    }
    return DEFAULT_SETTINGS;
  });

  // 2. Purchases list
  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PURCHASES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load purchases from storage', e);
    }
    // Default initial sample data for rich experience
    return generateSamplePurchases();
  });

  // 3. Presets
  const [presets, setPresets] = useState<PresetItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PRESETS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load presets', e);
    }
    return DEFAULT_PRESETS;
  });

  // Navigation & UI Modals
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(!settings.onboardingCompleted);
  const [isLocked, setIsLocked] = useState<boolean>(settings.requirePin);

  // Google Drive & Auth State
  const [googleUser, setGoogleUser] = useState<User | null>(() => getCurrentUser());
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState<boolean>(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState<boolean>(false);
  const [driveQuota, setDriveQuota] = useState<DriveQuotaInfo | null>(null);
  const [lastDriveSync, setLastDriveSync] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_LAST_SYNC);
  });

  const isGoogleConnected = Boolean(googleUser);

  // Undo & Toast
  const [lastAction, setLastAction] = useState<HistoryAction | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Browser Notification Permission State
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  // Sync notification permission state
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, _token) => {
        setGoogleUser(user);
        setIsAuthLoading(false);
      },
      () => {
        setGoogleUser(null);
        setIsAuthLoading(false);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving settings', e);
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PURCHASES, JSON.stringify(purchases));
    } catch (e) {
      console.error('Error saving purchases', e);
    }
  }, [purchases]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(presets));
    } catch (e) {
      console.error('Error saving presets', e);
    }
  }, [presets]);

  useEffect(() => {
    if (lastDriveSync) {
      localStorage.setItem(STORAGE_KEY_LAST_SYNC, lastDriveSync);
    }
  }, [lastDriveSync]);

  // Apply dark mode class to html/document and listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateTheme = () => {
      const isDark =
        settings.theme === 'dark' ||
        (settings.theme === 'system' && mediaQuery.matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    updateTheme();

    const handleSystemChange = () => {
      if (settings.theme === 'system') {
        updateTheme();
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange);
    };
  }, [settings.theme]);

  // Toast Helper
  const showToast = useCallback(
    (message: string, action?: { label: string; onClick: () => void }, duration = 4000) => {
      const id = Date.now().toString();
      setToast({ id, message, action, duration });
    },
    []
  );

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  // Modal handlers
  const openAddModal = useCallback((purchaseToEdit?: Purchase | null) => {
    setEditingPurchase(purchaseToEdit || null);
    setIsAddModalOpen(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setIsAddModalOpen(false);
    setEditingPurchase(null);
  }, []);

  const openSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  // CRUD for Purchases
  const addPurchase = useCallback(
    (purchaseData: Omit<Purchase, 'id' | 'createdAt'>) => {
      const newPurchase: Purchase = {
        ...purchaseData,
        id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        createdAt: Date.now(),
      };

      setPurchases((prev) => [newPurchase, ...prev]);
      setLastAction({ type: 'add', currentData: newPurchase });

      showToast('Saved purchase', {
        label: 'Undo',
        onClick: () => {
          setPurchases((prev) => prev.filter((p) => p.id !== newPurchase.id));
          showToast('Addition undone');
        },
      });
    },
    [showToast]
  );

  const updatePurchase = useCallback(
    (id: string, updatedData: Partial<Omit<Purchase, 'id' | 'createdAt'>>) => {
      let previous: Purchase | undefined;
      setPurchases((prev) => {
        return prev.map((p) => {
          if (p.id === id) {
            previous = p;
            const merged = { ...p, ...updatedData };
            merged.totalPrice = Number((merged.price * merged.quantity).toFixed(2));
            return merged;
          }
          return p;
        });
      });

      if (previous) {
        const oldData = previous;
        setLastAction({ type: 'edit', previousData: oldData });
        showToast('Updated purchase', {
          label: 'Undo',
          onClick: () => {
            setPurchases((prev) => prev.map((p) => (p.id === id ? oldData : p)));
            showToast('Changes reverted');
          },
        });
      }
    },
    [showToast]
  );

  const deletePurchase = useCallback(
    (id: string) => {
      const toDelete = purchases.find((p) => p.id === id);
      if (!toDelete) return;

      setPurchases((prev) => prev.filter((p) => p.id !== id));
      setLastAction({ type: 'delete', previousData: toDelete });

      showToast('Deleted entry', {
        label: 'Undo',
        onClick: () => {
          setPurchases((prev) => [toDelete, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
          showToast('Entry restored');
        },
      });
    },
    [purchases, showToast]
  );

  const undoLastAction = useCallback(() => {
    if (!lastAction) return;

    if (lastAction.type === 'delete' && lastAction.previousData) {
      const restored = lastAction.previousData;
      setPurchases((prev) => [restored, ...prev]);
      showToast('Restored deleted item');
    } else if (lastAction.type === 'add' && lastAction.currentData) {
      const targetId = lastAction.currentData.id;
      setPurchases((prev) => prev.filter((p) => p.id !== targetId));
      showToast('Added purchase removed');
    } else if (lastAction.type === 'edit' && lastAction.previousData) {
      const old = lastAction.previousData;
      setPurchases((prev) => prev.map((p) => (p.id === old.id ? old : p)));
      showToast('Reverted edit');
    }
    setLastAction(null);
  }, [lastAction, showToast]);

  // Settings update
  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const addPreset = useCallback((preset: Omit<PresetItem, 'id'>) => {
    const newPreset: PresetItem = {
      ...preset,
      id: `custom-pre-${Date.now()}`,
    };
    setPresets((prev) => [...prev, newPreset]);
  }, []);

  const deletePreset = useCallback((id: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const loadSampleData = useCallback(() => {
    const samples = generateSamplePurchases();
    setPurchases(samples);
    showToast('Loaded 30 days of sample data');
  }, [showToast]);

  const clearAllData = useCallback(() => {
    setPurchases([]);
    showToast('All tracking data cleared');
  }, [showToast]);

  // Unlock with PIN
  const unlockWithPin = useCallback(
    (enteredPin: string) => {
      if (!settings.requirePin || enteredPin === (settings.pinCode || '1234')) {
        setIsLocked(false);
        return true;
      }
      return false;
    },
    [settings.pinCode, settings.requirePin]
  );

  const completeOnboarding = useCallback(
    (currency: string, currencySymbol: string, localOnly: boolean, budget: number) => {
      setSettings((prev) => ({
        ...prev,
        currency,
        currencySymbol,
        localOnly,
        monthlyBudget: budget > 0 ? budget : prev.monthlyBudget,
        onboardingCompleted: true,
      }));
      setIsOnboardingOpen(false);
      showToast('Welcome to SpotOn! Start tracking anytime.');
    },
    [showToast]
  );

  // Google Drive Handlers
  const refreshDriveFiles = useCallback(async () => {
    if (!googleUser) return;
    setIsLoadingDriveFiles(true);
    try {
      const [files, quota] = await Promise.all([
        listSpotOnDriveFiles(),
        fetchDriveQuota().catch(() => null),
      ]);
      setDriveFiles(files);
      if (quota) setDriveQuota(quota);
    } catch (e: any) {
      console.error('Failed to load Drive files', e);
      showToast(e.message || 'Failed to refresh Google Drive files');
    } finally {
      setIsLoadingDriveFiles(false);
    }
  }, [googleUser, showToast]);

  const loginWithGoogle = useCallback(async (): Promise<boolean> => {
    setIsAuthLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setSettings((prev) => ({ ...prev, localOnly: false, cloudBackup: true }));
        showToast(`Connected as ${result.user.displayName || result.user.email || 'Google User'}`);
        try {
          const files = await listSpotOnDriveFiles();
          setDriveFiles(files);
          const quota = await fetchDriveQuota();
          setDriveQuota(quota);
        } catch (err) {
          console.warn('Initial drive fetch warning:', err);
        }
        return true;
      }
      return false;
    } catch (e: any) {
      showToast(e.message || 'Google Sign-In failed');
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  }, [showToast]);

  const logoutFromGoogle = useCallback(async () => {
    try {
      await logoutGoogle();
      setGoogleUser(null);
      setDriveFiles([]);
      setDriveQuota(null);
      showToast('Signed out from Google Drive');
    } catch (e: any) {
      showToast(e.message || 'Failed to sign out');
    }
  }, [showToast]);

  const backupToDrive = useCallback(
    async (note?: string): Promise<boolean> => {
      if (!isGoogleConnected) {
        const ok = await loginWithGoogle();
        if (!ok) return false;
      }
      setIsSyncingDrive(true);
      try {
        const uploaded = await uploadBackupToDrive(purchases, settings, presets, note);
        setDriveFiles((prev) => [uploaded, ...prev.filter((f) => f.id !== uploaded.id)]);
        const syncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastDriveSync(syncTime);
        showToast('Backup saved to Google Drive');
        return true;
      } catch (e: any) {
        showToast(e.message || 'Failed to backup to Google Drive');
        return false;
      } finally {
        setIsSyncingDrive(false);
      }
    },
    [isGoogleConnected, loginWithGoogle, purchases, settings, presets, showToast]
  );

  const saveCsvToDrive = useCallback(
    async (csvContent: string, filename: string): Promise<boolean> => {
      if (!isGoogleConnected) {
        const ok = await loginWithGoogle();
        if (!ok) return false;
      }
      setIsSyncingDrive(true);
      try {
        const uploaded = await uploadCsvToDrive(csvContent, filename);
        setDriveFiles((prev) => [uploaded, ...prev]);
        showToast(`Saved "${filename}" directly to Google Drive`);
        return true;
      } catch (e: any) {
        showToast(e.message || 'Failed to save CSV to Google Drive');
        return false;
      } finally {
        setIsSyncingDrive(false);
      }
    },
    [isGoogleConnected, loginWithGoogle, showToast]
  );

  const restoreBackupFromDrive = useCallback(
    async (fileId: string): Promise<boolean> => {
      setIsSyncingDrive(true);
      try {
        const content = await downloadDriveFileContent(fileId);
        const parsed = JSON.parse(content) as SpotOnBackupPayload;
        if (parsed && Array.isArray(parsed.purchases)) {
          setPurchases(parsed.purchases);
          if (parsed.presets && Array.isArray(parsed.presets)) {
            setPresets(parsed.presets);
          }
          if (parsed.settings) {
            setSettings((prev) => ({ ...prev, ...parsed.settings }));
          }
          showToast(`Restored ${parsed.purchases.length} purchases from Google Drive`);
          return true;
        } else {
          throw new Error('Invalid SpotOn backup format');
        }
      } catch (e: any) {
        showToast(e.message || 'Failed to restore backup from Google Drive');
        return false;
      } finally {
        setIsSyncingDrive(false);
      }
    },
    [showToast]
  );

  // Daily Notification Reminder Scheduler
  useEffect(() => {
    if (!settings.dailyReminderEnabled || typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    const checkReminder = () => {
      const now = new Date();
      const currentHour = String(now.getHours()).padStart(2, '0');
      const currentMin = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHour}:${currentMin}`;
      const targetTime = settings.dailyReminderTime || '20:00';
      const todayDateStr = now.toISOString().split('T')[0];

      const lastSentDate = localStorage.getItem('spoton_last_reminder_date');

      if (currentTimeStr === targetTime && lastSentDate !== todayDateStr) {
        localStorage.setItem('spoton_last_reminder_date', todayDateStr);

        try {
          const notification = new Notification('SpotOn Daily Reminder 📝', {
            body: "Don't forget to track your drinks & tobacco purchases for today!",
            icon: '/favicon.ico',
            tag: 'spoton-daily-reminder',
          });

          notification.onclick = () => {
            window.focus();
            openAddModal();
            notification.close();
          };
        } catch (err) {
          console.warn('Could not show browser notification', err);
        }
      }
    };

    // Check right away and every 25 seconds
    checkReminder();
    const interval = setInterval(checkReminder, 25000);
    return () => clearInterval(interval);
  }, [settings.dailyReminderEnabled, settings.dailyReminderTime, openAddModal]);

  const toggleDailyReminder = useCallback(
    async (enable: boolean, time?: string): Promise<boolean> => {
      if (!enable) {
        updateSettings({ dailyReminderEnabled: false });
        showToast('Daily reminder disabled');
        return true;
      }

      if (typeof window === 'undefined' || !('Notification' in window)) {
        showToast('Notifications are not supported in this browser environment');
        return false;
      }

      const reminderTime = time || settings.dailyReminderTime || '20:00';

      if (Notification.permission === 'granted') {
        setNotificationPermission('granted');
        updateSettings({ dailyReminderEnabled: true, dailyReminderTime: reminderTime });
        showToast(`Daily reminder scheduled for ${reminderTime}`);
        return true;
      }

      if (Notification.permission === 'denied') {
        setNotificationPermission('denied');
        showToast('Notifications are blocked by your browser settings. Please enable permissions in your browser URL bar.');
        updateSettings({ dailyReminderEnabled: false });
        return false;
      }

      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
          updateSettings({ dailyReminderEnabled: true, dailyReminderTime: reminderTime });
          showToast(`Daily reminder enabled for ${reminderTime}`);
          return true;
        } else {
          updateSettings({ dailyReminderEnabled: false });
          showToast('Notification permission was not granted.');
          return false;
        }
      } catch (err) {
        console.error('Error requesting notification permission', err);
        showToast('Could not request notification permissions.');
        return false;
      }
    },
    [settings.dailyReminderTime, updateSettings, showToast]
  );

  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('Notifications are not supported in this browser environment');
      return false;
    }

    let perm = Notification.permission;
    if (perm === 'default') {
      try {
        perm = await Notification.requestPermission();
        setNotificationPermission(perm);
      } catch (e) {
        console.error(e);
      }
    }

    if (perm !== 'granted') {
      showToast('Please allow notification permissions to receive daily reminders.');
      return false;
    }

    try {
      const notification = new Notification('SpotOn Daily Reminder 🍷', {
        body: 'This is a preview reminder to log your daily purchases!',
        icon: '/favicon.ico',
        tag: 'spoton-test-reminder',
      });

      notification.onclick = () => {
        window.focus();
        openAddModal();
        notification.close();
      };

      showToast('Test notification sent!');
      return true;
    } catch (e: any) {
      showToast(e?.message || 'Failed to send test notification');
      return false;
    }
  }, [openAddModal, showToast]);

  const deleteFileFromDrive = useCallback(
    async (fileId: string): Promise<boolean> => {
      try {
        await deleteDriveFile(fileId);
        setDriveFiles((prev) => prev.filter((f) => f.id !== fileId));
        showToast('Backup file deleted from Google Drive');
        return true;
      } catch (e: any) {
        showToast(e.message || 'Failed to delete file from Google Drive');
        return false;
      }
    },
    [showToast]
  );

  return (
    <SpotOnContext.Provider
      value={{
        purchases,
        settings,
        presets,
        activeTab,
        isAddModalOpen,
        editingPurchase,
        isSettingsOpen,
        isOnboardingOpen,
        isLocked,
        toast,
        googleUser,
        isGoogleConnected,
        isAuthLoading,
        driveFiles,
        isLoadingDriveFiles,
        isSyncingDrive,
        driveQuota,
        lastDriveSync,
        setActiveTab,
        openAddModal,
        closeAddModal,
        openSettings,
        closeSettings,
        setIsLocked,
        unlockWithPin,
        addPurchase,
        updatePurchase,
        deletePurchase,
        undoLastAction,
        updateSettings,
        addPreset,
        deletePreset,
        loadSampleData,
        clearAllData,
        showToast,
        hideToast,
        completeOnboarding,
        notificationPermission,
        toggleDailyReminder,
        sendTestNotification,
        loginWithGoogle,
        logoutFromGoogle,
        refreshDriveFiles,
        backupToDrive,
        saveCsvToDrive,
        restoreBackupFromDrive,
        deleteFileFromDrive,
      }}
    >
      {children}
    </SpotOnContext.Provider>
  );
};

export const useSpotOn = () => {
  const context = useContext(SpotOnContext);
  if (!context) {
    throw new Error('useSpotOn must be used within a SpotOnProvider');
  }
  return context;
};
