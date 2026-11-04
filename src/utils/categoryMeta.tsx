import React from 'react';
import {
  Utensils,
  Coffee,
  Croissant,
  UtensilsCrossed,
  Flame,
  Candy,
  Cookie,
  Beef,
  Scissors,
  Sparkles,
  Stethoscope,
  Dumbbell,
  Hotel,
  Store,
  Wrench,
  Shirt,
  ShoppingBag,
  Smartphone,
  Tv,
  Gem,
  GraduationCap,
  HelpCircle,
  LucideIcon,
} from 'lucide-react';

export interface CategoryDefinition {
  value: string;
  label: string;
  Icon: LucideIcon;
}

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  { value: 'restaurant', label: 'Restaurant', Icon: Utensils },
  { value: 'cafe', label: 'Café', Icon: Coffee },
  { value: 'bakery', label: 'Bakery', Icon: Croissant },
  { value: 'fast-food', label: 'Fast Food', Icon: UtensilsCrossed },
  { value: 'kebab-store', label: 'Kebab Store', Icon: Flame },
  { value: 'sweets-shop', label: 'Sweets Shop', Icon: Candy },
  { value: 'snacks-shop', label: 'Snacks Shop', Icon: Cookie },
  { value: 'meat-shop', label: 'Meat Shop', Icon: Beef },
  { value: 'salon', label: 'Salon', Icon: Scissors },
  { value: 'spa', label: 'Spa', Icon: Sparkles },
  { value: 'clinic', label: 'Clinic', Icon: Stethoscope },
  { value: 'gym', label: 'Gym', Icon: Dumbbell },
  { value: 'hotel', label: 'Hotel', Icon: Hotel },
  { value: 'retail-store', label: 'Retail Store', Icon: Store },
  { value: 'car-service', label: 'Car Service', Icon: Wrench },
  { value: 'fashion', label: 'Fashion', Icon: Shirt },
  { value: 'clothing', label: 'Clothing Store', Icon: Shirt },
  { value: 'abaya-shop', label: 'Abaya Shop', Icon: Sparkles },
  { value: 'bags-shop', label: 'Bags Shop', Icon: ShoppingBag },
  { value: 'mobile-repairing-shop', label: 'Mobile Repairing Shop', Icon: Smartphone },
  { value: 'electronics-shop', label: 'Electronics Shop', Icon: Tv },
  { value: 'jewellery', label: 'Jewellery Shop', Icon: Gem },
  { value: 'education', label: 'Education', Icon: GraduationCap },
  { value: 'general', label: 'General', Icon: Store },
];

const CATEGORY_MAP = new Map<string, CategoryDefinition>(
  CATEGORY_DEFINITIONS.map((c) => [c.value.toLowerCase(), c])
);

/**
 * Convert slug or key (e.g. 'pet-grooming') into title-cased readable string ('Pet Grooming').
 */
export function formatCategoryLabel(rawCategory?: string): string {
  if (!rawCategory) return 'General';
  const clean = rawCategory.toLowerCase().trim();
  const known = CATEGORY_MAP.get(clean);
  if (known) return known.label;

  // Title-case slug or separated words
  return clean
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Return suitable icon component for a category.
 */
export function getCategoryIconComponent(rawCategory?: string): LucideIcon {
  if (!rawCategory) return Store;
  const clean = rawCategory.toLowerCase().trim();
  const known = CATEGORY_MAP.get(clean);
  if (known) return known.Icon;
  return Store;
}

/**
 * Render category icon element with custom class names.
 */
export function renderCategoryIcon(
  rawCategory?: string,
  className: string = 'w-3.5 h-3.5'
): React.ReactElement {
  const IconComponent = getCategoryIconComponent(rawCategory);
  return <IconComponent className={className} aria-hidden="true" />;
}

export interface CategoryBadgeProps {
  category?: string;
  className?: string;
  iconClassName?: string;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  className = '',
  iconClassName = 'w-3 h-3 text-[#C5A059]',
}) => {
  const label = formatCategoryLabel(category);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FAF9F5] border border-[#E5E0D5] text-[11px] font-medium text-[#1C1C1E] shadow-2xs ${className}`}
    >
      {renderCategoryIcon(category, iconClassName)}
      <span>{label}</span>
    </span>
  );
};
