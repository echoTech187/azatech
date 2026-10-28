import { OrderStatus, Role } from '../../generated/prisma/client';
import { AppError } from '../../common/errors';

export type OrderAction = 'PAY' | 'SHIP' | 'COMPLETE' | 'CANCEL';

interface TransitionRule {
  from: OrderStatus[];
  to: OrderStatus;
  allowedRoles: Role[];
  requiresCancelReason?: boolean;
}

export class OrderStateMachine {
  private static readonly RULES: Record<OrderAction, TransitionRule> = {
    PAY: {
      from: ['PENDING'],
      to: 'PAID',
      allowedRoles: ['admin', 'cashier'],
    },
    SHIP: {
      from: ['PAID'],
      to: 'SHIPPED',
      allowedRoles: ['admin'],
    },
    COMPLETE: {
      from: ['SHIPPED'],
      to: 'COMPLETED',
      allowedRoles: ['admin'],
    },
    CANCEL: {
      from: ['PENDING', 'PAID'],
      to: 'CANCELLED',
      allowedRoles: ['admin'],
      requiresCancelReason: true,
    },
  };

  static validateTransition(
    currentStatus: OrderStatus,
    action: OrderAction,
    userRole: Role,
    cancelReason?: string
  ): OrderStatus {
    const rule = this.RULES[action];

    if (!rule.allowedRoles.includes(userRole)) {
      throw new AppError(403, `Role ${userRole} tidak diizinkan menjalankan aksi ${action}`);
    }

    if (!rule.from.includes(currentStatus)) {
      throw new AppError(
        409,
        `Transisi status tidak valid dari ${currentStatus} untuk aksi ${action}`
      );
    }

    if (rule.requiresCancelReason && (!cancelReason || cancelReason.trim().length === 0)) {
      throw new AppError(422, 'Alasan pembatalan (cancel_reason) wajib diisi', {
        cancel_reason: ['Alasan pembatalan wajib diisi'],
      });
    }

    return rule.to;
  }
}
