import express from 'express';
import { calendarService } from '../services/calendarService.js';
import { formatApiResponse, formatApiError } from '../utils/apiResponse.js';

const router = express.Router();

// GET /api/calendar/upcoming
router.get('/upcoming', async (req, res, next) => {
  try {
    const { limit = 20, impact = 'HIGH', currency } = req.query;
    const events = await calendarService.getUpcomingEvents({
      limit: parseInt(limit, 10),
      impact,
      currency
    });
    res.json(formatApiResponse(events, 'Retrieved upcoming economic calendar events'));
  } catch (err) {
    next(err);
  }
});

// GET /api/calendar/events/:id
router.get('/events/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = await calendarService.getEventDetail(id);
    if (!event) {
      return res.status(404).json(formatApiError('Event not found', null, 404));
    }
    res.json(formatApiResponse(event, 'Retrieved event detail and playbook'));
  } catch (err) {
    next(err);
  }
});

// POST /api/calendar/sync
router.post('/sync', async (req, res, next) => {
  try {
    const result = await calendarService.syncCalendar();
    res.json(formatApiResponse(result, 'Calendar synchronized successfully'));
  } catch (err) {
    next(err);
  }
});

export default router;
