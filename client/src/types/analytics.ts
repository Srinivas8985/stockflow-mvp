import { Product } from './product';

export interface DashboardAnalytics {
  totalProducts: number;
  totalQuantity: number;
  lowStockCount: number;
  lowStockProducts: Product[];
}

