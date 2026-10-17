import express from 'express';
import { parseMt5Csv, calculateTechnicalStructure, importPricesToDatabase, getRecentPrices } from '../services/priceImportService.js';
import { formatApiResponse, formatApiError } from '../utils/apiResponse.js';

const router = express.Router();

// GET /api/prices/:pair
router.get('/:pair', async (req, res, next) => {
  try {
    const { pair } = req.params;
    const { timeframe = 'M15', limit = 50 } = req.query;

    const candles = await getRecentPrices(pair, timeframe, parseInt(limit, 10));
    const technicals = calculateTechnicalStructure(candles, pair);

    res.json(formatApiResponse({
      pair: pair.toUpperCase(),
      timeframe: timeframe.toUpperCase(),
      candles,
      technicals
    }, `Retrieved price history and technical structure for ${pair.toUpperCase()}`));
  } catch (err) {
    next(err);
  }
});

// POST /api/prices/import-csv
router.post('/import-csv', async (req, res, next) => {
  try {
    const { csvContent, pair = 'XAUUSD', timeframe = 'M1' } = req.body;

    if (!csvContent) {
      return res.status(400).json(formatApiError('Missing csvContent in request body', null, 400));
    }

    const records = parseMt5Csv(csvContent, { pair, timeframe });
    const result = await importPricesToDatabase(records);

    res.json(formatApiResponse({
      importedCount: records.length,
      pair: pair.toUpperCase(),
      timeframe: timeframe.toUpperCase(),
      sample: records.slice(0, 3),
      status: result.status
    }, `Successfully parsed and imported ${records.length} price records`));
  } catch (err) {
    next(err);
  }
});

export default router;
