import React, { useState } from 'react';
import { calculateDiscount, calculateSubtotal, CartItem, DiscountRule } from './calculateDiscount';

interface ShoppingCartProps {
  items: CartItem[];
  discountRule?: DiscountRule;
}

export const ShoppingCart: React.FC<ShoppingCartProps> = ({ items, discountRule }) => {
  const [showDiscount, setShowDiscount] = useState(false);

  const subtotal = calculateSubtotal(items);
  const discount = discountRule ? calculateDiscount(subtotal, discountRule) : 0;
  const total = subtotal - discount;

  return (
    <div className="shopping-cart">
      <h2>Shopping Cart</h2>

      <ul className="cart-items">
        {items.map((item) => (
          <li key={item.id}>
            <span>{item.id}</span>
            <span>
              ${item.price.toFixed(2)} × {item.quantity}
            </span>
            <span>${(item.price * item.quantity).toFixed(2)}</span>
          </li>
        ))}
      </ul>

      <div className="cart-summary">
        <div className="subtotal">Subtotal: ${subtotal.toFixed(2)}</div>

        {discountRule && discount > 0 && (
          <div className="discount">
            Discount: -${discount.toFixed(2)}
            <button onClick={() => setShowDiscount(!showDiscount)}>
              {showDiscount ? 'Hide' : 'Show'} Details
            </button>
          </div>
        )}

        <div className="total">Total: ${total.toFixed(2)}</div>
      </div>
    </div>
  );
};
