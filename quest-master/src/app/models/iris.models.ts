export interface IRISConfig {
  baseUrl: string;
  namespace: string;
  username: string;
  password: string;
}

export interface ExecuteResult {
  success: boolean;
  output?: string;
  error?: string;
}
