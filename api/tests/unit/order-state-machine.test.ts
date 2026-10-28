import { describe, it, expect } from 'vitest';
import { OrderStateMachine } from '../../src/modules/orders/order.state-machine';

describe('OrderStateMachine Unit Tests', () => {
  it('allows PENDING -> PAID for both admin and cashier', () => {
    expect(OrderStateMachine.validateTransition('PENDING', 'PAY', 'cashier')).toBe('PAID');
    expect(OrderStateMachine.validateTransition('PENDING', 'PAY', 'admin')).toBe('PAID');
  });

  it('rejects SHIPPED -> CANCELLED with 409 Conflict', () => {
    expect(() =>
      OrderStateMachine.validateTransition('SHIPPED', 'CANCEL', 'admin', 'Terlambat')
    ).toThrowError(/Transisi status tidak valid/);
  });

  it('rejects CANCELLED -> CANCELLED (double cancel) with 409 Conflict', () => {
    expect(() =>
      OrderStateMachine.validateTransition('CANCELLED', 'CANCEL', 'admin', 'Batal lagi')
    ).toThrowError(/Transisi status tidak valid/);
  });

  it('rejects cashier attempting to SHIP or CANCEL with 403 Forbidden', () => {
    expect(() =>
      OrderStateMachine.validateTransition('PAID', 'SHIP', 'cashier')
    ).toThrowError(/tidak diizinkan/);
  });

  it('requires cancel_reason when cancelling PENDING or PAID order', () => {
    expect(() =>
      OrderStateMachine.validateTransition('PENDING', 'CANCEL', 'admin', '')
    ).toThrowError(/wajib diisi/);
  });
});
