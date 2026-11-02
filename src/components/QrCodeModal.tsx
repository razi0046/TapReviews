import React, { useEffect, useState, useRef } from 'react';
import { Business } from '../types';
import { getBusinessCanonicalUrl, generateHighResQrCode, downloadQrCodeImage } from '../utils/appUrl';
import { X, Download, Copy, Check, ExternalLink, Smartphone, Printer, Crown } from 'lucide-react';

interface QrCodeModalProps {
  business: Business;
  onClose: () => void;
  onPreviewReviewPage: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  business,
  onClose,
  onPreviewReviewPage,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'tent'>('qr');
  const printRef = useRef<HTMLDivElement>(null);

  // Permanent canonical public review URL for cross-device NFC & QR scanning
  const reviewUrl = getBusinessCanonicalUrl(business);

  useEffect(() => {
    generateHighResQrCode(reviewUrl, {
      width: 1024,
      margin: 4,
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('High-res QR code generation error:', err));
  }, [reviewUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(reviewUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    downloadQrCodeImage(qrDataUrl, `${business.slug}-qr-code-1024.png`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#ECEAE4] overflow-hidden my-auto animate-fade-in">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#F2EFE8] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-[#1C1C1E]">
              TapReviews NFC & QR Generator
            </h3>
            <p className="text-xs text-[#8E8E93] truncate max-w-[280px]">
              {business.business_name}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-full text-[#8E8E93] hover:text-[#1C1C1E] hover:bg-[#FAF9F5] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch: QR View or Table Stand View */}
        <div className="flex border-b border-[#F2EFE8] px-6 pt-3 gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('qr')}
            className={`pb-2.5 transition-colors relative ${
              activeTab === 'qr'
                ? 'text-[#1C1C1E] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#1C1C1E]'
                : 'text-[#8E8E93] hover:text-[#1C1C1E]'
            }`}
          >
            TapReviews QR Asset
          </button>
          <button
            onClick={() => setActiveTab('tent')}
            className={`pb-2.5 transition-colors relative ${
              activeTab === 'tent'
                ? 'text-[#1C1C1E] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#1C1C1E]'
                : 'text-[#8E8E93] hover:text-[#1C1C1E]'
            }`}
          >
            Printable Table Tent
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {activeTab === 'qr' ? (
            <>
              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center p-6 bg-[#FAF9F5] rounded-2xl border border-[#E5E2DA]">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`${business.business_name} QR Code`}
                    className="w-48 h-48 sm:w-56 sm:h-56 rounded-xl shadow-sm bg-white p-2"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-[#8E8E93]">
                    Generating QR code...
                  </div>
                )}
                <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-[#636366]">
                  <Smartphone className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Program this URL to NTAG213 / NTAG215 / NTAG216 NFC card</span>
                </div>
              </div>

              {/* URL Display and Copy */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1C1C1E]">
                  Generated Review Destination URL:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={reviewUrl}
                    className="flex-1 px-3 py-2 text-xs bg-[#FAF9F5] border border-[#E5E2DA] rounded-xl text-[#1C1C1E] font-mono truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-2 bg-[#1C1C1E] text-white rounded-xl text-xs font-medium flex items-center gap-1.5 hover:bg-black transition-colors"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleDownloadQr}
                  className="py-2.5 px-4 rounded-xl border border-[#E5E2DA] bg-white hover:bg-[#FAF9F5] text-xs font-semibold text-[#1C1C1E] flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4 text-[#C5A059]" />
                  Download PNG
                </button>
                <button
                  onClick={onPreviewReviewPage}
                  className="py-2.5 px-4 rounded-xl bg-[#1C1C1E] hover:bg-black text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Preview Review
                </button>
              </div>
            </>
          ) : (
            /* Table Tent Preview Mode */
            <div className="space-y-4">
              <div
                ref={printRef}
                className="bg-[#FAF9F5] p-6 rounded-2xl border border-[#C5A059]/40 text-center space-y-3 shadow-inner"
              >
                <div className="w-9 h-9 mx-auto rounded-full flex items-center justify-center text-[#C5A059]">
                  <Crown className="w-6 h-6 stroke-[1.8]" />
                </div>
                <h4 className="font-bold text-base text-[#1C1C1E]">
                  {business.business_name}
                </h4>
                <p className="text-[10px] tracking-widest uppercase font-semibold text-[#8E8E93]">
                  {business.tagline || 'AUTHENTIC LOCAL EXPERIENCE'}
                </p>

                {qrDataUrl && (
                  <div className="p-2 bg-white rounded-xl inline-block shadow-sm my-1">
                    <img
                      src={qrDataUrl}
                      alt="Review QR"
                      className="w-36 h-36 mx-auto"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#1C1C1E]">
                    TAP NFC OR SCAN QR
                  </p>
                  <p className="text-[11px] text-[#636366]">
                    Share your experience on Google in 10 seconds!
                  </p>
                  <p className="text-[9px] uppercase tracking-widest font-semibold text-[#8E8E93] pt-1">
                    Powered by TapReviews
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handlePrint}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#1C1C1E] hover:bg-black text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print Stand
                </button>
                <button
                  onClick={onClose}
                  className="py-2.5 px-4 rounded-xl border border-[#E5E2DA] text-xs font-semibold text-[#8E8E93] hover:text-[#1C1C1E]"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
