import express from 'express';
import { createJourney, getJourneys, getJourneyById, updateOccupancyByDriver,getPassengersByDriverPhone  } from '../controllers/journeyController.js';
const journeyRoutes = express.Router();
journeyRoutes.use(express.json());
journeyRoutes.get('/driver/passengers', getPassengersByDriverPhone);
journeyRoutes.post('/journeys', createJourney);
journeyRoutes.get('/journeys', getJourneys)
journeyRoutes.get('/journeys/:id', getJourneyById);
journeyRoutes.post('/journeys/update', updateOccupancyByDriver);
 
export default journeyRoutes;