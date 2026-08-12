import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface BirthProfile {
  name: string;
  dob: string;
  tob: string;
  place: string;
  sun: string;
  moon: string;
  ascendant: string;
  nakshatra: string;
}

export type Concern =
  | 'Love & Relationships'
  | 'Marriage'
  | 'Career & Business'
  | 'Money & Finance'
  | 'Family'
  | 'Personal Growth'
  | 'Spirituality'
  | 'Vastu'
  | null;

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  image?: string;
}

interface AppContextValue {
  birthProfile: BirthProfile;
  setBirthProfile: (p: BirthProfile) => void;
  concern: Concern;
  setConcern: (c: Concern) => void;
  kundliGenerated: boolean;
  setKundliGenerated: (v: boolean) => void;
  astrologerFilter: string;
  setAstrologerFilter: (f: string) => void;
  // Routing & selections
  page: string;
  setPage: (p: string) => void;
  selectedId: number | string | null;
  setSelectedId: (id: number | string | null) => void;
  // Cart state
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  // Theme state
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const defaultProfile: BirthProfile = {
  name: 'Arjun Sharma',
  dob: '1990-11-08',
  tob: '06:45',
  place: 'New Delhi, India',
  sun: 'Scorpio',
  moon: 'Taurus',
  ascendant: 'Leo',
  nakshatra: 'Rohini',
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [birthProfile, setBirthProfile] = useState<BirthProfile>(defaultProfile);
  const [concern, setConcern] = useState<Concern>(null);
  const [kundliGenerated, setKundliGenerated] = useState(false);
  const [astrologerFilter, setAstrologerFilter] = useState('All');
  
  // Navigation & Cart States
  const [page, setPage] = useState('home');
  const [selectedId, setSelectedId] = useState<number | string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      return next;
    });
  };

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const clearCart = () => setCart([]);

  return (
    <AppContext.Provider value={{
      birthProfile, setBirthProfile,
      concern, setConcern,
      kundliGenerated, setKundliGenerated,
      astrologerFilter, setAstrologerFilter,
      page, setPage,
      selectedId, setSelectedId,
      cart, addToCart, removeFromCart, clearCart,
      theme, toggleTheme
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
