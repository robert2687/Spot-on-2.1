export type Category = 'alcohol' | 'tobacco';

export type Place = 'Bar' | 'Shop' | 'Home' | 'Restaurant' | 'Club' | 'Gas Station' | 'Other';

export interface Purchase {
  id: string;
  category: Category;
  subcategory: string;
  price: number; // Unit price or total
  quantity: number;
  totalPrice: number;
  place: Place;
  date: string; // ISO date-time string e.g. 2026-08-20T14:30
  note?: string;
  createdAt: number;
}

export interface PresetItem {
  id: string;
  category: Category;
  name: string;
  defaultPrice: number;
  place: Place;
  icon?: string;
}

export interface AppSettings {
  currency: string; // 'EUR', 'USD', 'GBP', etc.
  currencySymbol: string; // '€', '$', '£', etc.
  monthlyBudget: number;
  alcoholBudget?: number;
  tobaccoBudget?: number;
  showBudgetOnHome: boolean;
  localOnly: boolean;
  cloudBackup: boolean;
  requirePin: boolean;
  pinCode?: string;
  theme: 'light' | 'dark' | 'system';
  onboardingCompleted: boolean;
}

export type NavigationTab = 'home' | 'timeline' | 'insights' | 'export';

export interface ToastMessage {
  id: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}
