// types/player.ts
export interface Player {
  id: number;
  lastname: string;
  realteam: string;
  value: number;
  role: PlayerRole;
  teamsIn?: TeamsInfo[];
  teamsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamsInfo {
  id: number;
  name: string;
  girone: string;
}

export enum PlayerRole {
  P = "PORTIERE",
  D = "DIFENSORE", 
  C = "CENTROCAMPISTA",
  A = "ATTACCANTE"
}

export interface PlayerResponse {
  players: Player[];
  total: number;
}

export interface PlayerUpdateRequest {
  value: number;
}

export interface PlayerCreateRequest {
  lastname: string;
  realteam: string;
  value: number;
  role: keyof typeof PlayerRole;
}

export interface PlayerFullUpdateRequest {
  lastname: string;
  realteam: string;
  value: number;
  role: keyof typeof PlayerRole;
}

export interface PlayerUpdateResponse {
  message: string;
  player: Player;
}

export interface PlayerDeleteResponse {
  message: string;
  playerId: number;
}

export interface PlayerWithEditing extends Player {
  isEditing: boolean;
  originalData: Player;
}

export interface ApiError {
  error: string;
  details?: string;
}