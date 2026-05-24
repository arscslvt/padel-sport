import { create } from "zustand";

export interface SelectedMatchDetails {
  _id: string;
  status: "scheduled" | "in_progress" | "finished";
  categoryName?: string;
  groupName?: string;
  teams: {
    name: string;
    players: { firstName?: string; lastName: string }[];
  }[];
  points: { teamA: number; teamB: number };
  sets: { teamAPoints: number; teamBPoints: number }[];
  scheduledAt?: string | null;
}

type TournamentStore = {
  tournamentId: string | null;
  selectedCategoryId: string | null;
  selectedGroupId: string | null;
  teamsDrawerOpen: boolean;
  searchPlayer: string | false;
  selectedMatchDetails: SelectedMatchDetails | null;
  matchDetailsDrawerOpen: boolean;

  setTournamentId: (id: string) => void;
  setSelectedCategoryId: (id: string) => void;
  setSelectedGroupId: (id: string) => void;
  setTeamsDrawerOpen: (open: boolean) => void;
  setSearchPlayer: (search: string | false) => void;
  setSelectedMatchDetails: (match: SelectedMatchDetails | null) => void;
  setMatchDetailsDrawerOpen: (open: boolean) => void;
};

const useTournamentStore = create<TournamentStore>((set) => ({
  tournamentId: null,
  selectedCategoryId: null,
  selectedGroupId: null,
  teamsDrawerOpen: false,
  searchPlayer: false,
  selectedMatchDetails: null,
  matchDetailsDrawerOpen: false,

  setTournamentId: (id: string) => set({ tournamentId: id }),
  setSelectedCategoryId: (id: string) => set({ selectedCategoryId: id }),
  setSelectedGroupId: (id: string) => set({ selectedGroupId: id }),
  setTeamsDrawerOpen: (open: boolean) => set({ teamsDrawerOpen: open }),
  setSearchPlayer: (search: string | false) => set({ searchPlayer: search }),
  setSelectedMatchDetails: (match: SelectedMatchDetails | null) =>
    set({ selectedMatchDetails: match }),
  setMatchDetailsDrawerOpen: (open: boolean) =>
    set({ matchDetailsDrawerOpen: open }),
}));

export { useTournamentStore };
