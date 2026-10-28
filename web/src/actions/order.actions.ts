import { orderRepository, OrderFilterParams } from "../infrastructure/repositories/order.repository";
import { OrderFormValues } from "../domain/schemas/order.schema";
import { OrderTransitionAction } from "../domain/entities/models";

export async function getOrdersAction(params: OrderFilterParams) {
  try {
    return await orderRepository.list(params);
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
}

export async function getOrderDetailAction(orderId: string | number) {
  try {
    return await orderRepository.getById(orderId);
  } catch (error) {
    console.error('Error fetching order detail:', error);
    throw error;
  }
}

export async function createOrderAction(payload: OrderFormValues, idempotencyKey: string) {
  try {
    return await orderRepository.create(payload, idempotencyKey);
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

export async function transitionOrderStatusAction(
  orderId: string | number,
  action: OrderTransitionAction,
  cancelReason?: string
) {
  try {
    return await orderRepository.transitionStatus(orderId, action, cancelReason);
  } catch (error) {
    console.error('Error transitioning order status:', error);
    throw error;
  }
}
