import { Business, ReviewTemplate, ReviewSuggestion, SatisfactionLevel, BusinessFormData } from '../types';
import { getSupabase } from '../lib/supabase';
import { generateSlug, generateUUID, isValidUuid } from '../utils/slugify';

const STORAGE_KEY_BUSINESSES = 'nfc_review_businesses_v1';
const STORAGE_KEY_TEMPLATES = 'nfc_review_templates_v1';
const STORAGE_KEY_SUGGESTIONS = 'nfc_review_suggestions_v1';

// Initial authentic seed businesses matching local businesses in India
export const INITIAL_BUSINESSES: Business[] = [
  {
    id: '8f3a2c91-7d45-4e2b-a631-9c8d12345678', // PRD example UUID
    business_name: 'Royal Biryani House',
    slug: 'royal-biryani',
    hero_image_url: '/src/assets/images/royal_biryani_platter_1793547629005.jpg',
    welcome_message: "We'd love to hear about your experience...",
    tagline: 'AUTHENTIC DUM BIRYANI & KEBABS',
    business_category: 'restaurant',
    google_review_url: 'https://search.google.com/local/writereview?placeid=ChIJ123_RoyalBiryani',
    instagram_url: 'https://instagram.com/royalbiryani.in',
    website_url: 'https://royalbiryani.in',
    is_active: true,
    created_at: new Date('2026-01-15T10:00:00Z').toISOString(),
    updated_at: new Date('2026-01-15T10:00:00Z').toISOString(),
  },
  {
    id: '3c8e1a72-6b94-4d10-8f29-1a2b3c4d5e6f',
    business_name: 'Cafe Chai & Bloom',
    slug: 'cafe-chai-bloom',
    hero_image_url: '/src/assets/images/cafe_chai_interior_1793547630570.jpg',
    welcome_message: 'Thank you for stopping by! Tell us about your visit...',
    tagline: 'ARTISANAL CHAI, BAKES & ROASTS',
    business_category: 'cafe',
    google_review_url: 'https://search.google.com/local/writereview?placeid=ChIJ456_CafeChai',
    instagram_url: 'https://instagram.com/cafechaibloom',
    website_url: 'https://cafechaibloom.com',
    is_active: true,
    created_at: new Date('2026-02-01T11:00:00Z').toISOString(),
    updated_at: new Date('2026-02-01T11:00:00Z').toISOString(),
  },
  {
    id: '9d4b2e81-5c32-4a77-8e66-7b8c9d0e1f2a',
    business_name: 'Spice Symphony Contemporary Dining',
    slug: 'spice-symphony',
    hero_image_url: '/src/assets/images/spice_symphony_platter_1793547630011.jpg',
    welcome_message: "We'd love to hear about your dining experience...",
    tagline: 'CONTEMPORARY INDIAN GASTRONOMY',
    business_category: 'restaurant',
    google_review_url: 'https://search.google.com/local/writereview?placeid=ChIJ789_SpiceSymphony',
    instagram_url: 'https://instagram.com/spicesymphony.dining',
    website_url: 'https://spicesymphony.in',
    is_active: true,
    created_at: new Date('2026-02-10T14:30:00Z').toISOString(),
    updated_at: new Date('2026-02-10T14:30:00Z').toISOString(),
  },
];

