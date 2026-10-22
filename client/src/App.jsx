import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DisclaimerBanner } from './components/layout/DisclaimerBanner';
import { HomePage } from './pages/HomePage';
import { PairViewPage } from './pages/PairViewPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { SignalsPage } from './pages/SignalsPage';
import { PerformancePage } from './pages/PerformancePage';
import { AgentsPage } from './pages/AgentsPage';
import { RiskMt5Page } from './pages/RiskMt5Page';
import { SettingsPage } from './pages/SettingsPage';
import { HealthPage } from './pages/HealthPage';
import { AuthPage } from './pages/AuthPage';
import { supabase } from './lib/supabase';

export function App() {
  const { user, loading: authLoading } = useAuth();
  const [currentTab, setTab] = useState('home');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load calendar and signals from API
  async function loadData() {
    setLoading(true);
    try {
      const [eventsRes, signalsRes] = await Promise.all([
        fetch('/api/calendar/upcoming?limit=25').catch(() => null),
        fetch('/api/signals/latest').catch(() => null)
      ]);

      if (eventsRes && eventsRes.ok) {
        const eventsJson = await eventsRes.json();
        if (eventsJson.data) setEvents(eventsJson.data);
      }

      if (signalsRes && signalsRes.ok) {
        const signalsJson = await signalsRes.json();
        if (signalsJson.data) setSignals(signalsJson.data);
      }
    } catch (err) {
      console.warn('Could not fetch initial data from server, using fallbacks:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    // 30s background polling fallback
    const pollInterval = setInterval(loadData, 30000);

    // Supabase Realtime subscription
    let channel = null;
    if (supabase) {
      channel = supabase
        .channel('public-market-intelligence')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, (payload) => {
          console.log('[Realtime Event Update]', payload);
          loadData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'signals' }, (payload) => {
          console.log('[Realtime Signal Update]', payload);
          loadData();
        })
        .subscribe();
    }

    return () => {
      clearInterval(pollInterval);
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  function handleSelectEvent(event) {
    setSelectedEvent(event);
    setTab('event-detail');
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center font-mono text-xs text-terminal-cyan">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-terminal-cyan animate-ping"></div>
          <span>INITIALIZING MACRO TERMINAL ENVIRONMENT...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onLoginSuccess={loadData} />;
  }

  return (
    <div className="min-h-screen bg-terminal-bg text-terminal-textBright flex flex-col">
      {/* 1. Regulatory & Risk Disclaimer Banner */}
      <DisclaimerBanner />

      {/* 2. Top Terminal Navigation Header */}
      <Header nextEvent={events[0]} />

      {/* 3. Main Workspace: Sidebar + Scrollable View */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentTab={currentTab} setTab={setTab} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-terminal-bg">
          {currentTab === 'home' && (
            <HomePage
              events={events}
              signals={signals}
              onSelectEvent={handleSelectEvent}
              onRefreshCalendar={loadData}
              loading={loading}
            />
          )}

          {currentTab === 'pairs' && (
            <PairViewPage signals={signals} />
          )}

          {currentTab === 'event-detail' && (
            <EventDetailPage
              event={selectedEvent || events[0]}
              onBack={() => setTab('home')}
            />
          )}

          {currentTab === 'signals' && (
            <SignalsPage signals={signals} />
          )}

          {currentTab === 'performance' && (
            <PerformancePage />
          )}

          {currentTab === 'agents' && (
            <AgentsPage />
          )}

          {currentTab === 'risk-mt5' && (
            <RiskMt5Page events={events} />
          )}

          {currentTab === 'health' && (
            <HealthPage />
          )}

          {currentTab === 'settings' && (
            <SettingsPage />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
