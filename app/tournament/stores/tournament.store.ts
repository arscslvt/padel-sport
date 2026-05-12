import { create } from "zustand";

type TournamentStore = {
  tournamentId: string | null;
  selectedCategoryId: string | null;
  selectedGroupId: string | null;

  setTournamentId: (id: string) => void;
  setSelectedCategoryId: (id: string) => void;
  setSelectedGroupId: (id: string) => void;
};

const useTournamentStore = create<TournamentStore>((set) => ({
  tournamentId: null,
  selectedCategoryId: null,
  selectedGroupId: null,

  setTournamentId: (id: string) => set({ tournamentId: id }),
  setSelectedCategoryId: (id: string) => set({ selectedCategoryId: id }),
  setSelectedGroupId: (id: string) => set({ selectedGroupId: id }),
}));

export { useTournamentStore };
