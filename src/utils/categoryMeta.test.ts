import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCategoryLabel,
  getCategoryIconComponent,
  CATEGORY_DEFINITIONS,
} from './categoryMeta';
import { STANDARD_CATEGORIES, CATEGORY_OPTIONS } from '../components/AdminPanel';

test('categoryMeta formats standard categories with user-friendly labels', () => {
  assert.equal(formatCategoryLabel('fast-food'), 'Fast Food');
  assert.equal(formatCategoryLabel('kebab-store'), 'Kebab Store');
  assert.equal(formatCategoryLabel('abaya-shop'), 'Abaya Shop');
  assert.equal(formatCategoryLabel('sweets-shop'), 'Sweets Shop');
  assert.equal(formatCategoryLabel('snacks-shop'), 'Snacks Shop');
  assert.equal(formatCategoryLabel('meat-shop'), 'Meat Shop');
  assert.equal(formatCategoryLabel('bags-shop'), 'Bags Shop');
  assert.equal(formatCategoryLabel('cafe'), 'Café');
  assert.equal(formatCategoryLabel('restaurant'), 'Restaurant');
});

test('categoryMeta formats custom slugs accurately', () => {
  assert.equal(formatCategoryLabel('pet-grooming'), 'Pet Grooming');
  assert.equal(formatCategoryLabel('dental-clinic'), 'Dental Clinic');
  assert.equal(formatCategoryLabel('luxury_spa_resort'), 'Luxury Spa Resort');
  assert.equal(formatCategoryLabel(''), 'General');
  assert.equal(formatCategoryLabel(undefined), 'General');
});

test('categoryMeta assigns valid icon components for all 7 new categories', () => {
  const newCategories = [
    'fast-food',
    'kebab-store',
    'abaya-shop',
    'sweets-shop',
    'snacks-shop',
    'meat-shop',
    'bags-shop',
  ];

  for (const cat of newCategories) {
    const IconComponent = getCategoryIconComponent(cat);
    assert.ok(IconComponent, `Icon component for ${cat} should be defined`);
    const type = typeof IconComponent;
    assert.ok(type === 'object' || type === 'function');
  }
});

test('STANDARD_CATEGORIES and CATEGORY_OPTIONS contain all 7 new categories with exact slugs', () => {
  const expectedSlugs = [
    'fast-food',
    'kebab-store',
    'abaya-shop',
    'sweets-shop',
    'snacks-shop',
    'meat-shop',
    'bags-shop',
  ];

  for (const slug of expectedSlugs) {
    assert.ok(STANDARD_CATEGORIES.includes(slug), `STANDARD_CATEGORIES must include ${slug}`);
    const foundOption = CATEGORY_OPTIONS.find((opt) => opt.value === slug);
    assert.ok(foundOption, `CATEGORY_OPTIONS must include ${slug}`);
    assert.ok(foundOption.label.length > 0);
  }
});

test('No duplicate categories exist in STANDARD_CATEGORIES or CATEGORY_OPTIONS', () => {
  const stdSet = new Set(STANDARD_CATEGORIES);
  assert.equal(stdSet.size, STANDARD_CATEGORIES.length, 'No duplicate values in STANDARD_CATEGORIES');

  const optValues = CATEGORY_OPTIONS.map((o) => o.value);
  const optSet = new Set(optValues);
  assert.equal(optSet.size, optValues.length, 'No duplicate values in CATEGORY_OPTIONS');
});
