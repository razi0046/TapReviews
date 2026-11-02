import React, { useState, useEffect } from 'react';
import {
  getStoredSupabaseConfig,
  setStoredSupabaseConfig,
  testSupabaseConnection,
} from '../lib/supabase';
import { X, Database, Check, Copy, AlertCircle, RefreshCw, Code } from 'lucide-react';

interface SupabaseSetupModalProps {
  onClose: () => void;
  onConfigSaved: () => void;
}

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({
  onClose,
  onConfigSaved,
}) => {
  const [supabaseUrl, setSupabaseUrl] = useState<string>('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'config' | 'sql'>('config');

  useEffect(() => {
    const config = getStoredSupabaseConfig();
    setSupabaseUrl(config.url || '');
    setSupabaseAnonKey(config.anonKey || '');
  }, []);

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setTestResult({
        success: false,
        message: 'Please provide both the Supabase URL and the Anon public API key.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const result = await testSupabaseConnection(supabaseUrl.trim(), supabaseAnonKey.trim());
    setIsTesting(false);
    setTestResult(result);

    if (result.success) {
      setStoredSupabaseConfig(supabaseUrl.trim(), supabaseAnonKey.trim());
      onConfigSaved();
    }
  };

  const handleResetToLocal = () => {
    setStoredSupabaseConfig('', '');
    setSupabaseUrl('');
    setSupabaseAnonKey('');
    setTestResult({
      success: true,
      message: 'Switched to browser local persistent storage mode.',
    });
    onConfigSaved();
  };

  const sqlCode = `-- 1. Create businesses table
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL,
    slug TEXT NOT NULL,
    hero_image_url TEXT NOT NULL,
    welcome_message TEXT DEFAULT 'We''d love to hear about your experience...',
    tagline TEXT,
    google_review_url TEXT NOT NULL,
    instagram_url TEXT,
    website_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create review_templates table
CREATE TABLE IF NOT EXISTS public.review_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    satisfaction_level TEXT NOT NULL CHECK (satisfaction_level IN ('Excellent', 'Good', 'Average', 'Poor')),
    review_text TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Storage bucket setup
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-images', 'business-images', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active businesses"
ON public.businesses FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "Public read active review templates"
ON public.review_templates FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "Admin full access on businesses"
ON public.businesses FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access on review templates"
ON public.review_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#ECEAE4] overflow-hidden my-auto animate-fade-in">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#F2EFE8] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1C1C1E] text-white flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-[#1C1C1E]">
                Supabase Backend Setup
              </h3>
              <p className="text-xs text-[#8E8E93]">
                PostgreSQL & Storage configuration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-full text-[#8E8E93] hover:text-[#1C1C1E] hover:bg-[#FAF9F5] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#F2EFE8] px-6 pt-3 gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-2.5 transition-colors relative ${
              activeTab === 'config'
                ? 'text-[#1C1C1E] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#1C1C1E]'
                : 'text-[#8E8E93] hover:text-[#1C1C1E]'
            }`}
          >
            Connection Keys
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`pb-2.5 transition-colors relative ${
              activeTab === 'sql'
                ? 'text-[#1C1C1E] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#1C1C1E]'
                : 'text-[#8E8E93] hover:text-[#1C1C1E]'
            }`}
          >
            SQL Migration Script
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'config' ? (
            <form onSubmit={handleTestAndSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1C1C1E]">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E2DA] bg-[#FAF9F5] text-xs text-[#1C1C1E] focus:outline-none focus:border-[#1C1C1E] focus:bg-white transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1C1C1E]">
                  Supabase Anon (Public) Key
                </label>
                <input
                  type="password"
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E2DA] bg-[#FAF9F5] text-xs text-[#1C1C1E] focus:outline-none focus:border-[#1C1C1E] focus:bg-white transition-colors font-mono"
                />
                <p className="text-[11px] text-[#8E8E93]">
                  Never enter the secret service-role key in client code. Use your project's anon public key.
                </p>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {testResult.success ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="submit"
                  disabled={isTesting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#1C1C1E] hover:bg-black text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Test & Connect Supabase'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleResetToLocal}
                  className="py-2.5 px-4 rounded-xl border border-[#E5E2DA] text-xs font-medium text-[#636366] hover:text-[#1C1C1E] hover:bg-[#FAF9F5] transition-colors"
                >
                  Use Local Store
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1C1C1E]">
                  Run in Supabase SQL Editor
                </span>
                <button
                  onClick={handleCopySql}
                  className="px-2.5 py-1 bg-[#FAF9F5] border border-[#E5E2DA] rounded-lg text-xs font-medium text-[#1C1C1E] flex items-center gap-1 hover:bg-[#ECEAE4]"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
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
              <pre className="p-3 bg-[#FAF9F5] rounded-xl border border-[#E5E2DA] text-[11px] font-mono text-[#1C1C1E] max-h-60 overflow-y-auto leading-relaxed select-all">
                {sqlCode}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
