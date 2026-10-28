import { apiClient } from "../http/api-client";
import { Filter, Pagination, Sort } from "@/src/domain/entities/models";

export interface ProductFilterParams {
    page?: number;
    per_page?: number;
    search?: string;
    is_active?: boolean;
    sort_by?: string;
    sort_dir?: 'asc' | 'desc' | string;
    sort_direction?: 'asc' | 'desc' | string;
}

export const productRepository = {
    async getProducts(pagination: Pagination, filter: Filter, sort: Sort) {
        try {
            const params = new URLSearchParams();
            params.append('page', String(pagination.page));
            params.append('limit', String(pagination.limit));
            params.append('per_page', String(pagination.limit));
            if (filter.search) params.append('search', filter.search);
            if (filter.status && filter.status !== 'all') params.append('status', filter.status);
            if (filter.is_active !== undefined) params.append('is_active', String(filter.is_active));
            params.append('sort_by', sort.field);
            params.append('sort_dir', sort.order);

            const response = await apiClient.get(`/products?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching products:', error);
            throw error;
        }
    },
    async list(params: ProductFilterParams) {
        try {
            const queryParams = new URLSearchParams();
            if (params.page) queryParams.append('page', String(params.page));
            if (params.per_page) {
                queryParams.append('per_page', String(params.per_page));
                queryParams.append('limit', String(params.per_page));
            }
            if (params.search) queryParams.append('search', params.search);
            if (params.is_active !== undefined) queryParams.append('is_active', String(params.is_active));
            if (params.sort_by) queryParams.append('sort_by', params.sort_by);
            const sortDirection = params.sort_dir || params.sort_direction;
            if (sortDirection) queryParams.append('sort_dir', sortDirection);

            const response = await apiClient.get(`/products?${queryParams.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error listing products:', error);
            throw error;
        }
    },
    async createProduct(data: any) {
        try {
            const response = await apiClient.post(`/products`, data);
            return response.data;
        } catch (error) {
            console.error('Error creating product:', error);
            throw error;
        }
    },
    async updateProduct(id: string | number, payload: any) {
        try {
            const response = await apiClient.put(`/products/${id}`, payload);
            return response.data;
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    },
    async deleteProduct(id: string | number) {
        try {
            const response = await apiClient.delete(`/products/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    },
    async adjustStock(productId: string | number, payload: { quantity_change: number; note: string }) {
        try {
            const response = await apiClient.post(`/products/${productId}/stock-adjustments`, payload);
            return response.data;
        } catch (error) {
            console.error('Error adjusting product stock:', error);
            throw error;
        }
    },
    async getStockMovements(productId: string | number) {
        try {
            const response = await apiClient.get(`/products/${productId}/stock-movements`);
            return response.data;
        } catch (error) {
            console.error('Error fetching product stock movements:', error);
            throw error;
        }
    },
    create: (data: any) => productRepository.createProduct(data),
    update: (id: string | number, payload: any) => productRepository.updateProduct(id, payload),
    remove: (id: string | number) => productRepository.deleteProduct(id),
    createStockAdjustment: (id: string | number, payload: { quantity_change: number; note: string }) =>
        productRepository.adjustStock(id, payload),
};