export interface Product {
  id: string;
  organizationId: string;
  name: string;
  sku: string;
  description: string | null;
  quantity: number;
  costPrice: number | string | null;
  sellingPrice: number | string | null;
  lowStockThreshold: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  sku: string;
  description?: string | null;
  quantity?: number;
  costPrice?: number | null;
  sellingPrice?: number | null;
  lowStockThreshold?: number | null;
}

export interface UpdateProductInput {
  name?: string;
  sku?: string;
  description?: string | null;
  costPrice?: number | null;
  sellingPrice?: number | null;
  lowStockThreshold?: number | null;
}

export interface UpdateQuantityInput {
  quantity: number;
}

export interface ProductsQuery {
  page?: number;
  limit?: number;
  search?: string;
  lowStock?: boolean;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

