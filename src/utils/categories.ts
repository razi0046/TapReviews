import React from 'react';
import {
  Utensils,
  Coffee,
  Cake,
  Scissors,
  Sparkles,
  HeartPulse,
  Dumbbell,
  Hotel,
  Store,
  Car,
  Shirt,
  ShoppingBag,
  Smartphone,
  Laptop,
  Gem,
  GraduationCap,
  Building,
  LucideIcon,
} from 'lucide-react';

export interface CategoryInfo {
  value: string;
  label: string;
  icon: LucideIcon;
  description?: string;
}

export const CATEGORY_DEFINITIONS: Record<string, CategoryInfo> = {
  restaurant: {
    value: 'restaurant',
    label: 'Restaurant',
    icon: Utensils,
    description: 'Fine dining, casual eateries, family restaurants & bistros',
  },
  cafe: {
    value: 'cafe',
    label: 'Café',
    icon: Coffee,
    description: 'Artisanal roasters, espresso bars, tea lounges & breakfast spots',
  },
  bakery: {
    value: 'bakery',
    label: 'Bakery',
    icon: Cake,
    description: 'Pastry shops, custom cakes, patisseries & bread artisans',
  },
  salon: {
    value: 'salon',
    label: 'Salon',
    icon: Scissors,
    description: 'Hair salons, barbershops, beauty parlours & styling studios',
  },
  spa: {
    value: 'spa',
    label: 'Spa',
    icon: Sparkles,
    description: 'Wellness spas, massage therapy, body care & reflexology',
  },
  clinic: {
    value: 'clinic',
    label: 'Clinic',
    icon: HeartPulse,
    description: 'Dental care, general physicians, specialty medical practices',
  },
  gym: {
    value: 'gym',
    label: 'Gym',
    icon: Dumbbell,
    description: 'Fitness centers, crossfit studios, yoga & strength gyms',
  },
  hotel: {
    value: 'hotel',
    label: 'Hotel',
    icon: Hotel,
    description: 'Boutique hotels, luxury resorts, guest suites & hospitality',
  },
  'retail-store': {
    value: 'retail-store',
    label: 'Retail Store',
    icon: Store,
    description: 'General merchandise, specialty gift shops & departmental stores',
  },
  'car-service': {
    value: 'car-service',
    label: 'Car Service',
    icon: Car,
    description: 'Auto repairs, car detailing, tire service & inspections',
  },
  fashion: {
    value: 'fashion',
    label: 'Fashion',
    icon: Sparkles,
    description: 'Designer fashion, multi-brand apparel & couture boutiques',
  },
  clothing: {
    value: 'clothing',
    label: 'Clothing Store',
    icon: Shirt,
    description: 'Ready-to-wear garments, casual apparel & family outfitters',
  },
  'bag-business': {
    value: 'bag-business',
    label: 'Bag Business',
    icon: ShoppingBag,
    description: 'Handbags, luggage, backpacks, travel bags, leather goods & accessories',
  },
  'abaya-shop': {
    value: 'abaya-shop',
    label: 'Abaya Shop',
    icon: Sparkles,
    description: 'Abayas, hijabs, modest wear, Islamic fashion & couture modest boutiques',
  },
  'mobile-repairing-shop': {
    value: 'mobile-repairing-shop',
    label: 'Mobile Repairing Shop',
    icon: Smartphone,
    description: 'Smartphone repairs, screen replacements & device accessories',
  },
  'electronics-shop': {
    value: 'electronics-shop',
    label: 'Electronics Shop',
    icon: Laptop,
    description: 'Laptops, home appliances, gadgets & smart accessories',
  },
  jewellery: {
    value: 'jewellery',
    label: 'Jewellery Shop',
    icon: Gem,
    description: 'Gold, diamonds, silver ornaments, custom rings & luxury jewellery',
  },
  education: {
    value: 'education',
    label: 'Education',
    icon: GraduationCap,
    description: 'Coaching centers, academies, private tutors & skill institutes',
  },
  general: {
    value: 'general',
    label: 'General',
    icon: Store,
    description: 'Local businesses, neighborhood services & professional storefronts',
  },
};

export const STANDARD_CATEGORIES: string[] = [
  'restaurant',
  'cafe',
  'bakery',
  'salon',
  'spa',
  'clinic',
  'gym',
  'hotel',
  'retail-store',
  'car-service',
  'fashion',
  'clothing',
  'bag-business',
  'abaya-shop',
  'mobile-repairing-shop',
  'electronics-shop',
  'jewellery',
  'education',
  'general',
];

export const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Café' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'salon', label: 'Salon' },
  { value: 'spa', label: 'Spa' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'gym', label: 'Gym' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'retail-store', label: 'Retail Store' },
  { value: 'car-service', label: 'Car Service' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'clothing', label: 'Clothing Store' },
  { value: 'bag-business', label: 'Bag Business' },
  { value: 'abaya-shop', label: 'Abaya Shop' },
  { value: 'mobile-repairing-shop', label: 'Mobile Repairing Shop' },
  { value: 'electronics-shop', label: 'Electronics Shop' },
  { value: 'jewellery', label: 'Jewellery Shop' },
  { value: 'education', label: 'Education' },
  { value: 'general', label: 'General' },
  { value: 'other', label: 'Other — enter custom category' },
];

/**
 * Returns user-friendly label for any business category slug.
 * Handles standard categories and gracefully humanizes custom slugs.
 */
export function getCategoryLabel(slug?: string | null): string {
  if (!slug) return 'General';
  const clean = slug.toLowerCase().trim();
  if (CATEGORY_DEFINITIONS[clean]) {
    return CATEGORY_DEFINITIONS[clean].label;
  }
  // Convert custom slug "pet-grooming" -> "Pet Grooming"
  return clean
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Returns Lucide icon component corresponding to the business category.
 */
export function getCategoryIcon(slug?: string | null): LucideIcon {
  if (!slug) return Store;
  const clean = slug.toLowerCase().trim();
  if (CATEGORY_DEFINITIONS[clean]) {
    return CATEGORY_DEFINITIONS[clean].icon;
  }
  return Building;
}
