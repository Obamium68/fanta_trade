// types/team.ts
export enum Girone {
  A = "A",
  B = "B",
  C = "C"
}

export interface TeamMember {
  id: number;
  teamId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface Team {
  id: number;
  name: string;
  passwordHash?: string;
  girone: Girone;
  credits: number;
  members?: TeamMember[];
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
