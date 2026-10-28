import { customerRepository, CreateCustomerPayload, CustomerFilterParams } from "../infrastructure/repositories/customer.repository";

export async function getMasterCustomersAction(params: CustomerFilterParams) {
  try {
    return await customerRepository.list(params);
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
}

export async function createMasterCustomerAction(payload: CreateCustomerPayload) {
  try {
    return await customerRepository.create(payload);
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
}

export async function updateMasterCustomerAction(id: string, payload: Partial<CreateCustomerPayload>) {
  try {
    return await customerRepository.update(id, payload);
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
}

export async function deleteMasterCustomerAction(id: string) {
  try {
    return await customerRepository.remove(id);
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
}
