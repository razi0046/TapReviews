/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Business } from './types';
import { businessService, INITIAL_BUSINESSES } from './services/businessService';
import { parseReviewPath, parsePublicBusinessRoute } from './utils/slugify';
import { CustomerReviewPage } from './components/CustomerReviewPage';
import { AdminAuthGuard } from './components/AdminAuthGuard';
import { TapReviewsLogo } from './components/TapReviewsLogo';
import { CategoryBadge } from './utils/categoryMeta';
import { Crown, QrCode, Shield, ExternalLink, ArrowRight, Store, AlertCircle, Sparkles } from 'lucide-react';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoadingBusiness, setIsLoadingBusiness] = useState<boolean>(true);
  const [businessNotFound, setBusinessNotFound] = useState<boolean>(false);
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);

  // Listen to popstate (browser back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync state and load data whenever currentPath changes
  useEffect(() => {
    let isCancelled = false;
    const reviewInfo = parsePublicBusinessRoute(currentPath);

    if (reviewInfo) {
      setIsLoadingBusiness(true);
      setBusinessNotFound(false);

      businessService
        .getBusinessByIdentifier(reviewInfo.identifier, reviewInfo.slug)
        .then((found) => {
          if (!isCancelled) {
            if (found) {
              setBusiness(found);
              setBusinessNotFound(false);
            } else {
              setBusiness(null);
              setBusinessNotFound(true);
            }
            setIsLoadingBusiness(false);
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            console.error('Error fetching business:', err);
            setBusiness(null);
            setBusinessNotFound(true);
            setIsLoadingBusiness(false);
          }
        });
    } else {
      // Not a review path (either /admin or /)
      setBusiness(null);
      setBusinessNotFound(false);
      setIsLoadingBusiness(false);

      // Load businesses list for the home overview
      businessService.getAllBusinesses().then((list) => {
        if (!isCancelled) {
          setAllBusinesses(list);
        }
      });
    }

    return () => {
      isCancelled = true;
    };
  }, [currentPath]);

  // Client-side router navigation helper
  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const reviewRouteInfo = parsePublicBusinessRoute(currentPath);
  const isAdminRoute = currentPath === '/admin' || currentPath.startsWith('/admin');

  // =========================================================================
  // ROUTE 1: ADMIN PORTAL (/admin) - Protected by Supabase Auth & is_admin()
  // =========================================================================
  if (isAdminRoute) {
    return (
      <AdminAuthGuard
        onNavigateToReview={(slug, uuid) => navigateTo(`/business/${slug}`)}
        onNavigateHome={() => navigateTo('/')}
      />
    );
  }

  // =========================================================================
  // ROUTE 2: CUSTOMER REVIEW PAGE (/business/:slug or /r/:slug/:uuid)
  // =========================================================================
  if (reviewRouteInfo) {
    if (isLoadingBusiness) {
      return (
        <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#1C1C1E] border-t-transparent animate-spin mb-4" />
          <p className="text-sm font-semibold text-[#1C1C1E]">
            Loading business review page...
          </p>
          <p className="text-xs text-[#8E8E93] mt-1">Connecting NFC destination...</p>
        </div>
      );
    }

    if (businessNotFound || !business) {
      return (
        <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full border border-[#ECEAE4] shadow-md space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-[#1C1C1E]">Business Not Found</h2>
            <p className="text-xs text-[#636366]">
              This review link is invalid or may have expired. Please verify the NFC card or QR code.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => navigateTo('/')}
                className="w-full py-2.5 bg-[#1C1C1E] text-white rounded-xl text-xs font-semibold hover:bg-black transition-colors"
              >
                Return to Directory
              </button>
              <button
                onClick={() => navigateTo('/admin')}
                className="w-full py-2 bg-[#FAF9F5] border border-[#E5E2DA] text-[#636366] rounded-xl text-xs font-medium hover:text-[#1C1C1E]"
              >
                Open Admin Panel
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Check if business is inactive
    if (!business.is_active) {
      return (
        <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full border border-amber-200 shadow-md space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Crown className="w-6 h-6 stroke-[1.8]" />
            </div>
            <h2 className="text-lg font-bold text-[#1C1C1E]">{business.business_name}</h2>
            <p className="text-xs text-[#636366]">
              Reviews for this business are temporarily unavailable. Thank you for your interest!
            </p>
            <div className="pt-2">
              <button
                onClick={() => navigateTo('/admin')}
                className="w-full py-2.5 bg-[#1C1C1E] text-white rounded-xl text-xs font-semibold"
              >
                Admin Management
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Render exact Customer Review Page
    return (
      <CustomerReviewPage
        business={business}
        onClose={() => navigateTo('/')}
        onAdminClick={() => navigateTo('/admin')}
      />
    );
  }

  // =========================================================================
  // ROUTE 3: PLATFORM HOME / HUB (/)
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#1C1C1E] flex flex-col justify-between">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#ECEAE4] px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <TapReviewsLogo size="md" subtitle="Smart NFC & QR Review Platform" />

        <button
          onClick={() => navigateTo('/admin')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1C1C1E] hover:bg-black text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Shield className="w-3.5 h-3.5 text-[#C5A059]" />
          <span>Admin Portal</span>
        </button>
      </header>

      {/* Hero Presentation */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8 flex-1">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF9F6] border border-[#E5E2DA] text-xs font-medium text-[#636366]">
            <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>TapReviews • NFC Tap & QR Code Google Review System</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1C1C1E] max-w-xl mx-auto">
            Effortless customer reviews with TapReviews
          </h2>
          <p className="text-sm sm:text-base text-[#636366] max-w-lg mx-auto leading-relaxed">
            Customers tap the NFC card or scan table QR codes to access their personalized review draft, edit their genuine experience, and copy to Google in seconds.
          </p>
        </div>

        {/* Live Demo Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm sm:text-base text-[#1C1C1E] flex items-center gap-2">
              <Store className="w-4 h-4 text-[#C5A059]" />
              <span>Registered Business Review Pages (Click to test NFC flow)</span>
            </h3>
            <span className="text-xs text-[#8E8E93]">
              {allBusinesses.length} Active Businesses
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {allBusinesses.map((biz) => (
              <div
                key={biz.id}
                onClick={() => navigateTo(`/business/${biz.slug}`)}
                className="bg-white rounded-2xl border border-[#ECEAE4] p-4 shadow-xs hover:shadow-md hover:border-[#1C1C1E] transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="aspect-[16/9] w-full rounded-xl overflow-hidden bg-[#FAF9F5] border border-[#ECEAE4]">
                    <img
                      src={biz.hero_image_url}
                      alt={biz.business_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#1C1C1E] group-hover:text-[#C5A059] transition-colors">
                      {biz.business_name}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-1">
                      <CategoryBadge category={biz.business_category} className="px-2 py-0 text-[10px]" />
                    </div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-[#8E8E93] mt-1.5 line-clamp-1">
                      {biz.tagline || 'AUTHENTIC STOREFRONT'}
                    </p>
                  </div>
                </div>

                <div className="pt-3 mt-2 border-t border-[#F2EFE8] flex items-center justify-between text-xs font-semibold text-[#1C1C1E]">
                  <span>Launch Review UI</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Architecture Callout */}
        <div className="bg-white rounded-3xl border border-[#ECEAE4] p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#FAF9F5] border border-[#E5E2DA] flex items-center justify-center text-[#C5A059]">
              <QrCode className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-base text-[#1C1C1E]">
              How TapReviews Works
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E5E2DA] space-y-1.5">
              <span className="font-bold text-[#1C1C1E] block">1. NFC / QR Scan</span>
              <p className="text-[#636366]">
                Customer taps NFC table stand or scans QR code at counter with their smartphone.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E5E2DA] space-y-1.5">
              <span className="font-bold text-[#1C1C1E] block">2. Dynamic Load</span>
              <p className="text-[#636366]">
                Permanent public route <code className="text-[#C5A059]">/business/:slug</code> dynamically fetches business branding & photo.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E5E2DA] space-y-1.5">
              <span className="font-bold text-[#1C1C1E] block">3. Rating & Edit</span>
              <p className="text-[#636366]">
                Customer selects experience (Excellent, Good, Average, Poor) and edits the draft review.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E5E2DA] space-y-1.5">
              <span className="font-bold text-[#1C1C1E] block">4. One-Tap Post</span>
              <p className="text-[#636366]">
                Review text is copied to clipboard and opens Google Review page in 1 touch!
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => navigateTo('/admin')}
              className="px-4 py-2 bg-[#1C1C1E] hover:bg-black text-white text-xs font-semibold rounded-full flex items-center gap-1.5 cursor-pointer"
            >
              <span>Manage in Admin Panel</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#ECEAE4] bg-white py-4 px-6 text-center text-xs text-[#8E8E93]">
        <p>© 2026 TapReviews. Modern NFC & QR business review platform. All rights reserved.</p>
      </footer>
    </div>
  );
}
