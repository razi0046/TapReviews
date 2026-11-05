import React, { useState, useEffect, useRef } from 'react';
import { Business, SatisfactionLevel, ReviewTemplate } from '../types';
import { businessService } from '../services/businessService';
import { getCharacterCountFeedback, isValidHttpUrl } from '../utils/slugify';
import { getRecentSuggestionIds, recordDisplayedSuggestionId } from '../utils/recentSuggestions';
import { CategoryBadge } from '../utils/categoryMeta';
import {
  Crown,
  X,
  Pencil,
  ArrowRight,
  Smile,
  SmilePlus,
  Meh,
  Frown,
  Instagram,
  Globe,
  Facebook,
  Youtube,
  Check,
  Copy,
  ExternalLink,
  AlertCircle,
  RotateCcw
} from 'lucide-react';

interface CustomerReviewPageProps {
  business: Business;
  onClose?: () => void;
  onAdminClick?: () => void;
}

export const CustomerReviewPage: React.FC<CustomerReviewPageProps> = ({
  business,
  onClose,
  onAdminClick,
}) => {
  const [selectedSatisfaction, setSelectedSatisfaction] = useState<SatisfactionLevel>('Excellent');
  const [reviewDraft, setReviewDraft] = useState<string>('');
  const [isLoadingDraft, setIsLoadingDraft] = useState<boolean>(true);
  const [rotationCounter, setRotationCounter] = useState<number>(0);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [showManualCopyModal, setShowManualCopyModal] = useState<boolean>(false);
  const [modalCopied, setModalCopied] = useState<boolean>(false);
  const [showDismissConfirm, setShowDismissConfirm] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load rotating review suggestion whenever selected satisfaction or rotation counter changes
  useEffect(() => {
    let isCancelled = false;
    async function loadSuggestion() {
      setIsLoadingDraft(true);
      try {
        const category = business.business_category || 'general';
        // Retrieve last 5 displayed suggestion IDs as exclusions to prevent immediate repeats on same device
        const recentExclusions = getRecentSuggestionIds(business.id, selectedSatisfaction);

        const suggestion = await businessService.pickRotatingReviewSuggestion(
          category,
          selectedSatisfaction,
          recentExclusions,
          'en'
        );

        if (!isCancelled) {
          if (suggestion && suggestion.review_text?.trim()) {
            // Save displayed suggestion ID into rolling 5-item FIFO storage
            recordDisplayedSuggestionId(business.id, selectedSatisfaction, suggestion.id);
            setReviewDraft(suggestion.review_text);
          } else {
            // If no category suggestion exists, keep current graceful empty behavior
            setReviewDraft('');
          }
        }
      } catch (err) {
        console.error('Failed to load rotating review suggestion:', err);
        if (!isCancelled) {
          setReviewDraft('');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingDraft(false);
        }
      }
    }

    loadSuggestion();
    return () => {
      isCancelled = true;
    };
  }, [business.id, business.business_category, selectedSatisfaction, rotationCounter]);

  const charFeedback = getCharacterCountFeedback(reviewDraft, 1000);

  // Handle satisfaction level selection - triggers fresh matching suggestion
  const handleSelectSatisfaction = (level: SatisfactionLevel) => {
    setSelectedSatisfaction(level);
    if (level === selectedSatisfaction) {
      setRotationCounter((c) => c + 1);
    }
  };

  // Handle "Copy & Post on Google"
  const handleCopyAndPostOnGoogle = async () => {
    const textToCopy = reviewDraft.trim();
    let copiedSuccess = false;

    // Attempt navigator.clipboard
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        copiedSuccess = true;
      } catch (err) {
        console.warn('Clipboard writeText failed, trying fallback:', err);
      }
    }

    // Fallback if clipboard API blocked
    if (!copiedSuccess && textareaRef.current) {
      try {
        textareaRef.current.select();
        textareaRef.current.setSelectionRange(0, 99999);
        copiedSuccess = document.execCommand('copy');
      } catch (err) {
        console.warn('Fallback copy failed:', err);
      }
    }

    if (copiedSuccess) {
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 3000);
      // Give user feedback for 500ms then open Google Review page
      setTimeout(() => {
        window.open(business.google_review_url, '_blank', 'noopener,noreferrer');
      }, 500);
    } else {
      // Show manual copy fallback modal
      setCopyStatus('error');
      setShowManualCopyModal(true);
    }
  };

  const satisfactionOptions: {
    level: SatisfactionLevel;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      level: 'Excellent',
      label: 'Excellent',
      icon: <SmilePlus className="w-5 h-5 sm:w-6 sm:h-6" />,
    },
    {
      level: 'Good',
      label: 'Good',
      icon: <Smile className="w-5 h-5 sm:w-6 sm:h-6" />,
    },
    {
      level: 'Average',
      label: 'Average',
      icon: <Meh className="w-5 h-5 sm:w-6 sm:h-6" />,
    },
    {
      level: 'Poor',
      label: 'Poor',
      icon: <Frown className="w-5 h-5 sm:w-6 sm:h-6" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#1C1C1E] flex flex-col items-center justify-start py-4 px-3 sm:px-6 md:py-10">
      {/* Outer Phone Shell / Centered Column */}
      <main className="w-full max-w-[430px] bg-white rounded-[32px] sm:rounded-[36px] shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-[#ECEAE4] overflow-hidden flex flex-col transition-all">
        
        {/* ================================================================= */}
        {/* 1. BUSINESS HEADER */}
        {/* ================================================================= */}
        <header className="relative pt-6 pb-4 px-6 text-center border-b border-[#F2EFE8]/70">
          {/* Close Icon / Top Right */}
          <button
            onClick={() => setShowDismissConfirm(true)}
            aria-label="Close review"
            className="absolute top-5 right-5 p-2 rounded-full text-[#8E8E93] hover:text-[#1C1C1E] hover:bg-[#F5F4EE] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Admin shortcut button (subtle top left) */}
          {onAdminClick && (
            <button
              onClick={onAdminClick}
              aria-label="Go to Admin Panel"
              className="absolute top-5 left-5 text-[11px] font-medium tracking-wider uppercase text-[#8E8E93] hover:text-[#1C1C1E] px-2 py-1 rounded bg-[#F5F4EE] hover:bg-[#ECEAE4] transition-colors"
            >
              Admin
            </button>
          )}

          {/* Gold Crown Outline Icon */}
          <div className="flex items-center justify-center mb-2.5">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-[#C5A059]">
              <Crown className="w-7 h-7 stroke-[1.6]" />
            </div>
          </div>

          {/* Dynamic Business Name */}
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1C1C1E] px-4">
            {business.business_name}
          </h1>

          {/* Category Badge with Icon */}
          <div className="flex items-center justify-center mt-2">
            <CategoryBadge category={business.business_category} />
          </div>

          {/* Small Uppercase Tagline with Decorative Lines */}
          <div className="flex items-center justify-center gap-3 mt-2.5">
            <span className="h-[1px] w-8 sm:w-12 bg-[#E5E0D5]" />
            <p className="text-[10px] sm:text-[11px] tracking-[0.18em] font-semibold uppercase text-[#8E8E93]">
              {business.tagline || 'AUTHENTIC LOCAL EXPERIENCE'}
            </p>
            <span className="h-[1px] w-8 sm:w-12 bg-[#E5E0D5]" />
          </div>
        </header>

        <div className="p-5 sm:p-7 space-y-6">
          {/* ================================================================= */}
          {/* 2. WELCOME SECTION */}
          {/* ================================================================= */}
          <section className="text-center space-y-1">
            <h2 className="text-2xl sm:text-[26px] font-bold text-[#1C1C1E] tracking-tight">
              Thank you!
            </h2>
            <p className="text-sm sm:text-[15px] text-[#636366] leading-relaxed">
              {business.welcome_message || "We'd love to hear about your experience..."}
            </p>
          </section>

          {/* ================================================================= */}
          {/* 3. BUSINESS PHOTOGRAPH */}
          {/* ================================================================= */}
          <section aria-label="Business Photograph">
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[#F2EFE8] border border-[#ECEAE4] shadow-sm">
              <img
                src={business.hero_image_url}
                alt={business.business_name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                onError={(e) => {
                  // Fallback styled visual if image fails to load
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div
                style={{ display: 'none' }}
                className="w-full h-full bg-[#FAF9F5] flex-col items-center justify-center p-4 text-center text-[#8E8E93]"
              >
                <Crown className="w-8 h-8 text-[#C5A059] mb-2" />
                <span className="text-sm font-medium text-[#1C1C1E]">{business.business_name}</span>
                <span className="text-xs text-[#8E8E93]">Welcome to our storefront</span>
              </div>
            </div>
          </section>

          {/* ================================================================= */}
          {/* 4. SATISFACTION SELECTION */}
          {/* ================================================================= */}
          <section className="space-y-3" aria-labelledby="satisfaction-heading">
            <h3
              id="satisfaction-heading"
              className="text-center text-sm sm:text-[15px] font-semibold text-[#1C1C1E]"
            >
              How was your experience?
            </h3>

            {/* Exactly 4 options: Excellent, Good, Average, Poor */}
            <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
              {satisfactionOptions.map((option) => {
                const isSelected = selectedSatisfaction === option.level;
                return (
                  <button
                    key={option.level}
                    type="button"
                    onClick={() => handleSelectSatisfaction(option.level)}
                    aria-pressed={isSelected}
                    className={`flex flex-col items-center justify-center py-3 px-1 rounded-2xl transition-all duration-200 min-h-[72px] sm:min-h-[78px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                      isSelected
                        ? 'bg-[#1C1C1E] text-white shadow-md shadow-black/10 scale-[1.02]'
                        : 'bg-[#FAF9F6] text-[#48484A] border border-[#E5E2DA] hover:border-[#C5A059] hover:bg-[#F5F3EC]'
                    }`}
                  >
                    <div className={isSelected ? 'text-white' : 'text-[#48484A]'}>
                      {option.icon}
                    </div>
                    <span
                      className={`text-[11px] sm:text-xs font-medium mt-1.5 leading-none ${
                        isSelected ? 'text-white font-semibold' : 'text-[#48484A]'
                      }`}
                    >
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ================================================================= */}
          {/* 5. REVIEW EDITOR */}
          {/* ================================================================= */}
          <section className="space-y-2" aria-labelledby="review-editor-heading">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#1C1C1E]">
                <Pencil className="w-3.5 h-3.5 text-[#C5A059]" />
                <span id="review-editor-heading">Your Review</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setRotationCounter((c) => c + 1)}
                  disabled={isLoadingDraft}
                  title="Rotate to another suggestion"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8E8E93] hover:text-[#1C1C1E] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className={`w-3 h-3 ${isLoadingDraft ? 'animate-spin' : ''}`} />
                  <span>Suggest another</span>
                </button>
                <span
                  className={`text-[11px] tabular-nums font-medium ${
                    charFeedback.isNearLimit
                      ? 'text-amber-600 font-semibold'
                      : 'text-[#8E8E93]'
                  }`}
                >
                  {charFeedback.count} / 1000
                </span>
              </div>
            </div>

            <div className="relative rounded-2xl border border-[#E5E2DA] bg-[#FAF9F6] focus-within:border-[#1C1C1E] focus-within:bg-white transition-all overflow-hidden shadow-inner">
              {isLoadingDraft ? (
                <div className="min-h-[150px] flex items-center justify-center text-xs text-[#8E8E93]">
                  Loading draft example...
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  value={reviewDraft}
                  onChange={(e) => setReviewDraft(e.target.value.slice(0, 1000))}
                  rows={6}
                  maxLength={1000}
                  aria-label="Edit your review"
                  placeholder="Share details of your experience..."
                  className="w-full min-h-[150px] p-3.5 text-sm sm:text-[14.5px] leading-relaxed text-[#1C1C1E] bg-transparent resize-none border-none outline-none focus:ring-0 placeholder:text-[#A1A1A6]"
                />
              )}
            </div>

            {/* Clear Reminder to reflect genuine experience */}
            <p className="text-[11px] text-[#636366] leading-normal px-1 flex items-start gap-1">
              <span className="text-[#C5A059] font-bold">ℹ</span>
              <span>
                Please edit this draft to reflect your genuine experience. Authentic reviews help our staff and fellow customers!
              </span>
            </p>
          </section>

          {/* ================================================================= */}
          {/* 6. GOOGLE REVIEW BUTTON */}
          {/* ================================================================= */}
          <section className="pt-1">
            <button
              type="button"
              onClick={handleCopyAndPostOnGoogle}
              disabled={reviewDraft.trim().length === 0}
              aria-label="Copy review and post on Google"
              className="w-full h-13 sm:h-14 rounded-full bg-[#1C1C1E] hover:bg-black active:scale-[0.98] text-white flex items-center justify-between px-5 sm:px-6 shadow-lg shadow-black/15 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]"
            >
              {/* Google G Logo Disk */}
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>

              {/* Exact PRD label */}
              <span className="text-sm sm:text-[15px] font-semibold tracking-wide text-white">
                {copyStatus === 'copied' ? 'Copied! Opening Google...' : 'Copy & Post on Google'}
              </span>

              {/* Right Arrow / Check */}
              <div className="w-8 h-8 flex items-center justify-center text-white/90 group-hover:translate-x-0.5 transition-transform">
                {copyStatus === 'copied' ? (
                  <Check className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )}
              </div>
            </button>

            {/* Micro confirmation indicator */}
            {copyStatus === 'copied' && (
              <p className="text-center text-xs text-emerald-700 font-medium mt-2 animate-fade-in">
                Review copied to your clipboard! Paste into Google's review composer.
              </p>
            )}
          </section>

          {/* ================================================================= */}
          {/* 7. SUPPORTING TEXT */}
          {/* ================================================================= */}
          <div className="text-center pt-1">
            <p className="text-xs sm:text-[13px] font-medium text-[#8E8E93]">
              Your review will help us grow! ♥
            </p>
          </div>

          {/* ================================================================= */}
          {/* 8. SOCIAL LINKS */}
          {/* ================================================================= */}
          {(() => {
            const socialLinks = [
              isValidHttpUrl(business.facebook_url)
                ? {
                    id: 'facebook',
                    name: 'Facebook',
                    url: business.facebook_url!.trim(),
                    icon: Facebook,
                    iconColor: 'text-[#1877F2]',
                    borderHover: 'hover:border-[#1877F2]',
                  }
                : null,
              isValidHttpUrl(business.youtube_url)
                ? {
                    id: 'youtube',
                    name: 'YouTube',
                    url: business.youtube_url!.trim(),
                    icon: Youtube,
                    iconColor: 'text-[#FF0000]',
                    borderHover: 'hover:border-[#FF0000]',
                  }
                : null,
              isValidHttpUrl(business.instagram_url)
                ? {
                    id: 'instagram',
                    name: 'Instagram',
                    url: business.instagram_url!.trim(),
                    icon: Instagram,
                    iconColor: 'text-[#E1306C]',
                    borderHover: 'hover:border-[#E1306C]',
                  }
                : null,
              isValidHttpUrl(business.website_url)
                ? {
                    id: 'website',
                    name: 'Website',
                    url: business.website_url!.trim(),
                    icon: Globe,
                    iconColor: 'text-[#2C2C2E]',
                    borderHover: 'hover:border-[#1C1C1E]',
                  }
                : null,
            ].filter(Boolean) as Array<{
              id: string;
              name: string;
              url: string;
              icon: React.ComponentType<{ className?: string }>;
              iconColor: string;
              borderHover: string;
            }>;

            if (socialLinks.length === 0) return null;

            return (
              <>
                {/* Subtle separator */}
                <div className="h-[1px] w-full bg-[#F2EFE8]" />

                <footer className="space-y-3 pb-2" aria-labelledby="social-heading">
                  <h4
                    id="social-heading"
                    className="text-center text-xs font-semibold text-[#8E8E93] uppercase tracking-wider"
                  >
                    Follow us
                  </h4>

                  <div
                    className={`grid gap-2.5 sm:gap-3 ${
                      socialLinks.length === 1
                        ? 'grid-cols-1 max-w-xs mx-auto w-full'
                        : socialLinks.length === 2
                        ? 'grid-cols-2'
                        : socialLinks.length === 3
                        ? 'grid-cols-2 sm:grid-cols-3'
                        : 'grid-cols-2'
                    }`}
                  >
                    {socialLinks.map((link, idx) => {
                      const Icon = link.icon;
                      const isThirdInTrio = socialLinks.length === 3 && idx === 2;
                      return (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#FAF9F6] border border-[#E5E2DA] ${link.borderHover} text-xs font-medium text-[#1C1C1E] transition-all hover:bg-white hover:shadow-xs active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                            isThirdInTrio ? 'col-span-2 sm:col-span-1' : ''
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${link.iconColor} shrink-0`} />
                          <span className="truncate">{link.name}</span>
                        </a>
                      );
                    })}
                  </div>
                </footer>
              </>
            );
          })()}
        </div>
      </main>

      {/* Manual Copy Modal Fallback */}
      {showManualCopyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-[#ECEAE4]">
            <div className="flex items-center justify-between">
              <h5 className="font-semibold text-[#1C1C1E]">Copy Your Review</h5>
              <button
                onClick={() => setShowManualCopyModal(false)}
                className="p-1 rounded-full text-[#8E8E93] hover:text-[#1C1C1E]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#636366]">
              Please manually copy the text below and click the button to open Google Reviews:
            </p>
            <textarea
              readOnly
              value={reviewDraft}
              rows={4}
              className="w-full p-3 text-xs bg-[#FAF9F6] rounded-xl border border-[#E5E2DA] text-[#1C1C1E] select-all"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(reviewDraft);
                  setModalCopied(true);
                  setTimeout(() => setModalCopied(false), 2000);
                }}
                className="flex-1 py-2.5 bg-[#FAF9F6] border border-[#E5E2DA] rounded-xl text-xs font-medium text-[#1C1C1E] flex items-center justify-center gap-1.5"
              >
                {modalCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
              <a
                href={business.google_review_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowManualCopyModal(false)}
                className="flex-1 py-2.5 bg-[#1C1C1E] text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Google
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Dismiss / Close Confirmation */}
      {showDismissConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-[#ECEAE4] text-center">
            <h5 className="font-bold text-lg text-[#1C1C1E]">Leaving so soon?</h5>
            <p className="text-sm text-[#636366]">
              Your feedback takes only 10 seconds and directly helps the team at {business.business_name}!
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDismissConfirm(false)}
                className="flex-1 py-3 bg-[#1C1C1E] text-white rounded-xl text-xs font-semibold"
              >
                Continue Review
              </button>
              <button
                onClick={() => {
                  setShowDismissConfirm(false);
                  if (onClose) onClose();
                }}
                className="py-3 px-4 bg-[#FAF9F6] border border-[#E5E2DA] text-[#636366] rounded-xl text-xs font-medium hover:text-[#1C1C1E]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
