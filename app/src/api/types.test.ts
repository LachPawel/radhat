import { describe, it, expect } from 'vitest';
import type { DepositStatus } from './types';

describe('API Types', () => {
  describe('DepositStatus', () => {
    it('should have all valid status values', () => {
      const validStatuses: DepositStatus[] = ['pending', 'funded', 'deployed', 'routed', 'failed'];

      expect(validStatuses).toContain('pending');
      expect(validStatuses).toContain('funded');
      expect(validStatuses).toContain('deployed');
      expect(validStatuses).toContain('routed');
      expect(validStatuses).toContain('failed');
    });
  });

  describe('Status flow', () => {
    it('documents the expected status transitions', () => {
      // Status flow: pending → funded → deployed → routed
      //                                         ↘ failed
      const statusFlow = {
        pending: ['funded'],
        funded: ['deployed'],
        deployed: ['routed', 'failed'],
        routed: [], // terminal state
        failed: [], // terminal state
      };

      expect(statusFlow.pending).toContain('funded');
      expect(statusFlow.funded).toContain('deployed');
      expect(statusFlow.deployed).toContain('routed');
      expect(statusFlow.deployed).toContain('failed');
    });
  });
});
