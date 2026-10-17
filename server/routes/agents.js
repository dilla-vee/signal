import express from 'express';
import { runAnalyticalAgents, ANALYTICAL_AGENTS } from '../services/agentCoordinatorService.js';
import { supabaseAdmin } from '../config/supabase.js';
import { formatApiResponse, formatApiError } from '../utils/apiResponse.js';

const router = express.Router();

// GET /api/agents
router.get('/', (req, res) => {
  const agentList = ANALYTICAL_AGENTS.map((agent, idx) => ({
    id: idx + 1,
    name: agent.name,
    role: agent.role,
    status: 'ONLINE'
  }));

  res.json(formatApiResponse(agentList, 'Active analytical agents team'));
});

// POST /api/agents/run
router.post('/run', async (req, res, next) => {
  try {
    const { eventId, pair = 'XAUUSD' } = req.body;
    const result = await runAnalyticalAgents({ eventId, pair });
    res.json(formatApiResponse(result, `Completed AI team analysis for ${pair.toUpperCase()}`));
  } catch (err) {
    next(err);
  }
});

// GET /api/agents/runs/:runId
router.get('/runs/:runId', async (req, res, next) => {
  try {
    const { runId } = req.params;
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('agent_outputs')
        .select('*')
        .eq('run_id', runId);

      if (!error && data) {
        return res.json(formatApiResponse(data, `Agent outputs for run ${runId}`));
      }
    }

    res.json(formatApiResponse([], `No outputs found for run ${runId}`));
  } catch (err) {
    next(err);
  }
});

export default router;