export const INITIAL_TEMPLATES: ReviewTemplate[] = [
  // Royal Biryani
  {
    id: 't-rb-01',
    business_id: '8f3a2c91-7d45-4e2b-a631-9c8d12345678',
    satisfaction_level: 'Excellent',
    review_text: 'Outstanding dining experience at Royal Biryani House! The mutton dum biryani was cooked to perfection with tender meat, fragrant long-grain saffron rice, and balanced spices. The raita and mirchi ka salan complemented it wonderfully. Attentive staff and warm ambiance. Highly recommended!',
    language: 'en',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 't-rb-02',
    business_id: '8f3a2c91-7d45-4e2b-a631-9c8d12345678',
    satisfaction_level: 'Good',
    review_text: 'Had a pleasant lunch at Royal Biryani House. The chicken biryani and garlic naan were fresh and flavorful. Quick service and clean seating area. Will surely visit again with family.',
    language: 'en',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 't-rb-03',
    business_id: '8f3a2c91-7d45-4e2b-a631-9c8d12345678',
    satisfaction_level: 'Average',
    review_text: 'Decent dining experience at Royal Biryani House. The food taste was good, though service took a bit longer than usual during peak hours. Friendly staff overall.',
    language: 'en',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 't-rb-04',
    business_id: '8f3a2c91-7d45-4e2b-a631-9c8d12345678',
    satisfaction_level: 'Poor',
    review_text: 'Visited Royal Biryani House today. While the ambiance is nice, our table wait time was longer than expected and the order took quite a while to arrive. Hope the management improves the order turnaround time.',
    language: 'en',
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

// Reusable category-based suggestion library (AI-generated starting suggestions for each business category)
export const INITIAL_CATEGORY_SUGGESTIONS: ReviewSuggestion[] = [
  // Restaurant
  {
    id: 'sug-rest-exc',
    business_category: 'restaurant',
    satisfaction_level: 'Excellent',
    suggestion_text: 'Exceptional dining experience! The dishes were beautifully presented and bursting with rich, authentic flavors. Every item was cooked to perfection. Prompt hospitality and fantastic ambiance.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-rest-exc-2',
    business_category: 'restaurant',
    satisfaction_level: 'Excellent',
    suggestion_text: 'An absolute culinary gem! Warm hospitality, impeccable service, and sensational dishes crafted with genuine care. Highly recommended to anyone seeking memorable food.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-rest-good',
    business_category: 'restaurant',
    satisfaction_level: 'Good',
    suggestion_text: 'Really enjoyed our meal here. Good portion sizes, fresh ingredients, and polite service. Would gladly recommend to friends and family.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-rest-avg',
    business_category: 'restaurant',
    satisfaction_level: 'Average',
    suggestion_text: 'Fair dining experience overall. The food flavors were decent, though service was slightly slow during the peak dinner rush. Courteous staff.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-rest-poor',
    business_category: 'restaurant',
    satisfaction_level: 'Poor',
    suggestion_text: 'Our visit was underwhelming today. We encountered long wait times and the dishes were served lukewarm. Hope management reviews kitchen turnaround speed.',
    language: 'en',
    is_active: true,
  },

  // Cafe
  {
    id: 'sug-cafe-exc',
    business_category: 'cafe',
    satisfaction_level: 'Excellent',
    suggestion_text: 'Wonderful cafe with a soothing aesthetic and excellent brews! The specialty beverages and fresh snacks were spot on. Friendly baristas and a lovely spot to work or relax.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-cafe-good',
    business_category: 'cafe',
    satisfaction_level: 'Good',
    suggestion_text: 'Pleasant cafe atmosphere with good coffee and baked goods. Quick preparation and comfortable seating for casual catchups.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-cafe-avg',
    business_category: 'cafe',
    satisfaction_level: 'Average',
    suggestion_text: 'Decent coffee and seating. It was quite crowded during our visit so finding a spot took some time, but beverages were satisfactory.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-cafe-poor',
    business_category: 'cafe',
    satisfaction_level: 'Poor',
    suggestion_text: 'Disappointed with our visit today. Order took too long for a simple coffee and the beverage was served lukewarm. Needs better service pace.',
    language: 'en',
    is_active: true,
  },

  // Bakery
  {
    id: 'sug-bak-exc',
    business_category: 'bakery',
    satisfaction_level: 'Excellent',
    suggestion_text: 'Absolutely delightful bakery! The breads and pastries were baked fresh with incredible texture and aroma. High quality ingredients and warm service.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-bak-good',
    business_category: 'bakery',
    satisfaction_level: 'Good',
    suggestion_text: 'Delicious fresh bakes and cakes. Clean store and helpful counter staff. Will definitely visit again for weekend treats.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-bak-avg',
    business_category: 'bakery',
    satisfaction_level: 'Average',
    suggestion_text: 'Standard bakery selection. The cookies were nice, though limited options were available when we visited in the evening.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-bak-poor',
    business_category: 'bakery',
    satisfaction_level: 'Poor',
    suggestion_text: 'The items we bought were not as fresh as expected. Hope the bakery maintains better freshness checks throughout the day.',
    language: 'en',
    is_active: true,
  },

  // Salon
  {
    id: 'sug-sal-exc',
    business_category: 'salon',
    satisfaction_level: 'Excellent',
    suggestion_text: 'Top-tier salon experience! The stylist was attentive, skilled, and took the time to understand exactly what I wanted. Clean, hygienic, and relaxing atmosphere.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-sal-good',
    business_category: 'salon',
    satisfaction_level: 'Good',
    suggestion_text: 'Good grooming service with skilled professionals. On-time appointment and courteous staff. Satisfied with the results.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-sal-avg',
    business_category: 'salon',
    satisfaction_level: 'Average',
    suggestion_text: 'Service was acceptable. Had to wait about 15 minutes past my booked appointment time, but the hair styling was okay.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-sal-poor',
    business_category: 'salon',
    satisfaction_level: 'Poor',
    suggestion_text: 'Did not have a good experience today. The service felt rushed and did not match what was requested. Staff needs better consultation training.',
    language: 'en',
    is_active: true,
  },

  // Clinic
  {
    id: 'sug-clin-exc',
    business_category: 'clinic',
    satisfaction_level: 'Excellent',
    suggestion_text: 'Extremely professional and caring clinic. The doctor listened patiently, explained the diagnosis clearly, and made me feel completely at ease. Clean clinic and minimal waiting time.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-clin-good',
    business_category: 'clinic',
    satisfaction_level: 'Good',
    suggestion_text: 'Thorough consultation and polite support staff. Good hygiene protocols and straightforward prescription instructions.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-clin-avg',
    business_category: 'clinic',
    satisfaction_level: 'Average',
    suggestion_text: 'The consultation was helpful, although waiting time was somewhat long despite having an advance appointment slot.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-clin-poor',
    business_category: 'clinic',
    satisfaction_level: 'Poor',
    suggestion_text: 'Very long delay before seeing the doctor and reception staff was not communicative about the wait. Better scheduling is needed.',
    language: 'en',
    is_active: true,
  },

  // Fast Food
  {
    id: 'sug-ff-exc',
    business_category: 'fast-food',
    satisfaction_level: 'Excellent',
    suggestion_text: 'Incredible fast food! The burgers were juicy and flavorful, fries hot and crispy, and service was lightning fast. Great value for money and a super clean dining area.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-ff-good',
    business_category: 'fast-food',
    satisfaction_level: 'Good',
    suggestion_text: 'Quick and tasty fast food. Our order was ready within minutes and the food was fresh. Perfect spot for a quick bite.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-ff-avg',
    business_category: 'fast-food',
    satisfaction_level: 'Average',
    suggestion_text: 'Decent fast food overall. The meal was okay, but the fries were slightly lukewarm and the counter was busy during peak hours.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-ff-poor',
    business_category: 'fast-food',
    satisfaction_level: 'Poor',
    suggestion_text: 'Disappointing visit today. The burger was dry and our order took over 20 minutes for fast food. Hope turnaround improves.',
    language: 'en',
    is_active: true,
  },

  // Kebab Store
  {
    id: 'sug-kebab-exc',
    business_category: 'kebab-store',
    satisfaction_level: 'Excellent',
    suggestion_text: 'Hands down the best kebabs in town! Tender, smoky, perfectly spiced, and served piping hot with fresh mint chutney and warm naan. Outstanding hospitality and authentic taste.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-kebab-good',
    business_category: 'kebab-store',
    satisfaction_level: 'Good',
    suggestion_text: 'Very good kebabs with rich marinade and great charcoal aroma. Friendly staff and quick takeaway packaging.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-kebab-avg',
    business_category: 'kebab-store',
    satisfaction_level: 'Average',
    suggestion_text: 'The kebabs had good flavor, but portions were slightly small for the price. Service was polite.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-kebab-poor',
    business_category: 'kebab-store',
    satisfaction_level: 'Poor',
    suggestion_text: 'The kebabs were dry and lacked the usual spice balance. Order took longer than promised.',
    language: 'en',
    is_active: true,
  },

  // Abaya Shop
  {
    id: 'sug-abaya-exc',
    business_category: 'abaya-shop',
    satisfaction_level: 'Excellent',
    suggestion_text: 'Exquisite collection of abayas! The fabric quality, fine stitching, and elegant cuts are exceptional. The staff was incredibly patient, courteous, and helped me find the perfect fit. Highly recommended!',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-abaya-good',
    business_category: 'abaya-shop',
    satisfaction_level: 'Good',
    suggestion_text: 'Beautiful abaya designs and pleasant shopping experience. Helpful sales staff and fair pricing for the craftsmanship.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-abaya-avg',
    business_category: 'abaya-shop',
    satisfaction_level: 'Average',
    suggestion_text: 'Nice collection of modest wear, though popular sizes in a few trending designs were out of stock. Overall decent experience.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-abaya-poor',
    business_category: 'abaya-shop',
    satisfaction_level: 'Poor',
    suggestion_text: 'Customer assistance was lacking and alteration service took several days longer than agreed. Needs better customer support.',
    language: 'en',
    is_active: true,
  },

  // Sweets Shop
  {
    id: 'sug-sweet-exc',
    business_category: 'sweets-shop',
    satisfaction_level: 'Excellent',
    suggestion_text: 'Pure perfection in every bite! The traditional sweets are prepared with rich desi ghee, perfect sweetness, and unmatched freshness. Pristine hygiene and warm, welcoming service.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-sweet-good',
    business_category: 'sweets-shop',
    satisfaction_level: 'Good',
    suggestion_text: 'Delicious fresh mithai and sweets. The packaging was neat and staff was helpful with recommendations.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-sweet-avg',
    business_category: 'sweets-shop',
    satisfaction_level: 'Average',
    suggestion_text: 'Good variety of sweets. Taste was standard, though some popular festival items were already sold out.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-sweet-poor',
    business_category: 'sweets-shop',
    satisfaction_level: 'Poor',
    suggestion_text: 'The sweets purchased did not taste fresh and the counter staff seemed disinterested. Hope quality consistency improves.',
    language: 'en',
    is_active: true,
  },

  // Snacks Shop
  {
    id: 'sug-snack-exc',
    business_category: 'snacks-shop',
    satisfaction_level: 'Excellent',
    suggestion_text: 'Best snack shop around! Fresh, crispy savories and flavorful street-style bites made right before your eyes. Hygiene is top-notch and prices are very reasonable. A must-visit!',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-snack-good',
    business_category: 'snacks-shop',
    satisfaction_level: 'Good',
    suggestion_text: 'Tasty and crisp snacks with great flavor combinations. Fast service and clean packaging for takeout.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-snack-avg',
    business_category: 'snacks-shop',
    satisfaction_level: 'Average',
    suggestion_text: 'Decent variety of snacks. The taste was okay, though oil could have been drained better on the fried items.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-snack-poor',
    business_category: 'snacks-shop',
    satisfaction_level: 'Poor',
    suggestion_text: 'Snacks tasted stale and were served lukewarm. Hygiene standards need improvement.',
    language: 'en',
    is_active: true,
  },

  // Meat Shop
  {
    id: 'sug-meat-exc',
    business_category: 'meat-shop',
    satisfaction_level: 'Excellent',
    suggestion_text: 'Top-quality, fresh, and hygienic meat shop! Custom cuts were prepared exactly as requested, cleanly packed, and impeccably fresh. Highly professional and spotless store.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-meat-good',
    business_category: 'meat-shop',
    satisfaction_level: 'Good',
    suggestion_text: 'Reliable meat shop with fresh stock and courteous butchers. Clean environment and quick counter service.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-meat-avg',
    business_category: 'meat-shop',
    satisfaction_level: 'Average',
    suggestion_text: 'Meat quality is satisfactory. Waiting time was somewhat long during morning rush hours.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-meat-poor',
    business_category: 'meat-shop',
    satisfaction_level: 'Poor',
    suggestion_text: 'The cuts were uneven and the meat did not look as fresh as expected. Better cleanliness is needed.',
    language: 'en',
    is_active: true,
  },

  // Bags Shop
  {
    id: 'sug-bags-exc',
    business_category: 'bags-shop',
    satisfaction_level: 'Excellent',
    suggestion_text: 'Fantastic bag store! Impressive range of travel luggage, backpacks, and stylish handbags. Superior build quality, durable zippers, and knowledgeable staff who helped me choose the right size.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-bags-good',
    business_category: 'bags-shop',
    satisfaction_level: 'Good',
    suggestion_text: 'Great selection of bags and accessories. Reasonable prices and helpful customer service.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-bags-avg',
    business_category: 'bags-shop',
    satisfaction_level: 'Average',
    suggestion_text: 'Decent collection of bags. Found what I needed, though warranty and return explanations could be clearer.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-bags-poor',
    business_category: 'bags-shop',
    satisfaction_level: 'Poor',
    suggestion_text: 'The bag zipper had an issue within days and the exchange process was cumbersome. Disappointed with the after-sales experience.',
    language: 'en',
    is_active: true,
  },

  // General / Default
  {
    id: 'sug-gen-exc',
    business_category: 'general',
    satisfaction_level: 'Excellent',
    suggestion_text: 'Outstanding experience from start to finish! The service was prompt, professional, and delivered with genuine care. Highly recommended to anyone looking for quality service.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-gen-good',
    business_category: 'general',
    satisfaction_level: 'Good',
    suggestion_text: 'Great service and pleasant experience. Everything went smoothly and the staff was courteous. Would happily return again.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-gen-avg',
    business_category: 'general',
    satisfaction_level: 'Average',
    suggestion_text: 'Satisfactory experience overall. The service met basic expectations, though there is scope for quicker turnaround.',
    language: 'en',
    is_active: true,
  },
  {
    id: 'sug-gen-poor',
    business_category: 'general',
    satisfaction_level: 'Poor',
    suggestion_text: 'Unfortunately our experience did not meet expectations due to delays and lack of communication. Sharing feedback so management can improve.',
    language: 'en',
    is_active: true,
  },
];

// Helper to access LocalStorage cache
function getLocalBusinesses(): Business[] {
  if (typeof window === 'undefined') return INITIAL_BUSINESSES;
  const stored = localStorage.getItem(STORAGE_KEY_BUSINESSES);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY_BUSINESSES, JSON.stringify(INITIAL_BUSINESSES));
    return INITIAL_BUSINESSES;
  }
  try {
    const parsed: Business[] = JSON.parse(stored);
    return parsed.map((b) => ({
      ...b,
      business_category: b.business_category || 'general',
    }));
  } catch {
    return INITIAL_BUSINESSES;
  }
}

