// API Types matching rust-backend responses

export interface HealthResponse {
  status: string;
  version: string;
  deployer_address: string;
}

export interface DepositInfo {
  id: number;
  user_address: string;
  deposit_address: string;
  salt: string;
  nonce: number;
  status: DepositStatus;
  created_at: string;
}

export type DepositStatus = 'pending' | 'funded' | 'deployed' | 'routed' | 'failed';

export interface ListDepositsResponse {
  deposits: DepositInfo[];
  total: number;
}

export interface CreateDepositRequest {
  user: string;
}

export interface CreateDepositResponse {
  deposit_address: string;
  salt: string;
  nonce: number;
  note: string;
}

export interface RouteTransactionInfo {
  proxy_address: string;
  tx_hash: string;
  amount_wei: string;
}

export interface RouteResponse {
  checked: number;
  funded: number;
  deployed: number;
  routed: number;
  deploy_tx_hash?: string;
  route_tx_hashes: RouteTransactionInfo[];
  errors: string[];
}
