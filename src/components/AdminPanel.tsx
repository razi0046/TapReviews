import React, { useState, useEffect } from 'react';
import { Business, ReviewTemplate, SatisfactionLevel, BusinessFormData } from '../types';
import { businessService } from '../services/businessService';
import { getStoredSupabaseConfig, getSupabase } from '../lib/supabase';
import { generateSlug, generateUUID } from '../utils/slugify';
import { getBusinessCanonicalUrl, generateHighResQrCode, downloadQrCodeImage } from '../utils/appUrl';
import { QrCodeModal } from './QrCodeModal';
import { SupabaseSetupModal } from './SupabaseSetupModal';
import { TapReviewsLogo } from './TapReviewsLogo';
import {
  Crown,
  Plus,
  ExternalLink,
  QrCode,
  Copy,
  Check,
  Building,
  Upload,
  Globe,
  Instagram,
  Star,
  Settings,
  Edit2,
  Database,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  LogOut,
  Trash2,
  AlertTriangle,
  AlertCircle,
  X,
  Download,
  Search,
  Filter,
} from 'lucide-react';
import { CategoryBadge, formatCategoryLabel, renderCategoryIcon } from '../utils/categoryMeta';

interface AdminPanelProps {
  onNavigateToReview: (slug: string, uuid: string) => void;
  onSignOut?: () => void;
  adminEmail?: string;
}

export const STANDARD_CATEGORIES = [
  'restaurant',
  'cafe',
  'bakery',
  'fast-food',
  'kebab-store',
  'sweets-shop',
  'snacks-shop',
  'meat-shop',
  'salon',
  'spa',
  'clinic',
  'gym',
  'hotel',
  'retail-store',
  'car-service',
  'fashion',
  'clothing',
  'abaya-shop',
  'bags-shop',
  'mobile-repairing-shop',
  'electronics-shop',
  'jewellery',
  'education',
  'general',
];

