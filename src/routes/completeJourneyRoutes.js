import express from 'express';
import { endJourney,  getEndedJourneys } from '../controllers/completeJourneyController.js';
const completeJourneyRoutes = express.Router();
completeJourneyRoutes.use(express.json());

completeJourneyRoutes.post('/endJourneys', endJourney);
completeJourneyRoutes.get('/endJourneys',getEndedJourneys )
 
export default completeJourneyRoutes;