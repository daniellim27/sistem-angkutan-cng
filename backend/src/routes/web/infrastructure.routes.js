// src/routes/web/infrastructure.routes.js
const express = require("express");
const infrastructureRouter = express.Router();
const infrastructureController = require("../../controllers/web/infrastructureController");
const { verifyToken } = require("../../middlewares/auth.middleware");

infrastructureRouter.use(verifyToken);

// Categories and locations routes MUST come BEFORE the /:id route
infrastructureRouter.get('/categories', infrastructureController.getInfrastructureCategories);
infrastructureRouter.get('/locations', infrastructureController.getInfrastructureLocations);

// Infrastructure items routes
infrastructureRouter.get('/', infrastructureController.getAllInfrastructureItems);
infrastructureRouter.post('/', infrastructureController.createInfrastructureItem);
infrastructureRouter.post('/adjust', infrastructureController.adjustInfrastructure);

// Specific item routes
infrastructureRouter.get('/:id', infrastructureController.getInfrastructureItemById);
infrastructureRouter.put('/:id', infrastructureController.updateInfrastructureItem);
infrastructureRouter.delete('/:id', infrastructureController.deleteInfrastructureItem);

// Item-specific sub-routes
infrastructureRouter.get('/:id/batches', infrastructureController.getInfrastructureBatches);
infrastructureRouter.get('/:id/history', infrastructureController.getInfrastructureItemHistory);

// Cash integration routes
infrastructureRouter.get('/locations/:locationId/cash-summary', infrastructureController.getInfrastructureCashSummary);
infrastructureRouter.get('/locations/:locationId/cash-transactions', infrastructureController.getInfrastructureCashTransactions);

module.exports = infrastructureRouter;
