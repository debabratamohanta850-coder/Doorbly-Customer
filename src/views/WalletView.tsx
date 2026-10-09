import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchCustomerWallet,
  fetchAvailableCoupons
} from '../services/profileService';
import { WalletTransaction, DoorblyCoupon } from '../types/supabase';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Tag,
  Share2,
  Copy,
  Check,
  Gift,
  Clock,
  ShieldCheck
} from 'lucide-react';

interface Props {
  onOpenAuth: () => void;
  onNavigateTab: (tab: 'home' | 'services' | 'bookings' | 'cart' | 'wallet' | 'profile') => void;
}

export const WalletView: React.FC<Props> = ({ onOpenAuth }) => {
  const { user, profile } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [coupons, setCoupons] = useState<DoorblyCoupon[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSubTab, setActiveSubTab] = useState<'transactions' | 'coupons' | 'referral'>('transactions');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [walletData, couponList] = await Promise.all([
        user?.id ? fetchCustomerWallet(user.id) : Promise.resolve({ balance: 0, transactions: [] }),
        fetchAvailableCoupons()
      ]);
      setBalance(walletData.balance);
      setTransactions(walletData.transactions);
      setCoupons(couponList);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const referralCode =
    profile?.referral_code ||
    (user?.id ? `DBLY-${user.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}` : '');

  const handleCopyText = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const handleShareReferral = async () => {
    if (!referralCode) return;
    const shareText = `Book trusted doorstep services on Doorbly! Use my referral code ${referralCode} when signing up.`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Doorbly Customer Referral',
          text: shareText,
          url: window.location.origin
        });
      } catch {}
    } else {
      handleCopyText(referralCode);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pb-28 bg-slate-50 text-slate-900 flex flex-col">
      {/* Header & Real Wallet Balance Card */}
      <div className="bg-[#0F766E] text-white px-5 pt-4 pb-6 rounded-b-3xl shadow-xs shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Doorbly Wallet &amp; Offers</h1>
            <p className="text-xs text-teal-100/90 mt-0.5">
              Verified balance, refunds, coupons &amp; referrals
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
            title="Refresh Wallet"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Balance Display — Strictly ₹0 when no balance exists */}
        <div className="bg-white/10 border border-white/20 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-teal-100 font-medium block">
              Available Doorbly Balance
            </span>
            <p className="text-2xl font-extrabold text-white mt-0.5 tracking-tight">
              ₹{balance.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-teal-100/80 mt-1">
              Applicable on all doorstep &amp; scheduled services
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-emerald-300" />
          </div>
        </div>

        {/* Segmented Sub-tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-black/15 rounded-xl mt-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveSubTab('transactions')}
            className={`py-2 rounded-lg transition-colors ${
              activeSubTab === 'transactions'
                ? 'bg-white text-teal-950 font-bold shadow-2xs'
                : 'text-teal-100 hover:text-white'
            }`}
          >
            Transactions
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('coupons')}
            className={`py-2 rounded-lg transition-colors ${
              activeSubTab === 'coupons'
                ? 'bg-white text-teal-950 font-bold shadow-2xs'
                : 'text-teal-100 hover:text-white'
            }`}
          >
            Coupons ({coupons.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('referral')}
            className={`py-2 rounded-lg transition-colors ${
              activeSubTab === 'referral'
                ? 'bg-white text-teal-950 font-bold shadow-2xs'
                : 'text-teal-100 hover:text-white'
            }`}
          >
            Referrals
          </button>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">
        {!user && activeSubTab !== 'coupons' ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center my-3 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900">
              Sign in to access your Doorbly Wallet
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
              View your real wallet balance, refunds, cashback, and referral code.
            </p>
            <button
              type="button"
              onClick={onOpenAuth}
              className="mt-4 px-5 py-2.5 bg-[#0F766E] text-white text-xs font-bold rounded-xl hover:bg-teal-800 transition-colors"
            >
              Sign In
            </button>
          </div>
        ) : activeSubTab === 'transactions' ? (
          transactions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-2xs">
              <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No wallet transactions yet</h3>
              <p className="text-xs text-slate-500 mt-1">
                Your wallet credits, refunds, and service payments will appear here.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs">
              {transactions.map((tx) => {
                const isCredit = tx.type === 'CREDIT' || tx.type === 'REFUND' || tx.type === 'CASHBACK';
                return (
                  <div key={tx.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isCredit ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {isCredit ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{tx.description}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {tx.type} · {new Date(tx.created_at).toLocaleDateString('en-IN')} · {tx.status}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-extrabold ${
                        isCredit ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {isCredit ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                );
              })}
            </div>
          )
        ) : activeSubTab === 'coupons' ? (
          coupons.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-2xs">
              <Tag className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No active coupons right now</h3>
              <p className="text-xs text-slate-500 mt-1">
                Verified Doorbly promotional offers and seasonal discounts will appear here when active.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {coupons.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start justify-between gap-3 shadow-2xs"
                >
                  <div>
                    <p className="text-xs font-extrabold text-[#0F766E] font-mono tracking-wider">
                      {c.code}
                    </p>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">{c.title}</h4>
                    {c.description && (
                      <p className="text-xs text-slate-500 mt-1">{c.description}</p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Min. booking: ₹{c.min_booking_value}
                      {c.eligible_category ? ` · Valid on ${c.eligible_category}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText(c.code)}
                    className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-[#0F766E] font-bold text-xs rounded-xl flex items-center space-x-1 shrink-0"
                  >
                    {copiedCode === c.code ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Referral Tab */
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#0F766E] flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Invite Friends to Doorbly</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Share your Doorbly referral code with friends and family across Odisha. Eligible referral rewards configured by Doorbly are credited upon their first completed service.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">
                  Your Unique Referral Code
                </span>
                <span className="text-sm font-mono font-extrabold text-slate-900 tracking-wider">
                  {referralCode}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleCopyText(referralCode)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center space-x-1"
                >
                  {copiedCode === referralCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleShareReferral}
                  className="px-3 py-1.5 bg-[#0F766E] text-white rounded-xl text-xs font-bold flex items-center space-x-1"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-[11px] text-slate-500 pt-1">
              <ShieldCheck className="w-4 h-4 text-[#0F766E] shrink-0" />
              <span>Rewards are verified and credited automatically after service completion.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
