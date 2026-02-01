import { describe, it, expect } from 'vitest';
import { api } from './client';
import {
  mockHealth,
  mockDeposits,
  mockCreateDeposit,
  mockRouteResponse,
} from '../test/mocks/handlers';

describe('API Client', () => {
  describe('health', () => {
    it('should fetch health status', async () => {
      const result = await api.health();

      expect(result).toEqual(mockHealth);
      expect(result.status).toBe('ok');
      expect(result.version).toBe('0.1.0');
    });
  });

  describe('listDeposits', () => {
    it('should fetch all deposits', async () => {
      const result = await api.listDeposits();

      expect(result).toEqual(mockDeposits);
      expect(result.deposits).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('should return deposits with correct structure', async () => {
      const result = await api.listDeposits();
      const deposit = result.deposits[0];

      expect(deposit).toHaveProperty('id');
      expect(deposit).toHaveProperty('user_address');
      expect(deposit).toHaveProperty('deposit_address');
      expect(deposit).toHaveProperty('salt');
      expect(deposit).toHaveProperty('nonce');
      expect(deposit).toHaveProperty('status');
      expect(deposit).toHaveProperty('created_at');
    });
  });

  describe('getDeposit', () => {
    it('should fetch a single deposit by address', async () => {
      const address = '0xabcdef1234567890abcdef1234567890abcdef12';
      const result = await api.getDeposit(address);

      expect(result.deposit_address).toBe(address);
      expect(result.status).toBe('pending');
    });
  });

  describe('createDeposit', () => {
    it('should create a new deposit address', async () => {
      const result = await api.createDeposit({
        user: '0x1234567890123456789012345678901234567890',
      });

      expect(result).toEqual(mockCreateDeposit);
      expect(result.deposit_address).toBeDefined();
      expect(result.salt).toBeDefined();
      expect(result.nonce).toBe(4);
    });
  });

  describe('routeDeposits', () => {
    it('should route all funded deposits', async () => {
      const result = await api.routeDeposits();

      expect(result).toEqual(mockRouteResponse);
      expect(result.checked).toBe(3);
      expect(result.funded).toBe(1);
      expect(result.deployed).toBe(1);
      expect(result.routed).toBe(1);
    });

    it('should return transaction hashes', async () => {
      const result = await api.routeDeposits();

      expect(result.deploy_tx_hash).toBeDefined();
      expect(result.route_tx_hashes).toHaveLength(1);
      expect(result.route_tx_hashes[0]).toHaveProperty('proxy_address');
      expect(result.route_tx_hashes[0]).toHaveProperty('tx_hash');
      expect(result.route_tx_hashes[0]).toHaveProperty('amount_wei');
    });
  });
});
