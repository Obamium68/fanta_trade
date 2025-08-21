// types/team.ts
export enum Girone {
  A = "A",
  B = "B",
  C = "C"
}

// Nuovo enum per i ruoli dei giocatori
export enum RolePlayer {
  PORTIERE = 'PORTIERE',
  DIFENSORE = 'DIFENSORE',
  CENTROCAMPISTA = 'CENTROCAMPISTA',
  ATTACCANTE = 'ATTACCANTE'
}

// Nuovo enum per gli stati delle trattative
export enum TradeStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  APPROVED = 'APPROVED'
}

export interface TeamMember {
  id: number;
  teamId: number;
  name: string;
  email: string;
  phone: string;
}

// Nuove interfacce per i giocatori
export interface Player {
  id: number;
  lastname: string;
  realteam: string;
  value: number;
  role: RolePlayer;
  teamsCount: number;
}

export interface TeamPlayer {
  id: number;
  teamId: number;
  playerId: number;
  player: Player;
}

export const GironeMap = {
  "A": Girone.A,
  "B": Girone.B,
  "C": Girone.C
};

export interface Team {
  _count: any;
  id: number;
  name: string;
  passwordHash?: string;
  girone: Girone;
  credits: number;
  members?: TeamMember[];
  players?: TeamPlayer[]; // Aggiunto per la rosa
  createdAt: string;
  updatedAt: string;
}

export interface TeamsResponse {
  teams: Team[];
  total: number;
}

export interface TeamUpdateRequest {
  name?: string;
  password?: string;
  girone?: Girone;
  credits?: number;
}

export interface TeamUpdateResponse {
  message: string;
  team: Team;
}

export interface ApiError {
  error: string;
  details?: any;
}

export interface TeamWithEditing extends Team {
  isEditing: boolean;
  originalData: Team;
}

// Nuove interfacce per le API della rosa
export interface RosterResponse {
  success: boolean;
  players: Player[];
  stats: {
    totalPlayers: number;
    totalValue: number;
    byRole: {
      PORTIERE: number;
      DIFENSORE: number;
      CENTROCAMPISTA: number;
      ATTACCANTE: number;
    };
  };
  teamInfo?: {
    id: number;
    name: string;
    girone: Girone;
    credits: number;
  };
}

export interface PlayersResponse {
  success: boolean;
  players: Player[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
  };
  filters: {
    role?: string;
    search?: string;
    realteam?: string;
  };
}