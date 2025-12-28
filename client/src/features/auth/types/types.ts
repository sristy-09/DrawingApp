export interface LoginFormType {
  email: string;
  password: string;
}

export interface SignUpFormType {
  username: string;
  email: string;
  password: string;
}

export type FormErrors = {
  username?: string;
  email?: string;
  password?: string;
};
