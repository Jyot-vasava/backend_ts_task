import { Router } from 'express';
import { createOrg, getOrg, updateOrg, deleteOrg } from '../controllers/orgController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/create', createOrg);
router.get('/get', getOrg);
router.put('/update', authenticate, updateOrg);
router.delete('/delete', authenticate, deleteOrg);

export default router;