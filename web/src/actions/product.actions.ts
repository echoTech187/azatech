import { Filter, Pagination, Sort } from "../domain/entities/models";
import { productRepository } from "../infrastructure/repositories/product.repository";

export async function getMasterProductsAction(pagination: Pagination, filter: Filter, sort: Sort) {
    try {
        const response = await productRepository.getProducts(pagination, filter, sort);
        return response;
    } catch (error) {
        console.error('Error fetching products:', error);
        throw error;
    }
}

export async function createMasterProductAction(data: any) {
    try {
        const response = await productRepository.createProduct(data);
        return response;
    } catch (error) {
        console.error('Error creating product:', error);
        throw error;
    }
}

export async function updateMasterProductAction(id: string | number, payload: any) {
    try {
        const response = await productRepository.updateProduct(id, payload);
        return response;
    } catch (error) {
        console.error('Error updating product:', error);
        throw error;
    }
}

export async function deleteMasterProductAction(id: string | number) {
    try {
        const response = await productRepository.deleteProduct(id);
        return response;
    } catch (error) {
        console.error('Error deleting product:', error);
        throw error;
    }
}

export async function adjustProductStockAction(productId: string | number, payload: { quantity_change: number; note: string }) {
    try {
        const response = await productRepository.adjustStock(productId, payload);
        return response;
    } catch (error) {
        console.error('Error adjusting product stock:', error);
        throw error;
    }
}

export async function getProductStockMovementsAction(productId: string | number) {
    try {
        const response = await productRepository.getStockMovements(productId);
        return response;
    } catch (error) {
        console.error('Error fetching stock movements:', error);
        throw error;
    }
}
