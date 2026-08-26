import { create } from "zustand";

interface HomeFeedStore {
  query: string;
  setQuery: (value: string) => void;
  clearQuery: () => void;
}

export const useHomeFeedStore = create<HomeFeedStore>((set) => ({
  query: "",
  setQuery: (value) => set({ query: value }),
  clearQuery: () => set({ query: "" }),
}));
