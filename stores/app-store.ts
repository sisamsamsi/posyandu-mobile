import { create } from 'zustand';
import { WHOReferenceRow } from '../lib/types';

// Static JSON data
const imtData = require('../assets/data/who_imt_u.json');
const tbData = require('../assets/data/who_tb_u.json');
const bbData = require('../assets/data/who_bb_u.json');

interface AppState {
  whoImtStandards: WHOReferenceRow[];
  whoTbUStandards: WHOReferenceRow[];
  whoBbUStandards: WHOReferenceRow[];
  isDataLoaded: boolean;
  loadData: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  whoImtStandards: [],
  whoTbUStandards: [],
  whoBbUStandards: [],
  isDataLoaded: false,
  loadData: () => {
    set({
      whoImtStandards: imtData,
      whoTbUStandards: tbData,
      whoBbUStandards: bbData,
      isDataLoaded: true
    });
  }
}));
