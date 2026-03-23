export interface Organisation {
  name: string;
  description: string;
  country: string;
}

export interface User {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface RegisterPayload {
  organisation: Organisation;
  user: User;
}

export interface APIErrorResponse {
  message?: string;
  errors?: Record<string, string>;
}
