import { Router } from 'express';
import { inventoryController } from './inventory.controller';
import { authenticate } from '../../middleware/authenticate';
import { validateRequest } from '../../middleware/validateRequest';
import {
  createProductSchema,
  updateProductSchema,
  updateQuantitySchema,
  queryProductsSchema,
} from './inventory.schema';

const router = Router();

// Protect all product endpoints with JWT authentication
router.use(authenticate);

router.post(
  '/',
  validateRequest({ body: createProductSchema }),
  (req, res, next) => inventoryController.createProduct(req, res, next)
);

router.get(
  '/',
  validateRequest({ query: queryProductsSchema }),
  (req, res, next) => inventoryController.getProducts(req, res, next)
);

router.get('/:id', (req, res, next) =>
  inventoryController.getProductById(req, res, next)
);

router.patch(
  '/:id',
  validateRequest({ body: updateProductSchema }),
  (req, res, next) => inventoryController.updateProduct(req, res, next)
);

router.patch(
  '/:id/quantity',
  validateRequest({ body: updateQuantitySchema }),
  (req, res, next) => inventoryController.updateQuantity(req, res, next)
);

router.delete('/:id', (req, res, next) =>
  inventoryController.deleteProduct(req, res, next)
);

export default router;

