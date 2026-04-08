export interface IRegisterPayload {
  name: string;
  email: string;
  password: string;
}
export interface ILoginPayload {
  email: string;
  password: string;
}

export interface IChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}
