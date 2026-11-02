-- ==============================================================================
-- NFC & QR Business Review Platform - Supabase Schema Migration
-- ==============================================================================

-- 1. Create businesses table
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL,
    slug TEXT NOT NULL,
    hero_image_url TEXT NOT NULL,
    welcome_message TEXT DEFAULT 'We''d love to hear about your experience...',
    tagline TEXT,
    business_category TEXT NOT NULL DEFAULT 'general',
    google_review_url TEXT NOT NULL,
    instagram_url TEXT,
    website_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- In case table already exists without business_category, ensure column is added
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' AND column_name = 'business_category'
    ) THEN 
        ALTER TABLE public.businesses ADD COLUMN business_category TEXT NOT NULL DEFAULT 'general';
    END IF;
END $$;

-- Index for speedy lookups by slug and UUID
CREATE INDEX IF NOT EXISTS idx_businesses_slug_id ON public.businesses(slug, id);
CREATE INDEX IF NOT EXISTS idx_businesses_is_active ON public.businesses(is_active);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON public.businesses(business_category);

-- 2. Create review_templates table (business-specific review drafts - highest priority)
CREATE TABLE IF NOT EXISTS public.review_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    satisfaction_level TEXT NOT NULL CHECK (satisfaction_level IN ('Excellent', 'Good', 'Average', 'Poor')),
    review_text TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for template fetching by business and satisfaction level
CREATE INDEX IF NOT EXISTS idx_templates_business_satisfaction 
ON public.review_templates(business_id, satisfaction_level, is_active);

-- 3. Create review_suggestions table (reusable category-based suggestion library)
CREATE TABLE IF NOT EXISTS public.review_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_category TEXT NOT NULL,
    satisfaction_level TEXT NOT NULL CHECK (satisfaction_level IN ('Excellent', 'Good', 'Average', 'Poor')),
    suggestion_text TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for category-based suggestion lookup
CREATE INDEX IF NOT EXISTS idx_suggestions_category_satisfaction 
ON public.review_suggestions(business_category, satisfaction_level, language, is_active);

-- 4. Storage bucket setup for business images
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-images', 'business-images', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_suggestions ENABLE ROW LEVEL SECURITY;

-- 6. Public read policies: Anyone can read active records
CREATE POLICY "Public read active businesses"
ON public.businesses
FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Public read active review templates"
ON public.review_templates
FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Public read active review suggestions"
ON public.review_suggestions
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- 7. Admin full access policies (customers cannot write to suggestions or businesses)
CREATE POLICY "Admin full access on businesses"
ON public.businesses
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Admin full access on review templates"
ON public.review_templates
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Admin full access on review suggestions"
ON public.review_suggestions
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 8. Public Storage access policy
CREATE POLICY "Public image access"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'business-images');

CREATE POLICY "Admin upload image access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'business-images');

-- 9. Random Suggestion Selection RPC with Rolling Exclusions
-- Returns a random active review suggestion matching category and satisfaction level
-- Excludes recently displayed IDs to prevent repeats on the same device
CREATE OR REPLACE FUNCTION public.pick_review_suggestion(
    p_business_category TEXT,
    p_satisfaction_level TEXT,
    p_language TEXT DEFAULT 'en',
    p_exclude_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS TABLE (
    id UUID,
    review_text TEXT,
    tone TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT rs.id, rs.review_text, COALESCE(rs.tone, 'neutral')::TEXT AS tone
    FROM public.review_suggestions rs
    WHERE rs.business_category = p_business_category
      AND rs.satisfaction_level = p_satisfaction_level
      AND rs.language = p_language
      AND rs.is_active = true
      AND (p_exclude_ids IS NULL OR cardinality(p_exclude_ids) = 0 OR rs.id != ALL(p_exclude_ids))
    ORDER BY random()
    LIMIT 1;
END;
$$;