function setLocalBusinesses(list: Business[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_BUSINESSES, JSON.stringify(list));
}

function getLocalTemplates(): ReviewTemplate[] {
  if (typeof window === 'undefined') return INITIAL_TEMPLATES;
  const stored = localStorage.getItem(STORAGE_KEY_TEMPLATES);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(INITIAL_TEMPLATES));
    return INITIAL_TEMPLATES;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_TEMPLATES;
  }
}

function setLocalTemplates(list: ReviewTemplate[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(list));
}

function getLocalSuggestions(): ReviewSuggestion[] {
  if (typeof window === 'undefined') return INITIAL_CATEGORY_SUGGESTIONS;
  const stored = localStorage.getItem(STORAGE_KEY_SUGGESTIONS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY_SUGGESTIONS, JSON.stringify(INITIAL_CATEGORY_SUGGESTIONS));
    return INITIAL_CATEGORY_SUGGESTIONS;
  }
  try {
    const parsed: ReviewSuggestion[] = JSON.parse(stored);
    // Ensure all standard initial suggestions exist in local cache without wiping custom ones
    const existingIds = new Set(parsed.map((s) => s.id));
    const missing = INITIAL_CATEGORY_SUGGESTIONS.filter((s) => !existingIds.has(s.id));
    if (missing.length > 0) {
      const merged = [...parsed, ...missing];
      localStorage.setItem(STORAGE_KEY_SUGGESTIONS, JSON.stringify(merged));
      return merged;
    }
    return parsed;
  } catch {
    return INITIAL_CATEGORY_SUGGESTIONS;
  }
}

