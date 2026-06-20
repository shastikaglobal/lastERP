import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Dashboard from './Dashboard';
import Counts from './Counts';
import JournalEntry from './JournalEntry';
import Ledger from './Ledger';
import TrialBalance from './TrialBalance';
import GSTReports from './GSTReports';
import PLStatement from './PLStatement';
import Parties from './Parties';
import BalanceSheet from './BalanceSheet';
import ChartOfAccounts from './ChartOfAccounts';
import CreateParty from './CreateParty';

export const PAGES = {
  DASHBOARD: 'DASHBOARD',
  COUNTS: 'COUNTS',
  JOURNAL_ENTRY: 'JOURNAL_ENTRY',
  LEDGER: 'LEDGER',
  TRIAL_BALANCE: 'TRIAL_BALANCE',
  GST_REPORTS: 'GST_REPORTS',
  PL_STATEMENT: 'PL_STATEMENT',
  PARTIES: 'PARTIES',
  BALANCE_SHEET: 'BALANCE_SHEET',
  CHART_OF_ACCOUNTS: 'CHART_OF_ACCOUNTS',
};

export const PAGE_META = {
  [PAGES.DASHBOARD]: { component: Dashboard, path: '/' },
  [PAGES.COUNTS]: { component: Counts, path: '/counts' },
  [PAGES.JOURNAL_ENTRY]: { component: JournalEntry, path: '/journal-entry' },
  [PAGES.LEDGER]: { component: Ledger, path: '/ledger' },
  [PAGES.TRIAL_BALANCE]: { component: TrialBalance, path: '/trial-balance' },
  [PAGES.GST_REPORTS]: { component: GSTReports, path: '/gst-reports' },
  [PAGES.PL_STATEMENT]: { component: PLStatement, path: '/pl-statement' },
  [PAGES.PARTIES]: { component: Parties, path: '/parties' },
  [PAGES.BALANCE_SHEET]: { component: BalanceSheet, path: '/balance-sheet' },
  [PAGES.CHART_OF_ACCOUNTS]: { component: ChartOfAccounts, path: '/chart-of-accounts' },
};

const TallyIndex = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="counts" element={<Counts />} />
      <Route path="journal-entry" element={<JournalEntry />} />
      <Route path="ledger" element={<Ledger />} />
      <Route path="trial-balance" element={<TrialBalance />} />
      <Route path="gst-reports" element={<GSTReports />} />
      <Route path="pl-statement" element={<PLStatement />} />
      <Route path="parties" element={<Parties />} />
      <Route path="parties/create" element={<CreateParty />} />
      <Route path="balance-sheet" element={<BalanceSheet />} />
      <Route path="chart-of-accounts" element={<ChartOfAccounts />} />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  );
};

export default TallyIndex;
