import { http, HttpResponse } from 'msw';
import type {
  HealthResponse,
  ListDepositsResponse,
  CreateDepositResponse,
  RouteResponse,
} from '../../api/types';

// Use the same API URL as the client (defaults to localhost:3001 in tests)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Mock data
export const mockHealth: HealthResponse = {
  status: 'ok',
  version: '0.1.0',
  deployer_address: '0x2b05DAf67cc41957f60F74Ff7D3c4aB54840Fc8D',
};

export const mockDeposits: ListDepositsResponse = {
  deposits: [
    {
      id: 1,
      user_address: '0x1234567890123456789012345678901234567890',
      deposit_address: '0xabcdef1234567890abcdef1234567890abcdef12',
      salt: '0x0000000000000000000000000000000000000000000000000000000000000001',
      nonce: 1,
      status: 'pending',
      created_at: '2026-02-01T12:00:00Z',
    },
    {
      id: 2,
      user_address: '0x1234567890123456789012345678901234567890',
      deposit_address: '0xfedcba0987654321fedcba0987654321fedcba09',
      salt: '0x0000000000000000000000000000000000000000000000000000000000000002',
      nonce: 2,
      status: 'funded',
      created_at: '2026-02-01T12:05:00Z',
    },
    {
      id: 3,
      user_address: '0x9876543210987654321098765432109876543210',
      deposit_address: '0x1111222233334444555566667777888899990000',
      salt: '0x0000000000000000000000000000000000000000000000000000000000000003',
      nonce: 3,
      status: 'routed',
      created_at: '2026-02-01T12:10:00Z',
    },
  ],
  total: 3,
};

export const mockCreateDeposit: CreateDepositResponse = {
  deposit_address: '0xnewdeposit1234567890newdeposit1234567890',
  salt: '0x0000000000000000000000000000000000000000000000000000000000000004',
  nonce: 4,
  note: 'Send Sepolia ETH to this address. The address is deterministic and will be deployed when funds are routed.',
};

export const mockRouteResponse: RouteResponse = {
  checked: 3,
  funded: 1,
  deployed: 1,
  routed: 1,
  deploy_tx_hash: '0xdeploytx1234567890deploytx1234567890deploytx1234567890',
  route_tx_hashes: [
    {
      proxy_address: '0xfedcba0987654321fedcba0987654321fedcba09',
      tx_hash: '0xroutetx1234567890routetx1234567890routetx1234567890',
      amount_wei: '1000000000000000',
    },
  ],
  errors: [],
};

export const handlers = [
  // Health check
  http.get(`${API_URL}/health`, () => {
    return HttpResponse.json(mockHealth);
  }),

  // List deposits
  http.get(`${API_URL}/deposits`, () => {
    return HttpResponse.json(mockDeposits);
  }),

  // Get single deposit
  http.get(`${API_URL}/deposits/:address`, ({ params }) => {
    const deposit = mockDeposits.deposits.find((d) => d.deposit_address === params.address);
    if (deposit) {
      return HttpResponse.json(deposit);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Create deposit
  http.post(`${API_URL}/deposit`, () => {
    return HttpResponse.json(mockCreateDeposit);
  }),

  // Route deposits
  http.post(`${API_URL}/router`, () => {
    return HttpResponse.json(mockRouteResponse);
  }),
];
