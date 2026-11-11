export interface User {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthResponseData {
  user: User;
  organization: Organization;
  token: string;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  organizationName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