export const CATEGORY_OPTIONS = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Café' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'fast-food', label: 'Fast Food' },
  { value: 'kebab-store', label: 'Kebab Store' },
  { value: 'sweets-shop', label: 'Sweets Shop' },
  { value: 'snacks-shop', label: 'Snacks Shop' },
  { value: 'meat-shop', label: 'Meat Shop' },
  { value: 'salon', label: 'Salon' },
  { value: 'spa', label: 'Spa' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'gym', label: 'Gym' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'retail-store', label: 'Retail Store' },
  { value: 'car-service', label: 'Car Service' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'clothing', label: 'Clothing Store' },
  { value: 'abaya-shop', label: 'Abaya Shop' },
  { value: 'bags-shop', label: 'Bags Shop' },
  { value: 'mobile-repairing-shop', label: 'Mobile Repairing Shop' },
  { value: 'electronics-shop', label: 'Electronics Shop' },
  { value: 'jewellery', label: 'Jewellery Shop' },
  { value: 'education', label: 'Education' },
  { value: 'general', label: 'General' },
  { value: 'other', label: 'Other — enter custom category' },
];

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onNavigateToReview,
  onSignOut,
  adminEmail,
}) => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');

  // Modal states
  const [selectedBusinessForQr, setSelectedBusinessForQr] = useState<Business | null>(null);
  const [showSupabaseModal, setShowSupabaseModal] = useState<boolean>(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [managingTemplatesFor, setManagingTemplatesFor] = useState<Business | null>(null);
  const [templatesList, setTemplatesList] = useState<ReviewTemplate[]>([]);

  // Deletion and feedback states
  const [businessToDelete, setBusinessToDelete] = useState<Business | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  // Category state for the Add form
  const [selectedCategory, setSelectedCategory] = useState<string>('restaurant');
  const [customCategory, setCustomCategory] = useState<string>('');

  // Dashboard search and category filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Filtered businesses based on search query and category filter
  const filteredBusinesses = businesses.filter((biz) => {
    const cat = (biz.business_category || 'general').toLowerCase();
    const matchesCategory = filterCategory === 'all' || cat === filterCategory.toLowerCase();
    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = biz.business_name.toLowerCase().includes(q);
    const slugMatch = biz.slug.toLowerCase().includes(q);
    const taglineMatch = (biz.tagline || '').toLowerCase().includes(q);
    const catLabelMatch = formatCategoryLabel(biz.business_category).toLowerCase().includes(q);
    const catSlugMatch = cat.includes(q);

    return nameMatch || slugMatch || taglineMatch || catLabelMatch || catSlugMatch;
  });

  // Edit Business Form State
  const [editSelectedCategory, setEditSelectedCategory] = useState<string>('restaurant');
  const [editCustomCategory, setEditCustomCategory] = useState<string>('');
  const [editSelectedImageFile, setEditSelectedImageFile] = useState<File | null>(null);
  const [editImagePreviewUrl, setEditImagePreviewUrl] = useState<string | null>(null);
  const [editImageUploadError, setEditImageUploadError] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    business_name: string;
    tagline: string;
    hero_image_url: string;
    welcome_message: string;
    google_review_url: string;
    instagram_url: string;
    website_url: string;
  }>({
    business_name: '',
    tagline: '',
    hero_image_url: '',
    welcome_message: '',
    google_review_url: '',
    instagram_url: '',
    website_url: '',
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [isEditSubmitting, setIsEditSubmitting] = useState<boolean>(false);

  // New-business image file upload state
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  // Add Business Form State
  const [formData, setFormData] = useState<BusinessFormData>({
    business_name: '',
    business_category: 'restaurant',
    hero_image_url: '',
    welcome_message: "We'd love to hear about your experience...",
    tagline: '',
    google_review_url: '',
    instagram_url: '',
    website_url: '',
    templates: {
      Excellent: '',
      Good: '',
      Average: '',
      Poor: '',
    },
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdResult, setCreatedResult] = useState<{ business: Business; url: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [showCustomTemplates, setShowCustomTemplates] = useState<boolean>(false);

  const supabaseConfig = getStoredSupabaseConfig();
  const isSupabaseConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey);

  // Load all businesses
  const loadBusinesses = async () => {
    setIsLoading(true);
    try {
      const data = await businessService.getAllBusinesses();
      setBusinesses(data);
    } catch (err) {
      console.error('Failed to load businesses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBusinesses();
  }, []);

  useEffect(() => {
    if (!feedbackMessage) return;
    if (feedbackMessage.type === 'success') {
      const timer = setTimeout(() => {
        setFeedbackMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);

  const extractSupabaseStoragePath = (url: string, bucketName: string = 'business-images'): string | null => {
    if (!url) return null;
    const marker = `/storage/v1/object/public/${bucketName}/`;
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const rawPath = url.substring(idx + marker.length);
      return decodeURIComponent(rawPath.split('?')[0].split('#')[0]);
    }
    const signMarker = `/storage/v1/object/sign/${bucketName}/`;
    const signIdx = url.indexOf(signMarker);
    if (signIdx !== -1) {
      const rawPath = url.substring(signIdx + signMarker.length);
      return decodeURIComponent(rawPath.split('?')[0].split('#')[0]);
    }
    return null;
  };

  const handleOpenEditModal = (biz: Business) => {
    setEditingBusiness(biz);
    setEditSelectedImageFile(null);
    setEditImagePreviewUrl(biz.hero_image_url || null);
    setEditImageUploadError(null);

    const rawCat = (biz.business_category || 'general').toLowerCase().trim();
    const isStandard = STANDARD_CATEGORIES.includes(rawCat);
    if (isStandard) {
      setEditSelectedCategory(rawCat);
      setEditCustomCategory('');
    } else {
      // 4. When editing a business whose category is not in the standard dropdown options,
      // automatically select "Other" and prefill the custom category field.
      setEditSelectedCategory('other');
      setEditCustomCategory(biz.business_category || '');
    }
    setEditFormData({
      business_name: biz.business_name,
      tagline: biz.tagline || '',
      hero_image_url: biz.hero_image_url,
      welcome_message: biz.welcome_message || "We'd love to hear about your experience...",
      google_review_url: biz.google_review_url,
      instagram_url: biz.instagram_url || '',
      website_url: biz.website_url || '',
    });
    setEditErrors({});
  };

  const handleEditImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEditImageUploadError(null);

    // Accept JPEG, PNG, and WebP
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    const validExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const fileExt = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    const isValidType = validMimes.includes(file.type) || validExts.includes(fileExt);

    if (!isValidType) {
      setEditImageUploadError('Only JPEG, PNG, and WebP images are allowed.');
      setEditSelectedImageFile(null);
      setEditImagePreviewUrl(editFormData.hero_image_url || null);
      return;
    }

    // Up to 5 MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setEditImageUploadError('Image size exceeds 5 MB. Please select a smaller file.');
      setEditSelectedImageFile(null);
      setEditImagePreviewUrl(editFormData.hero_image_url || null);
      return;
    }

    setEditSelectedImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setEditImagePreviewUrl(objectUrl);
  };

  const handleSaveEditBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBusiness) return;

    const errors: Record<string, string> = {};
    if (!editFormData.business_name.trim()) {
      errors.business_name = 'Business name is required';
    }
    if (!editFormData.google_review_url.trim()) {
      errors.google_review_url = 'Google review URL is required';
    }

    let normalizedCategory = editSelectedCategory;
    if (editSelectedCategory.toLowerCase() === 'other') {
      const slugified = generateSlug(editCustomCategory);
      if (!slugified) {
        errors.business_category = 'Please enter a custom business category';
      } else {
        normalizedCategory = slugified;
      }
    } else {
      normalizedCategory = generateSlug(editSelectedCategory);
    }

    if (!normalizedCategory) {
      errors.business_category = 'Business category is required';
    }

    if (editImageUploadError) {
      return;
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setEditErrors({});
    setEditImageUploadError(null);
    setIsEditSubmitting(true);

    const supabase = getSupabase();
    // 1. Keep the current image if no new file is selected.
    let targetHeroImageUrl = editFormData.hero_image_url;
    let newlyUploadedPath: string | null = null;

    // 2 & 3. If a new JPEG, PNG, or WebP image is selected, validate <= 5 MB and upload to business-images with unique path and upsert: false
    if (editSelectedImageFile) {
      if (!supabase) {
        setEditImageUploadError('Supabase client is not available. Please verify credentials.');
        setIsEditSubmitting(false);
        return;
      }

      const MAX_SIZE = 5 * 1024 * 1024;
      if (editSelectedImageFile.size > MAX_SIZE) {
        setEditImageUploadError('Image size exceeds 5 MB. Please select a smaller file.');
        setIsEditSubmitting(false);
        return;
      }

      const ext = getFileExtension(editSelectedImageFile);
      const randomUuid = generateUUID();
      const filePath = `${editingBusiness.id}/${randomUuid}.${ext}`;

      try {
        const { error: uploadError } = await supabase.storage
          .from('business-images')
          .upload(filePath, editSelectedImageFile, {
            upsert: false,
            contentType: editSelectedImageFile.type || undefined,
          });

        if (uploadError) {
          console.error('Storage upload error during edit:', uploadError);
          setEditImageUploadError(`Image upload failed: ${uploadError.message || 'Unknown error'}`);
          setIsEditSubmitting(false);
          return;
        }

        newlyUploadedPath = filePath;

        // 4. Update businesses.hero_image_url only after the new upload succeeds.
        const { data: publicUrlData } = supabase.storage
          .from('business-images')
          .getPublicUrl(filePath);

        targetHeroImageUrl = publicUrlData.publicUrl;
      } catch (uploadEx: any) {
        console.error('Exception uploading image during edit:', uploadEx);
        setEditImageUploadError(`Upload failed: ${uploadEx?.message || 'Unknown error'}`);
        setIsEditSubmitting(false);
        return;
      }
    }

    // 4. Update database record
    try {
      await businessService.updateBusiness(editingBusiness.id, {
        business_name: editFormData.business_name.trim(),
        tagline: editFormData.tagline.trim() || editFormData.business_name.toUpperCase(),
        business_category: normalizedCategory,
        hero_image_url: targetHeroImageUrl,
        welcome_message: editFormData.welcome_message.trim(),
        google_review_url: editFormData.google_review_url.trim(),
        instagram_url: editFormData.instagram_url.trim(),
        website_url: editFormData.website_url.trim(),
      });

      // 5. After the database update succeeds, delete the previous image only when its URL belongs to the business-images Supabase bucket.
      if (newlyUploadedPath && supabase) {
        const oldStoragePath = extractSupabaseStoragePath(editingBusiness.hero_image_url, 'business-images');
        if (oldStoragePath && oldStoragePath !== newlyUploadedPath) {
          try {
            await supabase.storage.from('business-images').remove([oldStoragePath]);
          } catch (delOldErr) {
            console.warn('Failed to delete previous image from storage:', delOldErr);
          }
        }
      }

      await loadBusinesses();
      setEditingBusiness(null);
      setEditSelectedImageFile(null);
      setEditImagePreviewUrl(null);
      setEditImageUploadError(null);
    } catch (dbErr: any) {
      // 6. If the database update fails, delete the newly uploaded image and preserve the old image.
      console.error('Database update failed:', dbErr);
      if (newlyUploadedPath && supabase) {
        try {
          await supabase.storage.from('business-images').remove([newlyUploadedPath]);
        } catch (delNewErr) {
          console.error('Failed to cleanup newly uploaded image on DB failure:', delNewErr);
        }
      }
      setEditImageUploadError(`Database update failed: ${dbErr?.message || 'Unknown error'}. Previous image preserved.`);
      alert('Error updating business: ' + (dbErr?.message || 'Unknown error'));
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const getFileExtension = (file: File): string => {
    const parts = file.name.split('.');
    if (parts.length > 1) {
      const ext = parts.pop()?.toLowerCase();
      if (ext === 'jpeg' || ext === 'jpg') return 'jpg';
      if (ext === 'png') return 'png';
      if (ext === 'webp') return 'webp';
    }
    if (file.type === 'image/jpeg') return 'jpg';
    if (file.type === 'image/png') return 'png';
    if (file.type === 'image/webp') return 'webp';
    return 'jpg';
  };

  // Handle local image selection with type and size validation
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploadError(null);
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.hero_image_url;
      return next;
    });

    // Accept JPEG, PNG, and WebP
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    const validExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const fileExt = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    const isValidType = validMimes.includes(file.type) || validExts.includes(fileExt);

    if (!isValidType) {
      setImageUploadError('Only JPEG, PNG, and WebP images are allowed.');
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      return;
    }

    // Up to 5 MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setImageUploadError('Image size exceeds 5 MB. Please select a smaller file.');
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      return;
    }

    setSelectedImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreviewUrl(objectUrl);
  };

  // Handle Form Submission
  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.business_name.trim()) {
      errors.business_name = 'Business name is required';
    }

    // Determine normalized category
    let normalizedCategory = selectedCategory;
    if (selectedCategory.toLowerCase() === 'other') {
      const slugified = generateSlug(customCategory);
      if (!slugified) {
        errors.business_category = 'Please enter a custom business category';
      } else {
        normalizedCategory = slugified;
      }
    } else {
      normalizedCategory = generateSlug(selectedCategory);
    }

    if (!normalizedCategory) {
      errors.business_category = 'Business category is required';
    }

    // 1 & 2: Check image selection
    if (!selectedImageFile) {
      errors.hero_image_url = 'Business photograph is required';
    } else if (imageUploadError) {
      errors.hero_image_url = imageUploadError;
    }

    if (!formData.google_review_url.trim()) {
      errors.google_review_url = 'Google review URL is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setImageUploadError(null);
    setIsSubmitting(true);

    // 4. Before creating the business record, generate its UUID.
    const businessId = generateUUID();

    // 5. Upload the selected file to Supabase Storage bucket business-images at:
    // <business-id>/<random-uuid>.<extension>
    const ext = getFileExtension(selectedImageFile!);
    const randomUuid = generateUUID();
    const filePath = `${businessId}/${randomUuid}.${ext}`;

    const supabase = getSupabase();
    if (!supabase) {
      setImageUploadError('Supabase client is not available. Please verify credentials.');
      setIsSubmitting(false);
      return;
    }

    let uploadedFilePath: string | null = null;

    try {
      // 6. Use upsert: false.
      const { error: uploadError } = await supabase.storage
        .from('business-images')
        .upload(filePath, selectedImageFile!, {
          upsert: false,
          contentType: selectedImageFile!.type || undefined,
        });

      // 8. If upload fails, do not create the business.
      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        setImageUploadError(`Failed to upload image: ${uploadError.message || 'Unknown error'}`);
        setIsSubmitting(false);
        return;
      }

      uploadedFilePath = filePath;

      // 7. Get the public URL and save it as hero_image_url in the new businesses record.
      const { data: publicUrlData } = supabase.storage
        .from('business-images')
        .getPublicUrl(filePath);

      const heroImageUrl = publicUrlData.publicUrl;

      const { business, error: createError } = await businessService.createBusiness({
        ...formData,
        business_category: normalizedCategory,
        hero_image_url: heroImageUrl,
      }, businessId);

      // 9. If creating the business record fails after upload, delete the newly uploaded file.
      if (createError) {
        console.error('Creating business record failed in database:', createError);
        await supabase.storage.from('business-images').remove([uploadedFilePath]);
        uploadedFilePath = null;
        setImageUploadError(`Failed to save business: ${createError.message || 'Database error'}`);
        setIsSubmitting(false);
        return;
      }

      const canonicalUrl = getBusinessCanonicalUrl(business);

      setCreatedResult({
        business,
        url: canonicalUrl,
      });

      // Reload list and reset form
      await loadBusinesses();
      setSelectedCategory('restaurant');
      setCustomCategory('');
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      setImageUploadError(null);
      setFormData({
        business_name: '',
        business_category: 'restaurant',
        hero_image_url: '',
        welcome_message: "We'd love to hear about your experience...",
        tagline: '',
        google_review_url: '',
        instagram_url: '',
        website_url: '',
        templates: {
          Excellent: '',
          Good: '',
          Average: '',
          Poor: '',
        },
      });
    } catch (err: any) {
      // 9. If creating the business record fails after upload, delete the newly uploaded file.
      console.error('Exception during business creation:', err);
      if (uploadedFilePath) {
        try {
          await supabase.storage.from('business-images').remove([uploadedFilePath]);
        } catch (delErr) {
          console.error('Failed to cleanup uploaded file on rollback:', delErr);
        }
      }
      setImageUploadError(`Failed to create business: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Business Active / Inactive
  const handleToggleActive = async (business: Business) => {
    try {
      const updated = await businessService.toggleBusinessStatus(business.id, !business.is_active);
      setBusinesses((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  // Secure Business Deletion Handler
  const handleConfirmDelete = async () => {
    if (!businessToDelete) return;

    const targetBiz = businessToDelete;
    setIsDeleting(true);

    try {
      // 2. Delete the business row from Supabase
      await businessService.deleteBusiness(targetBiz.id);

      // 5. Remove the business immediately from the admin list
      setBusinesses((prev) => prev.filter((b) => b.id !== targetBiz.id));

      // Close dialog
      setBusinessToDelete(null);

      // 3. After successful row deletion, delete its image from the business-images bucket
      // only if hero_image_url belongs to that Supabase bucket.
      const storagePath = extractSupabaseStoragePath(targetBiz.hero_image_url, 'business-images');
      let imageCleanupWarning: string | null = null;

      if (storagePath) {
        const supabase = getSupabase();
        if (supabase) {
          const { error: storageError } = await supabase.storage
            .from('business-images')
            .remove([storagePath]);
          if (storageError) {
            console.warn('Storage cleanup failed after deleting business row:', storageError);
            imageCleanupWarning = storageError.message;
          }
        }
      }

      // 4. If image deletion fails, keep the business deleted but show a non-blocking cleanup warning.
      if (imageCleanupWarning) {
        setFeedbackMessage({
          type: 'warning',
          text: `"${targetBiz.business_name}" was deleted, but its storage photo could not be removed (${imageCleanupWarning}).`,
        });
      } else {
        setFeedbackMessage({
          type: 'success',
          text: `"${targetBiz.business_name}" has been permanently deleted.`,
        });
      }
    } catch (err: any) {
      console.error('Failed to delete business:', err);
      setFeedbackMessage({
        type: 'error',
        text: `Failed to delete "${targetBiz.business_name}": ${err?.message || 'Database error occurred.'}`,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Template Management Drawer
  const handleOpenTemplateManager = async (business: Business) => {
    setManagingTemplatesFor(business);
    try {
      const templates = await businessService.getReviewTemplates(business.id);
      setTemplatesList(templates);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const handleUpdateTemplateText = async (
    satisfactionLevel: SatisfactionLevel,
    newText: string
  ) => {
    if (!managingTemplatesFor) return;
    try {
      const updated = await businessService.updateReviewTemplate(
        managingTemplatesFor.id,
        satisfactionLevel,
        newText
      );
      setTemplatesList((prev) =>
        prev.map((t) => (t.satisfaction_level === satisfactionLevel ? updated : t))
      );
    } catch (err) {
      console.error('Failed to update template:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#1C1C1E]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#ECEAE4] px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <TapReviewsLogo size="md" subtitle="Admin Management Portal" />

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Visible Sign out button */}
          {onSignOut && (
            <button
              onClick={onSignOut}
              aria-label="Sign out of admin portal"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#636366] hover:text-[#1C1C1E] bg-[#FAF9F5] hover:bg-[#ECEAE4] border border-[#E5E2DA] transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Feedback notification banner (Success / Warning / Error) */}
        {feedbackMessage && (
          <div
            role="alert"
            className={`p-4 rounded-2xl border flex items-start justify-between gap-3 animate-fade-in shadow-xs ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : feedbackMessage.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {feedbackMessage.type === 'success' ? (
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
              ) : feedbackMessage.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-xs font-semibold">
                  {feedbackMessage.type === 'warning'
                    ? 'Storage Cleanup Warning'
                    : feedbackMessage.type === 'error'
                    ? 'Deletion Error'
                    : 'Success'}
                </p>
                <p className="text-xs mt-0.5 opacity-90">{feedbackMessage.text}</p>
              </div>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              aria-label="Dismiss message"
              className="p-1 rounded-lg hover:bg-black/5 text-[#8E8E93] hover:text-[#1C1C1E] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-[#ECEAE4] pb-2">
          <div className="flex items-center gap-4 sm:gap-6 text-sm font-semibold">
            <button
              onClick={() => {
                setActiveTab('list');
                setCreatedResult(null);
              }}
              className={`pb-2 transition-colors relative cursor-pointer ${
                activeTab === 'list'
                  ? 'text-[#1C1C1E] after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-[2px] after:bg-[#1C1C1E]'
                  : 'text-[#8E8E93] hover:text-[#1C1C1E]'
              }`}
            >
              Registered Businesses ({businesses.length})
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`pb-2 transition-colors relative cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'add'
                  ? 'text-[#1C1C1E] after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-[2px] after:bg-[#1C1C1E]'
                  : 'text-[#8E8E93] hover:text-[#1C1C1E]'
              }`}
            >
              <Plus className="w-4 h-4 text-[#C5A059]" />
              <span>Add New Business</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Registered Businesses List */}
        {activeTab === 'list' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="p-12 text-center text-sm text-[#8E8E93]">
                Loading registered businesses...
              </div>
            ) : businesses.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-[#ECEAE4] space-y-3 shadow-xs">
                <Building className="w-10 h-10 text-[#C5A059] mx-auto" />
                <h3 className="font-bold text-lg text-[#1C1C1E]">No Businesses Registered Yet</h3>
                <p className="text-sm text-[#8E8E93] max-w-sm mx-auto">
                  Click the "Add New Business" button to create your first business profile with TapReviews NFC & QR links.
                </p>
                <button
                  onClick={() => setActiveTab('add')}
                  className="mt-2 px-5 py-2.5 bg-[#1C1C1E] text-white rounded-full text-xs font-semibold hover:bg-black transition-colors"
                >
                  Add Business Now
                </button>
              </div>
            ) : (
              <>
                {/* Search and Category Filter Toolbar */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3.5 rounded-2xl border border-[#ECEAE4] shadow-xs">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search businesses by name, slug, tagline, or category..."
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-[#FAF9F5] border border-[#E5E2DA] text-[#1C1C1E] focus:outline-none focus:bg-white focus:border-[#1C1C1E] transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-[#8E8E93] hover:text-[#1C1C1E] cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Filter Dropdown */}
                <div className="flex items-center gap-2">
                  <div className="relative shrink-0 flex-1 sm:flex-none">
                    <Filter className="w-3.5 h-3.5 text-[#8E8E93] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      aria-label="Filter by category"
                      className="w-full sm:w-auto pl-8 pr-7 py-2 text-xs rounded-xl bg-[#FAF9F5] border border-[#E5E2DA] text-[#1C1C1E] focus:outline-none focus:bg-white focus:border-[#1C1C1E] transition-colors appearance-none cursor-pointer font-medium"
                    >
                      <option value="all">All Categories ({businesses.length})</option>
                      {CATEGORY_OPTIONS.filter((c) => c.value !== 'other').map((opt) => {
                        const count = businesses.filter(
                          (b) => (b.business_category || 'general').toLowerCase() === opt.value
                        ).length;
                        return (
                          <option key={opt.value} value={opt.value}>
                            {opt.label} {count > 0 ? `(${count})` : ''}
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#8E8E93] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {(searchQuery || filterCategory !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setFilterCategory('all');
                      }}
                      className="px-3 py-2 text-xs font-semibold text-[#636366] hover:text-[#1C1C1E] bg-[#FAF9F5] hover:bg-[#ECEAE4] border border-[#E5E2DA] rounded-xl transition-colors cursor-pointer shrink-0"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

            {filteredBusinesses.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-[#ECEAE4] space-y-3 shadow-xs">
                <div className="w-10 h-10 rounded-full bg-[#FAF9F5] border border-[#E5E2DA] flex items-center justify-center mx-auto text-[#8E8E93]">
                  <Search className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-base text-[#1C1C1E]">No Businesses Found</h4>
                <p className="text-xs text-[#8E8E93] max-w-sm mx-auto">
                  No businesses matched your search or category filter. Try a different query or reset filters.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterCategory('all');
                  }}
                  className="px-4 py-2 bg-[#1C1C1E] text-white rounded-full text-xs font-semibold hover:bg-black transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredBusinesses.map((biz) => {
                  const reviewUrl = getBusinessCanonicalUrl(biz);
                  return (
                    <div
                      key={biz.id}
                      className={`bg-white rounded-3xl border overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                        biz.is_active ? 'border-[#ECEAE4]' : 'border-rose-200 bg-rose-50/20'
                      }`}
                    >
                      <div>
                        {/* Image Banner */}
                        <div className="relative aspect-[16/9] w-full bg-[#FAF9F5] border-b border-[#ECEAE4]">
                          <img
                            src={biz.hero_image_url}
                            alt={biz.business_name}
                            className={`w-full h-full object-cover ${!biz.is_active ? 'grayscale opacity-60' : ''}`}
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                          {/* Active / Inactive Badge */}
                          <div className="absolute top-3 right-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase backdrop-blur-md shadow-xs ${
                                biz.is_active
                                    ? 'bg-emerald-500/90 text-white'
                                    : 'bg-rose-500/90 text-white'
                              }`}
                            >
                              {biz.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="p-5 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-base text-[#1C1C1E] leading-snug">
                              {biz.business_name}
                            </h3>
                            <div className="text-[#C5A059] shrink-0">
                              <Crown className="w-4 h-4" />
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-[#8E8E93]">
                            <CategoryBadge category={biz.business_category} className="px-2 py-0.5 text-[10px]" />
                            <span>•</span>
                            <span className="line-clamp-1 uppercase tracking-wider">{biz.tagline || 'LOCAL BUSINESS'}</span>
                          </div>

                          <p className="text-xs text-[#636366] line-clamp-2">
                            {biz.welcome_message || "We'd love to hear about your experience..."}
                          </p>

                          <div className="flex items-center justify-between gap-2 bg-[#FAF9F5] p-2 rounded-xl border border-[#E5E2DA]">
                            <span className="text-[11px] font-mono text-[#8E8E93] truncate">
                              {reviewUrl}
                            </span>
                            <button
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(reviewUrl);
                                  setFeedbackMessage({
                                    type: 'success',
                                    text: `Copied URL for "${biz.business_name}"`,
                                  });
                                } catch {
                                  // Fallback
                                }
                              }}
                              title="Copy permanent public URL"
                              className="p-1 hover:bg-[#ECEAE4] rounded text-[#636366] hover:text-[#1C1C1E] transition-colors shrink-0 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="px-5 pb-5 pt-1 border-t border-[#F2EFE8] space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setSelectedBusinessForQr(biz)}
                            className="py-2 px-3 rounded-xl border border-[#E5E2DA] bg-[#FAF9F5] hover:bg-[#ECEAE4] text-xs font-semibold text-[#1C1C1E] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5 text-[#C5A059]" />
                            <span>NFC / QR</span>
                          </button>
                          <button
                            onClick={() => onNavigateToReview(biz.slug, biz.id)}
                            className="py-2 px-3 rounded-xl bg-[#1C1C1E] hover:bg-black text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <button
                            onClick={() => handleOpenTemplateManager(biz)}
                            className="text-[11px] font-medium text-[#636366] hover:text-[#1C1C1E] flex items-center gap-1 cursor-pointer"
                          >
                            <Star className="w-3 h-3 text-[#C5A059]" />
                            <span>Review Drafts</span>
                          </button>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleOpenEditModal(biz)}
                              className="text-[11px] font-medium text-[#636366] hover:text-[#1C1C1E] flex items-center gap-1 cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3 text-[#636366]" />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => handleToggleActive(biz)}
                              className={`text-[11px] font-medium cursor-pointer ${
                                biz.is_active
                                  ? 'text-[#636366] hover:text-[#1C1C1E]'
                                  : 'text-emerald-600 hover:text-emerald-800'
                              }`}
                            >
                              {biz.is_active ? 'Deactivate' : 'Activate'}
                            </button>

                            <button
                              onClick={() => setBusinessToDelete(biz)}
                              className="text-[11px] font-medium text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer transition-colors"
                              title={`Delete ${biz.business_name}`}
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
              </>
            )}
          </div>
        )}

        {/* Tab 2: Add New Business Form */}
        {activeTab === 'add' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Success Banner if business just created */}
            {createdResult && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 space-y-4 animate-fade-in shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-950 text-base">
                      Business Registered Successfully!
                    </h3>
                    <p className="text-xs text-emerald-800">
                      Unique destination URL and NFC/QR credentials generated.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-emerald-950">
                    Generated Customer Review URL:
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={createdResult.url}
                      className="flex-1 px-3 py-2 text-xs bg-white border border-emerald-300 rounded-xl text-emerald-950 font-mono truncate"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(createdResult.url);
                        setCopiedUrl(true);
                        setTimeout(() => setCopiedUrl(false), 2000);
                      }}
                      className="px-3.5 py-2 bg-emerald-800 text-white rounded-xl text-xs font-medium hover:bg-emerald-900 transition-colors flex items-center gap-1.5"
                    >
                      {copiedUrl ? (
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={() => setSelectedBusinessForQr(createdResult.business)}
                    className="py-2.5 px-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>View QR Code</span>
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const qrUrl = await generateHighResQrCode(createdResult.url);
                        downloadQrCodeImage(qrUrl, `${createdResult.business.slug}-qr-1024.png`);
                      } catch (e) {
                        console.error('Download error:', e);
                      }
                    }}
                    className="py-2.5 px-3 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-800" />
                    <span>Download QR</span>
                  </button>
                  <button
                    onClick={() =>
                      onNavigateToReview(createdResult.business.slug, createdResult.business.id)
                    }
                    className="py-2.5 px-3 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 text-emerald-800" />
                    <span>Open Live Page</span>
                  </button>
                </div>
              </div>
            )}

            {/* Form Card */}
            <form
              onSubmit={handleSaveBusiness}
              className="bg-white rounded-3xl border border-[#ECEAE4] p-6 sm:p-8 space-y-6 shadow-sm"
            >
              <div>
                <h2 className="text-xl font-bold text-[#1C1C1E] tracking-tight">
                  Add New Business
                </h2>
                <p className="text-xs text-[#8E8E93] mt-1">
                  Enter details to generate the unique NFC/QR customer review URL.
                </p>
              </div>

              {/* 1. Business Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1C1C1E]">
                  Business Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.business_name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      business_name: name,
                      tagline: prev.tagline ? prev.tagline : name.toUpperCase(),
                    }));
                  }}
                  placeholder="e.g. Royal Biryani House"
                  className={`w-full px-4 py-2.5 rounded-xl border bg-[#FAF9F5] text-sm text-[#1C1C1E] focus:outline-none focus:bg-white transition-colors ${
                    formErrors.business_name
                      ? 'border-rose-500'
                      : 'border-[#E5E2DA] focus:border-[#1C1C1E]'
                  }`}
                />
                {formErrors.business_name && (
                  <p className="text-[11px] text-rose-500">{formErrors.business_name}</p>
                )}
              </div>

              {/* 2. Business Category (required) */}
              <div className="space-y-1.5">
                <label htmlFor="business-category-select" className="text-xs font-semibold text-[#1C1C1E]">
                  Business Category <span className="text-rose-500">*</span>
                </label>
                <select
                  id="business-category-select"
                  required
                  value={selectedCategory}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedCategory(val);
                    if (val.toLowerCase() !== 'other') {
                      setCustomCategory('');
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5E2DA] bg-[#FAF9F5] text-sm text-[#1C1C1E] focus:outline-none focus:border-[#1C1C1E] focus:bg-white transition-colors cursor-pointer"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* When "Other" is selected, show required custom category input */}
                {selectedCategory.toLowerCase() === 'other' && (
                  <div className="pt-2 space-y-1.5 animate-fade-in">
                    <label htmlFor="custom-category-input" className="text-xs font-semibold text-[#1C1C1E]">
                      Custom business category <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="custom-category-input"
                      type="text"
                      required
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="e.g. Pet Grooming"
                      className={`w-full px-4 py-2.5 rounded-xl border bg-[#FAF9F5] text-sm text-[#1C1C1E] focus:outline-none focus:bg-white transition-colors ${
                        formErrors.business_category
                          ? 'border-rose-500'
                          : 'border-[#E5E2DA] focus:border-[#1C1C1E]'
                      }`}
                    />
                    <p className="text-[11px] text-[#8E8E93]">
                      Normalized category key: <span className="font-mono text-[#1C1C1E] font-medium">{generateSlug(customCategory) || '...'}</span>
                    </p>
                    {formErrors.business_category && (
                      <p className="text-[11px] text-rose-500">{formErrors.business_category}</p>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Tagline / Subtitle */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1C1C1E]">
                  Tagline / Subtitle (Uppercase)
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tagline: e.target.value }))}
                  placeholder="e.g. AUTHENTIC DUM BIRYANI & KEBABS"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5E2DA] bg-[#FAF9F5] text-sm text-[#1C1C1E] focus:outline-none focus:border-[#1C1C1E] focus:bg-white transition-colors uppercase"
                />
              </div>

              {/* 3. Business Photograph (required) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#1C1C1E]">
                  Business Photograph <span className="text-rose-500">*</span>
                </label>

                <input
                  type="file"
                  id="business-image-file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                {imagePreviewUrl ? (
                  <div className="space-y-2">
                    <div className="relative rounded-2xl overflow-hidden border border-[#E5E2DA] bg-[#FAF9F5] max-w-md">
                      <div className="aspect-[16/9] w-full bg-slate-100 overflow-hidden">
                        <img
                          src={imagePreviewUrl}
                          alt="Local preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3 flex items-center justify-between gap-2 border-t border-[#ECEAE4] bg-white">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-[#1C1C1E] truncate">
                            {selectedImageFile?.name || 'Selected photograph'}
                          </p>
                          <p className="text-[10px] text-[#8E8E93]">
                            {selectedImageFile
                              ? `${(selectedImageFile.size / (1024 * 1024)).toFixed(2)} MB`
                              : ''}
                          </p>
                        </div>
                        <label
                          htmlFor="business-image-file"
                          className="px-3 py-1.5 rounded-xl border border-[#E5E2DA] bg-[#FAF9F5] hover:bg-[#ECEAE4] text-xs font-semibold text-[#1C1C1E] cursor-pointer transition-colors shrink-0"
                        >
                          Change Photo
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="business-image-file"
                    className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 cursor-pointer bg-[#FAF9F5] hover:bg-[#F5F4EE] transition-colors ${
                      formErrors.hero_image_url || imageUploadError
                        ? 'border-rose-400 bg-rose-50/20'
                        : 'border-[#E5E2DA]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-white shadow-xs flex items-center justify-center text-[#C5A059] mb-2 border border-[#ECEAE4]">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-[#1C1C1E]">
                      Click to choose business photograph
                    </span>
                    <span className="text-[11px] text-[#8E8E93] mt-0.5">
                      JPEG, PNG, or WebP (max 5 MB)
                    </span>
                  </label>
                )}

                {/* Upload or validation error message */}
                {(imageUploadError || formErrors.hero_image_url) && (
                  <p className="text-[11px] text-rose-500 font-medium">
                    {imageUploadError || formErrors.hero_image_url}
                  </p>
                )}
              </div>

              {/* 4. Welcome Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1C1C1E]">
                  Welcome Message
                </label>
                <input
                  type="text"
                  value={formData.welcome_message}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, welcome_message: e.target.value }))
                  }
                  placeholder="We'd love to hear about your experience..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5E2DA] bg-[#FAF9F5] text-sm text-[#1C1C1E] focus:outline-none focus:border-[#1C1C1E] focus:bg-white transition-colors"
                />
              </div>

              {/* 5. Google Review URL (required) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1C1C1E]">
                  Google Review URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={formData.google_review_url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, google_review_url: e.target.value }))
                  }
                  placeholder="https://search.google.com/local/writereview?placeid=... or https://g.page/r/.../review"
                  className={`w-full px-4 py-2.5 rounded-xl border bg-[#FAF9F5] text-sm text-[#1C1C1E] focus:outline-none focus:bg-white transition-colors ${
                    formErrors.google_review_url
                      ? 'border-rose-500'
                      : 'border-[#E5E2DA] focus:border-[#1C1C1E]'
                  }`}
                />
                <p className="text-[11px] text-[#8E8E93]">
                  Find this in your Google Business Profile &gt; "Ask for reviews" link.
                </p>
              </div>

              {/* 6. Social Links: Instagram and Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1C1C1E] flex items-center gap-1.5">
                    <Instagram className="w-3.5 h-3.5 text-[#E1306C]" />
                    <span>Instagram URL</span>
                  </label>
                  <input
                    type="url"
                    value={formData.instagram_url}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, instagram_url: e.target.value }))
                    }
                    placeholder="https://instagram.com/yourbusiness"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E5E2DA] bg-[#FAF9F5] text-xs text-[#1C1C1E] focus:outline-none focus:border-[#1C1C1E] focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1C1C1E] flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#1C1C1E]" />
                    <span>Website URL</span>
                  </label>
                  <input
                    type="url"
                    value={formData.website_url}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, website_url: e.target.value }))
                    }
                    placeholder="https://yourbusiness.in"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E5E2DA] bg-[#FAF9F5] text-xs text-[#1C1C1E] focus:outline-none focus:border-[#1C1C1E] focus:bg-white"
                  />
                </div>
              </div>

              {/* Optional Custom Review Drafts Disclosure */}
              <div className="border border-[#ECEAE4] rounded-2xl p-4 bg-[#FAF9F5]">
                <button
                  type="button"
                  onClick={() => setShowCustomTemplates(!showCustomTemplates)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-[#1C1C1E]"
                >
                  <span className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-[#C5A059]" />
                    Customize Review Drafts (Optional)
                  </span>
                  {showCustomTemplates ? (
                    <ChevronUp className="w-4 h-4 text-[#8E8E93]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#8E8E93]" />
                  )}
                </button>

                {showCustomTemplates && (
                  <div className="space-y-3 mt-4 pt-3 border-t border-[#ECEAE4]">
                    <p className="text-[11px] text-[#8E8E93]">
                      If left blank, natural, authentic starting drafts will be automatically generated for all 4 satisfaction levels.
                    </p>
                    {(['Excellent', 'Good', 'Average', 'Poor'] as SatisfactionLevel[]).map((level) => (
                      <div key={level} className="space-y-1">
                        <label className="text-[11px] font-semibold text-[#636366]">
                          {level} Review Example
                        </label>
                        <textarea
                          rows={2}
                          value={formData.templates?.[level] || ''}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              templates: {
                                ...prev.templates!,
                                [level]: e.target.value,
                              },
                            }))
                          }
                          placeholder={`Custom draft for ${level}...`}
                          className="w-full p-2.5 text-xs rounded-xl border border-[#E5E2DA] bg-white text-[#1C1C1E] focus:outline-none focus:border-[#1C1C1E]"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-full bg-[#1C1C1E] hover:bg-black text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-black/10 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Business...' : 'Save Business & Generate NFC/QR Link'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* QR Code / NFC Stand Modal */}
      {selectedBusinessForQr && (
        <QrCodeModal
          business={selectedBusinessForQr}
          onClose={() => setSelectedBusinessForQr(null)}
          onPreviewReviewPage={() => {
            const biz = selectedBusinessForQr;
            setSelectedBusinessForQr(null);
            onNavigateToReview(biz.slug, biz.id);
          }}
        />
      )}

      {/* Supabase Connection Modal */}
      {showSupabaseModal && (
        <SupabaseSetupModal
          onClose={() => setShowSupabaseModal(false)}
          onConfigSaved={() => {
            loadBusinesses();
          }}
        />
      )}

      {/* Review Template Drawer/Modal */}
      {managingTemplatesFor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-[#ECEAE4] my-auto">
            <div className="flex items-center justify-between border-b border-[#F2EFE8] pb-4">
              <div>
                <h3 className="font-bold text-base text-[#1C1C1E]">
                  Review Drafts: {managingTemplatesFor.business_name}
                </h3>
                <p className="text-xs text-[#8E8E93]">
                  Customize starting examples for each satisfaction level
                </p>
              </div>
              <button
                onClick={() => setManagingTemplatesFor(null)}
                className="p-1 rounded-full text-[#8E8E93] hover:text-[#1C1C1E]"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {(['Excellent', 'Good', 'Average', 'Poor'] as SatisfactionLevel[]).map((level) => {
                const current = templatesList.find((t) => t.satisfaction_level === level);
                return (
                  <div key={level} className="space-y-1.5 p-3 rounded-2xl bg-[#FAF9F5] border border-[#E5E2DA]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1C1C1E]">{level} Rating Draft</span>
                      <span className="text-[10px] text-[#8E8E93]">Max 1000 chars</span>
                    </div>
                    <textarea
                      rows={3}
                      value={current?.review_text || ''}
                      onChange={(e) => handleUpdateTemplateText(level, e.target.value)}
                      className="w-full p-2.5 text-xs bg-white rounded-xl border border-[#E5E2DA] text-[#1C1C1E] focus:outline-none focus:border-[#1C1C1E]"
                    />
                  </div>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setManagingTemplatesFor(null)}
                className="w-full py-2.5 bg-[#1C1C1E] text-white rounded-xl text-xs font-semibold hover:bg-black transition-colors"
              >
                Done Customizing Drafts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Business Modal */}
      {editingBusiness && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-[#ECEAE4] my-auto">
            <div className="flex items-center justify-between border-b border-[#F2EFE8] pb-4">
              <div>
                <h3 className="font-bold text-base text-[#1C1C1E]">
                  Edit Business
                </h3>
                <p className="text-xs text-[#8E8E93]">
                  Update details for {editingBusiness.business_name}
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingBusiness(null);
                  setEditSelectedImageFile(null);
                  setEditImagePreviewUrl(null);
                  setEditImageUploadError(null);
                }}
                className="p-1 rounded-full text-[#8E8E93] hover:text-[#1C1C1E] cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditBusiness} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* 1. Business Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1C1C1E]">
                  Business Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.business_name}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, business_name: e.target.value }))
                  }
                  className="w-full px-4 py-2 rounded-xl border border-[#E5E2DA] bg-[#FAF9F5] text-sm text-[#1C1C1E] focus:outline-none focus:border-[#1C1C1E] focus:bg-white"
                />
                {editErrors.business_name && (
                  <p className="text-[11px] text-rose-500">{editErrors.business_name}</p>
                )}
              </div>

              {/* 2. Business Category */}
              <div className="space-y-1.5">
                <label htmlFor="edit-business-category-select" className="text-xs font-semibold text-[#1C1C1E]">
                  Business Category <span className="text-rose-500">*</span>
                </label>
                <select
                  id="edit-business-category-select"
                  required
                  value={editSelectedCategory}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditSelectedCategory(val);
                    if (val.toLowerCase() !== 'other') {
                      setEditCustomCategory('');
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5E2DA] bg-[#FAF9F5] text-sm text-[#1C1C1E] focus:outline-none focus:border-[#1C1C1E] focus:bg-white transition-colors cursor-pointer"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* When "Other" is selected, show required custom category input */}
                {editSelectedCategory.toLowerCase() === 'other' && (
                  <div className="pt-2 space-y-1.5 animate-fade-in">
                    <label htmlFor="edit-custom-category-input" className="text-xs font-semibold text-[#1C1C1E]">
                      Custom business category <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="edit-custom-category-input"
                      type="text"
                      required
                      value={editCustomCategory}
                      onChange={(e) => setEditCustomCategory(e.target.value)}
                      placeholder="e.g. Pet Grooming"
                      className={`w-full px-4 py-2.5 rounded-xl border bg-[#FAF9F5] text-sm text-[#1C1C1E] focus:outline-none focus:bg-white transition-colors ${
                        editErrors.business_category
                          ? 'border-rose-500'
                          : 'border-[#E5E2DA] focus:border-[#1C1C1E]'
                      }`}
                    />
                    <p className="text-[11px] text-[#8E8E93]">
                      Normalized category key: <span className="font-mono text-[#1C1C1E] font-medium">{generateSlug(editCustomCategory) || '...'}</span>
                    </p>
                    {editErrors.business_category && (
                      <p className="text-[11px] text-rose-500">{editErrors.business_category}</p>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Tagline */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1C1C1E]">Tagline</label>
                <input
                  type="text"
                  value={editFormData.tagline}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, tagline: e.target.value }))
                  }
                  className="w-full px-4 py-2 rounded-xl border border-[#E5E2DA] bg-[#FAF9F5] text-sm text-[#1C1C1E] focus:outline-none focus:border-[#1C1C1E] focus:bg-white uppercase"
                />
              </div>

              {/* 4. Business Photograph */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#1C1C1E]">
                  Business Photograph <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  id="edit-business-image-file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleEditImageFileChange}
                  className="hidden"
                />

                <div className="space-y-2">
                  <div className="relative rounded-2xl overflow-hidden border border-[#E5E2DA] bg-[#FAF9F5]">
                    <div className="aspect-[16/9] w-full bg-slate-100 overflow-hidden">
                      {editImagePreviewUrl ? (
                        <img
                          src={editImagePreviewUrl}
                          alt="Business preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#8E8E93] text-xs">
                          No photo available
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex items-center justify-between gap-2 border-t border-[#ECEAE4] bg-white">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-[#1C1C1E] truncate">
                          {editSelectedImageFile
                            ? editSelectedImageFile.name
                            : 'Current business photograph'}
                        </p>
                        <p className="text-[10px] text-[#8E8E93]">
                          {editSelectedImageFile
                            ? `${(editSelectedImageFile.size / (1024 * 1024)).toFixed(2)} MB • (Ready to upload)`
                            : 'Keep current photo or select a new file'}
                        </p>
                      </div>
                      <label
                        htmlFor="edit-business-image-file"
                        className="px-3 py-1.5 rounded-xl border border-[#E5E2DA] bg-[#FAF9F5] hover:bg-[#ECEAE4] text-xs font-semibold text-[#1C1C1E] cursor-pointer transition-colors shrink-0"
                      >
                        {editSelectedImageFile ? 'Change File' : 'Replace Photo'}
                      </label>
                    </div>
                  </div>

                  {/* Clear error message if validation or upload fails */}
                  {(editImageUploadError || editErrors.hero_image_url) && (
                    <p className="text-[11px] text-rose-500 font-medium">
                      {editImageUploadError || editErrors.hero_image_url}
                    </p>
                  )}
                </div>
              </div>

              {/* 5. Welcome Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1C1C1E]">Welcome Message</label>
                <textarea
                  rows={2}
                  value={editFormData.welcome_message}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, welcome_message: e.target.value }))
                  }
                  className="w-full px-4 py-2 rounded-xl border border-[#E5E2DA] bg-[#FAF9F5] text-sm text-[#1C1C1E] focus:outline-none focus:border-[#1C1C1E] focus:bg-white"
                />
              </div>

              {/* 6. Google Review URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1C1C1E]">
                  Google Review URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={editFormData.google_review_url}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, google_review_url: e.target.value }))
                  }
                  className="w-full px-4 py-2 rounded-xl border border-[#E5E2DA] bg-[#FAF9F5] text-sm text-[#1C1C1E] focus:outline-none focus:border-[#1C1C1E] focus:bg-white"
                />
                {editErrors.google_review_url && (
                  <p className="text-[11px] text-rose-500">{editErrors.google_review_url}</p>
                )}
              </div>

              {/* 7. Instagram & Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1C1C1E]">Instagram URL</label>
                  <input
                    type="url"
                    value={editFormData.instagram_url}
                    onChange={(e) =>
                      setEditFormData((prev) => ({ ...prev, instagram_url: e.target.value }))
                    }
                    placeholder="https://instagram.com/..."
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E5E2DA] bg-[#FAF9F5] text-xs text-[#1C1C1E] focus:outline-none focus:border-[#1C1C1E] focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1C1C1E]">Website URL</label>
                  <input
                    type="url"
                    value={editFormData.website_url}
                    onChange={(e) =>
                      setEditFormData((prev) => ({ ...prev, website_url: e.target.value }))
                    }
                    placeholder="https://..."
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E5E2DA] bg-[#FAF9F5] text-xs text-[#1C1C1E] focus:outline-none focus:border-[#1C1C1E] focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingBusiness(null);
                    setEditSelectedImageFile(null);
                    setEditImagePreviewUrl(null);
                    setEditImageUploadError(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-[#E5E2DA] text-xs font-semibold text-[#1C1C1E] hover:bg-[#FAF9F5] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#1C1C1E] text-white text-xs font-semibold hover:bg-black transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isEditSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {businessToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-business-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-[#ECEAE4] shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 id="delete-business-title" className="font-bold text-base sm:text-lg text-[#1C1C1E]">
                  Delete Business
                </h3>
                <p className="text-xs text-[#636366] leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-semibold text-[#1C1C1E]">"{businessToDelete.business_name}"</span>?
                  This will remove the business profile, its review templates, and access to customer reviews.
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#FAF9F5] border border-[#ECEAE4] rounded-2xl text-[11px] text-[#8E8E93] space-y-1">
              <p className="font-medium text-[#1C1C1E]">Business Details:</p>
              <p>• Category: <span className="font-mono text-[#1C1C1E]">{businessToDelete.business_category || 'general'}</span></p>
              <p className="truncate">• ID: <span className="font-mono text-[#1C1C1E]">{businessToDelete.id}</span></p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setBusinessToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#E5E2DA] text-xs font-semibold text-[#1C1C1E] hover:bg-[#FAF9F5] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Business'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