export const businessService = {
  /**
   * Retrieve an active business by its UUID and slug from Supabase.
   * Matches id, slug, and is_active = true using .maybeSingle().
   */
  async getBusinessBySlugAndUuid(slug: string, uuid: string): Promise<Business | null> {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select(
            'id, business_name, slug, hero_image_url, welcome_message, tagline, business_category, google_review_url, instagram_url, website_url, is_active, created_at, updated_at'
          )
          .eq('id', uuid)
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();

        if (error) {
          console.error('Error fetching business from Supabase:', error);
          return null;
        }

        if (data) {
          return {
            ...(data as Business),
            business_category: data.business_category || 'general',
          };
        }
        return null;
      } catch (err) {
        console.error('Supabase query exception:', err);
        return null;
      }
    }

    // Fallback only when Supabase is not configured (offline / unit tests without env vars)
    const list = getLocalBusinesses();
    const found = list.find(
      (b) =>
        b.id.toLowerCase() === uuid.toLowerCase() &&
        b.slug.toLowerCase() === slug.toLowerCase() &&
        b.is_active === true
    );
    if (found) {
      return {
        ...found,
        business_category: found.business_category || 'general',
      };
    }
    return null;
  },

  /**
   * Retrieve a business by either slug or UUID from shared Supabase database.
   * Enables cross-device public access to /business/:slug and /business/:id.
   */
  async getBusinessByIdentifier(identifier: string, fallbackSlug?: string): Promise<Business | null> {
    if (!identifier && !fallbackSlug) return null;
    const cleanId = (identifier || '').trim();
    const cleanSlug = (fallbackSlug || '').trim();
    const isUuid = isValidUuid(cleanId);

    const supabase = getSupabase();
    if (supabase) {
      try {
        let query = supabase
          .from('businesses')
          .select(
            'id, business_name, slug, hero_image_url, welcome_message, tagline, business_category, google_review_url, instagram_url, website_url, is_active, created_at, updated_at'
          );

        if (isUuid) {
          query = query.eq('id', cleanId);
        } else if (cleanSlug) {
          query = query.eq('slug', cleanSlug.toLowerCase());
        } else {
          query = query.eq('slug', cleanId.toLowerCase());
        }

        const { data, error } = await query.maybeSingle();

        if (error) {
          console.error('Error fetching business by identifier from Supabase:', error);
        } else if (data) {
          return {
            ...(data as Business),
            business_category: data.business_category || 'general',
          };
        }
      } catch (err) {
        console.error('Supabase query exception in getBusinessByIdentifier:', err);
      }
    }

    // Fallback when Supabase is offline or for test environments
    const list = getLocalBusinesses();
    const found = list.find((b) => {
      if (isUuid) {
        return b.id.toLowerCase() === cleanId.toLowerCase();
      }
      const matchSlug = cleanSlug ? cleanSlug.toLowerCase() : cleanId.toLowerCase();
      return b.slug.toLowerCase() === matchSlug;
    });

    if (found) {
      return {
        ...found,
        business_category: found.business_category || 'general',
      };
    }

    return null;
  },

  /**
   * Retrieve a business strictly by its unique slug.
   */
  async getBusinessBySlug(slug: string): Promise<Business | null> {
    return this.getBusinessByIdentifier(slug);
  },

  /**
   * Retrieve a business strictly by UUID.
   */
  async getBusinessById(id: string): Promise<Business | null> {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) {
          return {
            ...(data as Business),
            business_category: data.business_category || 'general',
          };
        }
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to local data:', err);
      }
    }

    const list = getLocalBusinesses();
    const found = list.find((b) => b.id.toLowerCase() === id.toLowerCase());
    return found ? { ...found, business_category: found.business_category || 'general' } : null;
  },

  /**
   * Retrieve all businesses (for Admin management).
   */
  async getAllBusinesses(): Promise<Business[]> {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return (data as Business[]).map((b) => ({
            ...b,
            business_category: b.business_category || 'general',
          }));
        }
      } catch (err) {
        console.warn('Supabase fetch all failed, falling back to local:', err);
      }
    }

    return getLocalBusinesses();
  },

  /**
   * Retrieve active review templates for a business.
   */
  async getReviewTemplates(businessId: string): Promise<ReviewTemplate[]> {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('review_templates')
          .select('*')
          .eq('business_id', businessId)
          .eq('is_active', true);

        if (!error && data && data.length > 0) {
          return data as ReviewTemplate[];
        }
      } catch (err) {
        console.warn('Supabase templates fetch failed, falling back to local:', err);
      }
    }

    const list = getLocalTemplates();
    return list.filter((t) => t.business_id === businessId && t.is_active);
  },

  /**
   * Retrieve a template by satisfaction level for a business.
   */
  async getReviewTemplateBySatisfaction(
    businessId: string,
    level: SatisfactionLevel
  ): Promise<ReviewTemplate | null> {
    const templates = await this.getReviewTemplates(businessId);
    const found = templates.find((t) => t.satisfaction_level === level);
    return found || null;
  },

  /**
   * Retrieve an active AI-generated review suggestion for a normalized category and satisfaction level.
   * Query review_suggestions using:
   * - business_category (normalized lowercase)
   * - satisfaction_level
   * - language = 'en'
   * - is_active = true
   */
  async getCategoryReviewSuggestion(
    category: string,
    satisfactionLevel: SatisfactionLevel,
    language: string = 'en'
  ): Promise<ReviewSuggestion | null> {
    const normalizedCategory = (category || 'general').toLowerCase().trim();
    const supabase = getSupabase();

    if (supabase) {
      try {
        // In Supabase, the column is review_text (or suggestion_text)
        const { data, error } = await supabase
          .from('review_suggestions')
          .select('id, business_category, satisfaction_level, review_text, language, is_active')
          .eq('business_category', normalizedCategory)
          .eq('satisfaction_level', satisfactionLevel)
          .eq('language', language)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          const row = data as Record<string, any>;
          return {
            id: row.id,
            business_category: row.business_category,
            satisfaction_level: row.satisfaction_level,
            suggestion_text: row.suggestion_text || row.review_text || '',
            review_text: row.review_text || row.suggestion_text || '',
            language: row.language,
            is_active: row.is_active,
          };
        }

        // If no suggestion exists for custom category, retry with 'general' (Requirement 6)
        if (normalizedCategory !== 'general') {
          return this.getCategoryReviewSuggestion('general', satisfactionLevel, language);
        }
      } catch (err) {
        console.error('Supabase review suggestion query exception:', err);
      }
    }

    // Fallback to pre-seeded category library if Supabase is offline or table has no row for this category yet
    const list = getLocalSuggestions();
    const found = list.find(
      (s) =>
        s.business_category.toLowerCase() === normalizedCategory &&
        s.satisfaction_level === satisfactionLevel &&
        s.language === language &&
        s.is_active === true
    );
    if (found) {
      return found;
    }

    // If no suggestions found locally for custom category, retry with 'general'
    if (normalizedCategory !== 'general') {
      return this.getCategoryReviewSuggestion('general', satisfactionLevel, language);
    }

    return null;
  },

  /**
   * Select a random, rotating review suggestion for a business category and satisfaction level.
   * - Random selection executed server-side via Supabase RPC `pick_review_suggestion`.
   * - Excludes recent IDs (up to 5) to avoid immediate repeats on the same device.
   * - If no result remains after exclusions, retries once without exclusions.
   * - If no review suggestions exist for a custom category, retries lookup with 'general' as fallback (Requirement 6).
   * - Fallback for offline/unit tests randomly picks from local category library.
   * - Does NOT fetch the entire suggestion library into the browser.
   */
  async pickRotatingReviewSuggestion(
    category: string,
    satisfactionLevel: SatisfactionLevel,
    excludeIds: string[] = [],
    language: string = 'en'
  ): Promise<{ id: string; review_text: string } | null> {
    const normalizedCategory = (category || 'general').toLowerCase().trim();
    const supabase = getSupabase();

    if (supabase) {
      try {
        // Step 1: Query pick_review_suggestion RPC passing exclusions
        let { data, error } = await supabase.rpc('pick_review_suggestion', {
          p_business_category: normalizedCategory,
          p_satisfaction_level: satisfactionLevel,
          p_language: language,
          p_exclude_ids: excludeIds,
        });

        // Step 2: If no result remains after exclusions, retry once without exclusions
        if ((!data || (Array.isArray(data) && data.length === 0)) && excludeIds.length > 0) {
          const retryResult = await supabase.rpc('pick_review_suggestion', {
            p_business_category: normalizedCategory,
            p_satisfaction_level: satisfactionLevel,
            p_language: language,
            p_exclude_ids: [],
          });
          data = retryResult.data;
          error = retryResult.error;
        }

        if (!error && Array.isArray(data) && data.length > 0) {
          const picked = data[0];
          return {
            id: picked.id,
            review_text: picked.review_text || picked.suggestion_text || '',
          };
        }

        // Step 3: If no suggestions exist for a custom category, retry with 'general' as fallback (Requirement 6)
        if (normalizedCategory !== 'general') {
          return this.pickRotatingReviewSuggestion('general', satisfactionLevel, excludeIds, language);
        }
      } catch (err) {
        console.error('Error invoking pick_review_suggestion RPC:', err);
      }
    }

    // Fallback when Supabase is offline or for local testing
    const list = getLocalSuggestions();
    const matching = list.filter(
      (s) =>
        s.business_category.toLowerCase() === normalizedCategory &&
        s.satisfaction_level === satisfactionLevel &&
        s.language === language &&
        s.is_active === true
    );

    if (matching.length === 0) {
      // Retry with 'general' if custom category has no suggestions
      if (normalizedCategory !== 'general') {
        return this.pickRotatingReviewSuggestion('general', satisfactionLevel, excludeIds, language);
      }
      return null;
    }

    // Exclude recent IDs
    let pool = matching.filter((s) => !excludeIds.includes(s.id));
    // If no result remains after exclusions, retry once without exclusions
    if (pool.length === 0) {
      pool = matching;
    }

    const randomIndex = Math.floor(Math.random() * pool.length);
    const chosen = pool[randomIndex];
    return {
      id: chosen.id,
      review_text: chosen.suggestion_text || chosen.review_text || '',
    };
  },

  /**
   * Add a new business with automatic UUID (or pre-generated ID), slug, normalized category, and optional initial templates.
   */
  async createBusiness(
    formData: BusinessFormData,
    customId?: string
  ): Promise<{ business: Business; templates: ReviewTemplate[]; error?: any }> {
    const id = customId || generateUUID();
    const slug = generateSlug(formData.business_name);
    const now = new Date().toISOString();
    const normalizedCategory = (formData.business_category || 'general').toLowerCase().trim();

    const newBusiness: Business = {
      id,
      business_name: formData.business_name.trim(),
      slug,
      hero_image_url: formData.hero_image_url.trim(),
      welcome_message: formData.welcome_message?.trim() || "We'd love to hear about your experience...",
      tagline: formData.tagline?.trim() || formData.business_name.toUpperCase(),
      business_category: normalizedCategory,
      google_review_url: formData.google_review_url.trim(),
      instagram_url: formData.instagram_url?.trim() || '',
      website_url: formData.website_url?.trim() || '',
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    // Prepare default or customized review templates for the 4 satisfaction levels
    const satisfactionLevels: SatisfactionLevel[] = ['Excellent', 'Good', 'Average', 'Poor'];
    const newTemplates: ReviewTemplate[] = satisfactionLevels.map((level) => {
      let defaultText = '';
      if (formData.templates && formData.templates[level]) {
        defaultText = formData.templates[level];
      } else {
        switch (level) {
          case 'Excellent':
            defaultText = `Had an outstanding experience at ${newBusiness.business_name}! The service, quality, and atmosphere exceeded expectations. Friendly and attentive staff. Highly recommended to everyone!`;
            break;
          case 'Good':
            defaultText = `Great visit to ${newBusiness.business_name}. Good service, pleasant environment, and quality experience overall. Would happily visit again.`;
            break;
          case 'Average':
            defaultText = `Decent experience at ${newBusiness.business_name}. Everything was satisfactory, though there is some room for quicker turnaround during rush hours.`;
            break;
          case 'Poor':
            defaultText = `Visited ${newBusiness.business_name} today. Unfortunately our experience had a few shortcomings with wait times and service. Sharing constructive feedback for the management to improve.`;
            break;
        }
      }

      return {
        id: generateUUID(),
        business_id: id,
        satisfaction_level: level,
        review_text: defaultText,
        language: 'en',
        is_active: true,
        created_at: now,
      };
    });

    let insertError: any = null;
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { error: busError } = await supabase.from('businesses').insert(newBusiness);
        if (busError) {
          insertError = busError;
          throw busError;
        }

        const { error: tplError } = await supabase.from('review_templates').insert(newTemplates);
        if (tplError) console.warn('Supabase templates insert warning:', tplError);
      } catch (err: any) {
        insertError = err;
        console.warn('Failed saving to Supabase directly, persisting to local store:', err);
      }
    }

    // Always update local cache
    const currentBusinesses = getLocalBusinesses();
    setLocalBusinesses([newBusiness, ...currentBusinesses]);

    const currentTemplates = getLocalTemplates();
    setLocalTemplates([...currentTemplates, ...newTemplates]);

    return { business: newBusiness, templates: newTemplates, error: insertError };
  },

  /**
   * Update an existing business.
   */
  async updateBusiness(id: string, updates: Partial<Business>): Promise<Business> {
    const now = new Date().toISOString();
    const updatedData: Partial<Business> = {
      ...updates,
      updated_at: now,
    };
    if (updates.business_category) {
      updatedData.business_category = updates.business_category.toLowerCase().trim();
    }

    const supabase = getSupabase();
    if (supabase) {
      const { error: updateError } = await supabase.from('businesses').update(updatedData).eq('id', id);
      if (updateError) {
        console.error('Supabase update error:', updateError);
        throw updateError;
      }
    }

    const currentBusinesses = getLocalBusinesses();
    const index = currentBusinesses.findIndex((b) => b.id === id);
    if (index === -1) {
      throw new Error('Business not found');
    }
    const updated = { ...currentBusinesses[index], ...updatedData };
    currentBusinesses[index] = updated;
    setLocalBusinesses(currentBusinesses);
    return updated;
  },

  /**
   * Toggle business active status.
   */
  async toggleBusinessStatus(id: string, is_active: boolean): Promise<Business> {
    return this.updateBusiness(id, { is_active });
  },

  /**
   * Permanently delete a business row.
   */
  async deleteBusiness(id: string): Promise<void> {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('businesses').delete().eq('id', id);
      if (error) {
        console.error('Supabase delete business error:', error);
        throw error;
      }
    }

    // Always update local cache (and local templates)
    const currentBusinesses = getLocalBusinesses();
    setLocalBusinesses(currentBusinesses.filter((b) => b.id !== id));

    const currentTemplates = getLocalTemplates();
    setLocalTemplates(currentTemplates.filter((t) => t.business_id !== id));
  },

  /**
   * Save or update a review template.
   */
  async updateReviewTemplate(
    businessId: string,
    satisfactionLevel: SatisfactionLevel,
    reviewText: string
  ): Promise<ReviewTemplate> {
    const templates = getLocalTemplates();
    const existingIndex = templates.findIndex(
      (t) => t.business_id === businessId && t.satisfaction_level === satisfactionLevel
    );

    let template: ReviewTemplate;
    if (existingIndex >= 0) {
      template = {
        ...templates[existingIndex],
        review_text: reviewText,
      };
      templates[existingIndex] = template;
    } else {
      template = {
        id: generateUUID(),
        business_id: businessId,
        satisfaction_level: satisfactionLevel,
        review_text: reviewText,
        language: 'en',
        is_active: true,
        created_at: new Date().toISOString(),
      };
      templates.push(template);
    }
    setLocalTemplates(templates);

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('review_templates').upsert(template);
      } catch (err) {
        console.warn('Supabase template update warning:', err);
      }
    }

    return template;
  },
};
