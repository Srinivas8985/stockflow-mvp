import { Request, Response, NextFunction } from 'express';
import { inventoryService } from './inventory.service';
import { QueryProductsInput } from './inventory.schema';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../utils/appError';

export class InventoryController {
  async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      // Organization ID derived exclusively from authenticated user context
      const product = await inventoryService.createProduct(req.user.organizationId, req.body);
      sendSuccess(res, product, 'Product created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      const query = req.query as unknown as QueryProductsInput;
      const result = await inventoryService.getProducts(req.user.organizationId, query);
      sendSuccess(res, result.items, 'Products retrieved successfully', 200, {
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const product = await inventoryService.getProductById(req.user.organizationId, id);
      sendSuccess(res, product, 'Product retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const product = await inventoryService.updateProduct(
        req.user.organizationId,
        id,
        req.body
      );
      sendSuccess(res, product, 'Product updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async updateQuantity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const product = await inventoryService.updateQuantity(
        req.user.organizationId,
        id,
        req.body.quantity
      );
      sendSuccess(res, product, 'Product stock quantity updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const result = await inventoryService.deleteProduct(req.user.organizationId, id);
      sendSuccess(res, result, 'Product deleted successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}

export const inventoryController = new InventoryController();

