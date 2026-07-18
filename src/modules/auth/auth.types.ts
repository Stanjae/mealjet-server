import { UserRole } from "@shared/types/enums";

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
  phone?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: object;
  tokens: AuthTokens;
}
