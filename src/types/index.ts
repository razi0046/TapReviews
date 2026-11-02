export type SatisfactionLevel = 'Excellent' | 'Good' | 'Average' | 'Poor';

export interface Business {
  id: string; // UUID
  business_name: string;
  slug: string;
  hero_image_url: string;
  welcome_message?: string;
  tagline?: string;
  business_category?: string;
  google_review_url: string;
  instagram_url?: string;
  website_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewTemplate {
  id: string; // UUID
  business_id: string;
  satisfaction_level: SatisfactionLevel;
  review_text: string;
  language: string;
  is_active: boolean;
  created_at: string;
}

export interface ReviewSuggestion {
  id: string;
  business_category: string;
  satisfaction_level: SatisfactionLevel;
  suggestion_text: string;
  review_text?: string;
  language: string;
  is_active: boolean;
  created_at?: string;
}

export interface BusinessFormData {
  business_name: string;
  hero_image_url: string;
  welcome_message?: string;
  tagline?: string;
  business_category: string;
  google_review_url: string;
  instagram_url?: string;
  website_url?: string;
  templates?: {
    Excellent: string;
    Good: string;
    Average: string;
    Poor: string;
  };
}
