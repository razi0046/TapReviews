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

-- 10. Seed Initial Review Suggestions for Supported Categories
INSERT INTO public.review_suggestions (business_category, satisfaction_level, suggestion_text, language, is_active)
VALUES
    ('fast-food', 'Excellent', 'Incredible fast food! The burgers were juicy and flavorful, fries hot and crispy, and service was lightning fast. Great value for money and a super clean dining area.', 'en', true),
    ('fast-food', 'Good', 'Quick and tasty fast food. Our order was ready within minutes and the food was fresh. Perfect spot for a quick bite.', 'en', true),
    ('fast-food', 'Average', 'Decent fast food overall. The meal was okay, but the fries were slightly lukewarm and the counter was busy during peak hours.', 'en', true),
    ('fast-food', 'Poor', 'Disappointing visit today. The burger was dry and our order took over 20 minutes for fast food. Hope turnaround improves.', 'en', true),
    ('kebab-store', 'Excellent', 'Hands down the best kebabs in town! Tender, smoky, perfectly spiced, and served piping hot with fresh mint chutney and warm naan. Outstanding hospitality and authentic taste.', 'en', true),
    ('kebab-store', 'Good', 'Very good kebabs with rich marinade and great charcoal aroma. Friendly staff and quick takeaway packaging.', 'en', true),
    ('kebab-store', 'Average', 'The kebabs had good flavor, but portions were slightly small for the price. Service was polite.', 'en', true),
    ('kebab-store', 'Poor', 'The kebabs were dry and lacked the usual spice balance. Order took longer than promised.', 'en', true),
    ('abaya-shop', 'Excellent', 'Exquisite collection of abayas! The fabric quality, fine stitching, and elegant cuts are exceptional. The staff was incredibly patient, courteous, and helped me find the perfect fit. Highly recommended!', 'en', true),
    ('abaya-shop', 'Good', 'Beautiful abaya designs and pleasant shopping experience. Helpful sales staff and fair pricing for the craftsmanship.', 'en', true),
    ('abaya-shop', 'Average', 'Nice collection of modest wear, though popular sizes in a few trending designs were out of stock. Overall decent experience.', 'en', true),
    ('abaya-shop', 'Poor', 'Customer assistance was lacking and alteration service took several days longer than agreed. Needs better customer support.', 'en', true),
    ('sweets-shop', 'Excellent', 'Pure perfection in every bite! The traditional sweets are prepared with rich desi ghee, perfect sweetness, and unmatched freshness. Pristine hygiene and warm, welcoming service.', 'en', true),
    ('sweets-shop', 'Good', 'Delicious fresh mithai and sweets. The packaging was neat and staff was helpful with recommendations.', 'en', true),
    ('sweets-shop', 'Average', 'Good variety of sweets. Taste was standard, though some popular festival items were already sold out.', 'en', true),
    ('sweets-shop', 'Poor', 'The sweets purchased did not taste fresh and the counter staff seemed disinterested. Hope quality consistency improves.', 'en', true),
    ('snacks-shop', 'Excellent', 'Best snack shop around! Fresh, crispy savories and flavorful street-style bites made right before your eyes. Hygiene is top-notch and prices are very reasonable. A must-visit!', 'en', true),
    ('snacks-shop', 'Good', 'Tasty and crisp snacks with great flavor combinations. Fast service and clean packaging for takeout.', 'en', true),
    ('snacks-shop', 'Average', 'Decent variety of snacks. The taste was okay, though oil could have been drained better on the fried items.', 'en', true),
    ('snacks-shop', 'Poor', 'Snacks tasted stale and were served lukewarm. Hygiene standards need improvement.', 'en', true),
    ('meat-shop', 'Excellent', 'Top-quality, fresh, and hygienic meat shop! Custom cuts were prepared exactly as requested, cleanly packed, and impeccably fresh. Highly professional and spotless store.', 'en', true),
    ('meat-shop', 'Good', 'Reliable meat shop with fresh stock and courteous butchers. Clean environment and quick counter service.', 'en', true),
    ('meat-shop', 'Average', 'Meat quality is satisfactory. Waiting time was somewhat long during morning rush hours.', 'en', true),
    ('meat-shop', 'Poor', 'The cuts were uneven and the meat did not look as fresh as expected. Better cleanliness is needed.', 'en', true),
    ('bags-shop', 'Excellent', 'Fantastic bag store! Impressive range of travel luggage, backpacks, and stylish handbags. Superior build quality, durable zippers, and knowledgeable staff who helped me choose the right size.', 'en', true),
    ('bags-shop', 'Good', 'Great selection of bags and accessories. Reasonable prices and helpful customer service.', 'en', true),
    ('bags-shop', 'Average', 'Decent collection of bags. Found what I needed, though warranty and return explanations could be clearer.', 'en', true),
    ('bags-shop', 'Poor', 'The bag zipper had an issue within days and the exchange process was cumbersome. Disappointed with the after-sales experience.', 'en', true),
    ('optics-store', 'Excellent', 'Outstanding optics store! The optometrist performed a thorough, precise eye examination and helped me pick the ideal frames and anti-glare lenses. Pristine showroom, fast delivery, and comfortable fit.', 'en', true),
    ('optics-store', 'Good', 'Great selection of eyeglasses and sunglasses. Friendly staff and prompt lens fitting. Pleased with the quality of my new frames.', 'en', true),
    ('optics-store', 'Average', 'Decent optical collection. Eye testing was fine, though frame adjustments took a couple of attempts to get the right bridge fit.', 'en', true),
    ('optics-store', 'Poor', 'The power prescription had to be redone due to initial lens inaccuracies, and turnaround was delayed. Customer service needs better communication.', 'en', true),
    ('boutique-design-house', 'Excellent', 'A breathtaking boutique design house! Unique couture pieces, artistic silhouettes, and unmatched attention to detail in every embroidery and drape. Working with their designer was an absolute dream.', 'en', true),
    ('boutique-design-house', 'Good', 'Beautiful designer apparel with distinctive cuts and premium textiles. Attentive stylists and pleasant studio atmosphere.', 'en', true),
    ('boutique-design-house', 'Average', 'Creative fashion collection. Designs are elegant, though lead times for made-to-order garments were longer than estimated.', 'en', true),
    ('boutique-design-house', 'Poor', 'The final outfit fitting did not match the agreed design specifications, and alterations were delayed. Expected better craftsmanship.', 'en', true),
    ('tailoring', 'Excellent', 'Master tailoring at its best! The stitching was impeccable, measurements were exact on the first try, and the suit fit like a glove. Delivered on time with meticulous finishing.', 'en', true),
    ('tailoring', 'Good', 'Very skilled tailor with great attention to custom fitting. Clean stitching and reasonable turnaround for alterations.', 'en', true),
    ('tailoring', 'Average', 'Satisfactory tailoring work. The fit was good after one round of minor adjustments, though delivery was a few days behind schedule.', 'en', true),
    ('tailoring', 'Poor', 'The measurements were off and the garment was stitched too tight. Disappointed with the finishing and customer responsiveness.', 'en', true),
    ('turf', 'Excellent', 'Top-notch sports turf! The artificial grass is well-maintained with great bounce, excellent LED floodlighting, clean dugouts, and ample parking. Perfect venue for football and box cricket matches!', 'en', true),
    ('turf', 'Good', 'Fun place for weekend football games. Good pitch quality, clear boundary netting, and hassle-free slot booking.', 'en', true),
    ('turf', 'Average', 'Decent turf facility. The pitch is okay, though the netting had a few minor tears and changing rooms could be cleaner.', 'en', true),
    ('turf', 'Poor', 'Poorly maintained turf with uneven patches and dim lighting during evening hours. Management double-booked our reserved slot.', 'en', true)
ON CONFLICT DO NOTHING;
