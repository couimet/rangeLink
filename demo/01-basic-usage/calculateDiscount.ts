/**
 * Discount calculation utilities for e-commerce
 */

export interface DiscountRule {
  type: 'percentage' | 'fixed';
  value: number;
  minPurchase?: number;
  maxDiscount?: number;
}

export interface CartItem {
  id: string;
  price: number;
  quantity: number;
}

/**
 * Calculate the discount amount for a given subtotal
 */
export const calculateDiscount = (
  subtotal: number,
  rule: DiscountRule
): number => {
  // Check minimum purchase requirement
  if (rule.minPurchase && subtotal < rule.minPurchase) {
    return 0;
  }

  let discount = 0;

  if (rule.type === 'percentage') {
    discount = subtotal * (rule.value / 100);
  } else {
    discount = rule.value;
  }

  // Apply maximum discount cap
  if (rule.maxDiscount && discount > rule.maxDiscount) {
    discount = rule.maxDiscount;
  }

  return discount;
};

/**
 * Calculate cart subtotal from items
 */
export const calculateSubtotal = (items: CartItem[]): number => {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
};
