export interface OperatorProfileSummary {
  id: string;
  userId: string;
  companyName: string;
  contactPersonName: string;
  contactEmail?: string | null;
  businessAddress?: string | null;
}

export interface AuthUser {
  id: string;
  name?: string | null;
  email: string;
  role?: string;
  avatar?: string | null;
  verified?: boolean;
  operatorProfile?: OperatorProfileSummary | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  name?: string;
  email: string;
  password: string;
  role?: "USER" | "OPERATOR" | string;
  phone?: string;
  phoneNumber?: string;
  companyName?: string;
  contactPersonName?: string;
}

export interface AuthResponseData {
  accessToken: string;
  refreshToken?: string;
  user?: AuthUser;
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user?: AuthUser) => void;
  logout: () => void;
}
