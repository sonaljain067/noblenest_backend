import { Router } from 'express';
import { fetchBarCharts, fetchDashboardStats, fetchLineCharts, fetchPieCharts } from '../controllers/dashboard.controller.js';
import { isAdmin, verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verifyJWT, isAdmin); 

router.route("/").get(fetchDashboardStats);

router.route("/pie").get(fetchPieCharts);

router.route("/bar").get(fetchBarCharts); 

router.route("/line").get(fetchLineCharts);

export default router; 