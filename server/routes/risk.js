import express from 'express';
import { riskFilterService } from '../services/riskFilterService.js';
import { formatApiResponse, formatApiError } from '../utils/apiResponse.js';

const router = express.Router();

// GET /api/risk/windows
router.get('/windows', async (req, res, next) => {
  try {
    const preMinutes = parseInt(req.query.preMinutes || '15', 10);
    const postMinutes = parseInt(req.query.postMinutes || '15', 10);
    const windows = await riskFilterService.getNoTradeWindows({ preMinutes, postMinutes });
    res.json(formatApiResponse(windows, 'No-trade windows retrieved successfully'));
  } catch (err) {
    next(err);
  }
});

// GET /api/risk/spread-matrix
router.get('/spread-matrix', (req, res) => {
  const matrix = riskFilterService.getSpreadWideningMatrix();
  res.json(formatApiResponse(matrix, 'Expected spread widening matrix retrieved'));
});

// GET /api/risk/mt5-export (Downloadable or JSON)
router.get('/mt5-export', async (req, res, next) => {
  try {
    const format = (req.query.format || 'json').toLowerCase();
    const preMinutes = parseInt(req.query.preMinutes || '15', 10);
    const postMinutes = parseInt(req.query.postMinutes || '15', 10);

    const exportFile = await riskFilterService.generateMt5Export({ format, preMinutes, postMinutes });

    if (req.query.download === 'true') {
      res.setHeader('Content-Type', exportFile.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportFile.filename}"`);
      return res.send(exportFile.content);
    }

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      return res.send(exportFile.content);
    }

    res.json(formatApiResponse(exportFile.data, 'MT5 news filter export generated'));
  } catch (err) {
    next(err);
  }
});

// GET /api/risk/mt5-code-snippet
router.get('/mt5-code-snippet', (req, res) => {
  const mql5Snippet = `//+------------------------------------------------------------------+
//| Macro News Filter Integration for MetaTrader 5 Expert Advisor   |
//| Reads macro_news_filter.csv from MQL5/Files/                     |
//+------------------------------------------------------------------+
bool IsNewsLockdownActive(string targetCurrency = "USD")
{
   string filename = "macro_news_filter.csv";
   int fileHandle = FileOpen(filename, FILE_READ | FILE_CSV | FILE_ANSI, ',');
   if(fileHandle == INVALID_HANDLE)
   {
      Print("Warning: Could not open ", filename, " in MQL5/Files. Defaulting to trade-allowed.");
      return false;
   }

   datetime currentTime = TimeCurrent();
   bool inLockdown = false;

   // Skip CSV header line
   FileReadString(fileHandle);

   while(!FileIsEnding(fileHandle))
   {
      string eventId    = FileReadString(fileHandle);
      string eventName  = FileReadString(fileHandle);
      string currency   = FileReadString(fileHandle);
      string impact     = FileReadString(fileHandle);
      string releaseStr = FileReadString(fileHandle);
      string startStr   = FileReadString(fileHandle);
      string endStr     = FileReadString(fileHandle);
      double maxSpread  = FileReadNumber(fileHandle);

      if(currency == targetCurrency || currency == "ALL")
      {
         datetime startTime = StringToTime(startStr);
         datetime endTime   = StringToTime(endStr);

         if(currentTime >= startTime && currentTime <= endTime)
         {
            PrintFormat("[NEWS FILTER LOCKDOWN] Trading suspended for %s (%s). Current: %s, Window: [%s to %s]",
                        eventName, currency, TimeToString(currentTime), startStr, endStr);
            inLockdown = true;
            break;
         }
      }
   }

   FileClose(fileHandle);
   return inLockdown;
}`;

  res.json(formatApiResponse({ code: mql5Snippet }, 'MQL5 EA Integration Code Snippet retrieved'));
});

export default router;
