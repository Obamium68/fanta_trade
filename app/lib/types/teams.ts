// types/team.ts
import { Girone } from '@prisma/client';

// Request types
export interface CreateTeamRequest {
  name: string;
  password: string;
  girone: Girone;
  credits?: number;
}

export interface UpdateTeamRequest {
  name?: string;
  password?: string;
  girone?: Girone;
  credits?: number;
}

// Response types
export interface TeamResponse {
  id: number;
  name: string;
  girone: Girone;
  credits: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamWithDetailsResponse extends TeamResponse {
  members: Array<{
    id: number;
    user: {
      id: number;
      email: string;
      username: string;
    };
    role: string;
    joinedAt: string;
  }>;
  players: Array<{
    id: number;
    player: {
      id: number;
      firstName: string;
      lastName: string;
      role: string;
    };
    addedAt: string;
  }>;
  _count: {
    tradesSent: number;
    tradesReceived: number;
  };
}

export interface CreateTeamResponse {
  message: string;
  team: TeamResponse;
}

export interface UpdateTeamResponse {
  message: string;
  team: TeamResponse;
}

export interface GetTeamsResponse {
  teams: Array<TeamResponse & {
    _count: {
      members: number;
      players: number;
    };
  }>;
}

export interface ErrorResponse {
  error: string;
  details?: any;
}