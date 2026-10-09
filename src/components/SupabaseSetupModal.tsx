import React, { useState } from 'react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  resetSupabaseConfig,
  testSupabaseConnection,
  isSupabaseReady
} from '../lib/supabaseClient';
import {
  getFirebaseConfig,
  saveFirebaseConfig,
  resetFirebaseConfig,
  getFirebaseAppInstance
} from '../services/fcmService';
import { DOORBLY_SUPABASE_SCHEMA_SQL } from '../lib/doorblySchemaSql';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ShieldCheck,
  Key,
  Globe,
  ExternalLink,
  RefreshCw,
  X,
  Flame
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'credentials' | 'firebase' | 'sql';
}

export const SupabaseSetupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialTab = 'credentials'
}) => {
  const currentConfig = getSupabaseConfig();
  const currentFbConfig = getFirebaseConfig();

  const [url, setUrl] = useState(currentConfig.url || '');
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeTab, setActiveTab] = useState<'credentials' | 'firebase' | 'sql'>(initialTab);

  // Firebase Settings State
  const [fbApiKey, setFbApiKey] = useState(currentFbConfig.apiKey);
  const [fbAuthDomain, setFbAuthDomain] = useState(currentFbConfig.authDomain || '');
  const [fbProjectId, setFbProjectId] = useState(currentFbConfig.projectId);
  const [fbStorageBucket, setFbStorageBucket] = useState(currentFbConfig.storageBucket || '');
  const [fbMessagingSenderId, setFbMessagingSenderId] = useState(currentFbConfig.messagingSenderId);
  const [fbAppId, setFbAppId] = useState(currentFbConfig.appId);
  const [fbVapidKey, setFbVapidKey] = useState(currentFbConfig.vapidKey || '');
  const [fbResult, setFbResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    try {
      saveSupabaseConfig(url, anonKey);
      const res = await testSupabaseConnection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to save Supabase credentials'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleReset = () => {
    resetSupabaseConfig();
    const updated = getSupabaseConfig();
    setUrl(updated.url);
    setAnonKey(updated.anonKey);
    setTestResult(null);
  };

  const handleSaveFirebase = (e: React.FormEvent) => {
    e.preventDefault();
    const saved = saveFirebaseConfig({
      apiKey: fbApiKey,
      authDomain: fbAuthDomain,
      projectId: fbProjectId,
      storageBucket: fbStorageBucket,
      messagingSenderId: fbMessagingSenderId,
      appId: fbAppId,
      vapidKey: fbVapidKey || undefined
    });

    const app = getFirebaseAppInstance();
    if (saved && app) {
      setFbResult({
        success: true,
        message: `Firebase Project "${fbProjectId}" (App ID: ${fbAppId}) configured and active for Authentication & Cloud Messaging!`
      });
    } else {
      setFbResult({
        success: false,
        message: 'Please provide valid Firebase API Key, Project ID, and App ID.'
      });
    }
  };

  const handleResetFirebase = () => {
    const def = resetFirebaseConfig();
    setFbApiKey(def.apiKey);
    setFbAuthDomain(def.authDomain || '');
    setFbProjectId(def.projectId);
    setFbStorageBucket(def.storageBucket || '');
    setFbMessagingSenderId(def.messagingSenderId);
    setFbAppId(def.appId);
    setFbVapidKey(def.vapidKey || '');
    setFbResult({
      success: true,
      message: 'Restored default Doorbly Firebase configuration (doorbly-b0bba).'
    });
  };

  const copySqlToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(DOORBLY_SUPABASE_SCHEMA_SQL);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch (err) {
      console.error('Failed to copy SQL:', err);
    }
  };

  const ready = isSupabaseReady();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0F766E] text-white p-5 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Database className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base leading-tight">Cloud Integrations &amp; Keys</h3>
                {ready ? (
                  <span className="text-[10px] bg-emerald-400/20 text-emerald-100 border border-emerald-300/30 px-2 py-0.5 rounded-full font-medium">
                    Connected
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-400/20 text-amber-100 border border-amber-300/30 px-2 py-0.5 rounded-full font-medium">
                    Action Required
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Supabase Database &amp; Firebase Auth / Push Messaging Settings
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('credentials')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'credentials'
                ? 'border-teal-700 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Supabase Keys
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('firebase')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'firebase'
                ? 'border-teal-700 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Firebase Settings &amp; Keys</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'sql'
                ? 'border-teal-700 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>Database SQL</span>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-mono">
              SQL
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-800">
          {activeTab === 'credentials' ? (
            <form onSubmit={handleSaveAndTest} className="space-y-4">
              <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-3.5 flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-slate-700">
                  <p className="font-semibold text-teal-900">Supabase Project Connection</p>
                  <p className="mt-0.5">
                    Connected to <code className="bg-teal-100 px-1 py-0.5 rounded text-teal-800">tzqdcozwllahqmoqfawt.supabase.co</code> using the public <code className="bg-teal-100 px-1 py-0.5 rounded text-teal-800">anon</code> key.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-500" />
                    <span>Supabase Project URL</span>
                  </span>
                  <a
                    href="https://supabase.com/dashboard/project/tzqdcozwllahqmoqfawt/settings/api"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-teal-700 hover:underline flex items-center space-x-1"
                  >
                    <span>Supabase API settings</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://tzqdcozwllahqmoqfawt.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-500" />
                  <span>Supabase Anonymous API Key</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                />
              </div>

              {testResult && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs flex items-start space-x-2.5 ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold">{testResult.success ? 'Connected Successfully' : 'Connection Error'}</p>
                    <p className="mt-0.5 leading-relaxed">{testResult.message}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={isTesting}
                  className="flex-1 py-2.5 px-4 bg-teal-700 hover:bg-teal-800 active:scale-[0.99] text-white rounded-xl font-semibold text-xs transition-all shadow-xs flex items-center justify-center space-x-2"
                >
                  {isTesting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{isTesting ? 'Verifying Supabase...' : 'Save & Test Real Connection'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs transition-colors"
                >
                  Reset
                </button>
              </div>
            </form>
          ) : activeTab === 'firebase' ? (
            <form onSubmit={handleSaveFirebase} className="space-y-3.5">
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 flex items-start justify-between gap-3">
                <div className="flex items-start space-x-2.5">
                  <Flame className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed text-slate-700">
                    <p className="font-bold text-slate-900">Firebase Authentication &amp; FCM Integration</p>
                    <p className="mt-0.5 text-[11px]">
                      Active Project: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-amber-900">{fbProjectId}</code>
                    </p>
                  </div>
                </div>
                <a
                  href={`https://console.firebase.google.com/project/${fbProjectId}/settings/general`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold text-teal-700 hover:underline flex items-center space-x-1 shrink-0"
                >
                  <span>Console</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    apiKey
                  </label>
                  <input
                    type="text"
                    required
                    value={fbApiKey}
                    onChange={(e) => setFbApiKey(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    projectId
                  </label>
                  <input
                    type="text"
                    required
                    value={fbProjectId}
                    onChange={(e) => setFbProjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    messagingSenderId
                  </label>
                  <input
                    type="text"
                    required
                    value={fbMessagingSenderId}
                    onChange={(e) => setFbMessagingSenderId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    authDomain
                  </label>
                  <input
                    type="text"
                    required
                    value={fbAuthDomain}
                    onChange={(e) => setFbAuthDomain(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    storageBucket
                  </label>
                  <input
                    type="text"
                    required
                    value={fbStorageBucket}
                    onChange={(e) => setFbStorageBucket(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    appId
                  </label>
                  <input
                    type="text"
                    required
                    value={fbAppId}
                    onChange={(e) => setFbAppId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Web Push VAPID Key (Optional for FCM Web Push)
                  </label>
                  <input
                    type="text"
                    placeholder="Optional Cloud Messaging Web Push certificate key"
                    value={fbVapidKey}
                    onChange={(e) => setFbVapidKey(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {fbResult && (
                <div
                  className={`p-3 rounded-2xl border text-xs flex items-start space-x-2 ${
                    fbResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {fbResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{fbResult.message}</span>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-[#0F766E] hover:bg-teal-800 text-white rounded-xl font-bold text-xs transition-all shadow-xs flex items-center justify-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save &amp; Verify Firebase Config</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetFirebase}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs transition-colors"
                >
                  Reset Default
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Doorbly Database Setup Script</h4>
                  <p className="text-[11px] text-slate-500">
                    Creates tables for categories, services, bookings, locations, payments, and enables Realtime.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copySqlToClipboard}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors shadow-xs"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy SQL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-72 leading-relaxed border border-slate-800 select-all">
                  {DOORBLY_SUPABASE_SCHEMA_SQL}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-semibold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
