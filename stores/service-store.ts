import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ServiceHistoryItem {
  id: string;
  name: string;
  type: 'balita' | 'lansia';
  timestamp: string;
}

interface ServiceState {
  activePosyanduId: string | null;
  activeWorkspace: 'balita' | 'lansia' | null;
  history: ServiceHistoryItem[];
  
  setActivePosyandu: (id: string | null) => void;
  setActiveWorkspace: (workspace: 'balita' | 'lansia' | null) => void;
  addToHistory: (item: Omit<ServiceHistoryItem, 'timestamp'>) => void;
  clearHistory: () => void;
}

export const useServiceStore = create<ServiceState>()(
  persist(
    (set) => ({
      activePosyanduId: null,
      activeWorkspace: null,
      history: [],

      setActivePosyandu: (id) => set({ activePosyanduId: id }),

      setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),

      addToHistory: (item) => set((state) => {
        const newItem: ServiceHistoryItem = {
          ...item,
          timestamp: new Date().toISOString(),
        };
        // Remove duplicates and keep only last 5
        const filteredHistory = state.history.filter(h => h.id !== item.id);
        const newHistory = [newItem, ...filteredHistory].slice(0, 5);
        return { history: newHistory };
      }),

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'posyandu-service-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
