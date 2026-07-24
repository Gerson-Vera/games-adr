import { create } from "zustand";

type RoomPlayer = {
  playerId: string;
  isReady: boolean;
  seed: number;
  player: {
    id: string;
    displayName: string;
    user: { avatar: string | null };
  };
};

type RoomState = {
  players: RoomPlayer[];
  tournamentStatus: string | null;
  setPlayers: (players: RoomPlayer[]) => void;
  setReady: (playerId: string, isReady: boolean) => void;
  setTournamentStatus: (status: string) => void;
  reset: () => void;
};

export const useRoomStore = create<RoomState>((set) => ({
  players: [],
  tournamentStatus: null,

  setPlayers: (players) => set({ players }),

  setReady: (playerId, isReady) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.playerId === playerId ? { ...p, isReady } : p
      ),
    })),

  setTournamentStatus: (status) => set({ tournamentStatus: status }),

  reset: () => set({ players: [], tournamentStatus: null }),
}));
