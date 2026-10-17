import cron from 'node-cron';
import { calendarService } from '../services/calendarService.js';
import { logger } from '../utils/logger.js';

export function startCalendarCron() {
  logger.info('Initializing Economic Calendar Cron Job (Every 15 minutes)...');

  // Initial sync on startup (after 5 seconds delay)
  setTimeout(() => {
    calendarService.syncCalendar().catch(err => {
      logger.warn('Initial calendar sync warning', { message: err.message });
    });
  }, 5000);

  // Scheduled recurring job
  cron.schedule('*/15 * * * *', async () => {
    logger.info('Running scheduled calendar sync...');
    try {
      await calendarService.syncCalendar();
    } catch (err) {
      logger.error('Error during scheduled calendar sync', { error: err.message });
    }
  });
}
