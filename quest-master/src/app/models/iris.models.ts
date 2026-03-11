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

export interface GlobalNode {
  key: string;
  value?: string;
  truncated?: boolean;
  children: GlobalNode[];
}

export interface GlobalEntry {
  name: string;
  children: GlobalNode[];
}

export interface GlobalsResponse {
  globals: GlobalEntry[];
}
