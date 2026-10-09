import React, { createContext, useContext, useState, useEffect } from 'react';
import { CatalogService, DoorblyCoupon } from '../types/supabase';
import { calculateCustomerPriceBreakdown } from '../services/bookingService';

export interface CartItem {
  service: CatalogService;
  quantity: number;
  notes?: string;
}

interface CartContextType {
  items: CartItem[];
  totalItemsCount: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  finalAmount: number;
  appliedCoupon: DoorblyCoupon | null;
  addToCart: (service: CatalogService, notes?: string) => void;
  removeFromCart: (serviceId: string) => void;
  updateQuantity: (serviceId: string, quantity: number) => void;
  clearCart: () => void;
  applyCoupon: (coupon: DoorblyCoupon | null, discount: number) => void;
  isInCart: (serviceId: string) => boolean;
}

const STORAGE_KEY_CART = 'doorbly_customer_cart_v1';

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_CART);
        return saved ? JSON.parse(saved) : [];
      } catch {}
    }
    return [];
  });

  const [appliedCoupon, setAppliedCoupon] = useState<DoorblyCoupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(items));
      } catch {}
    }
  }, [items]);

  const addToCart = (service: CatalogService, notes?: string) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.service.id === service.id);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + 1,
          notes: notes || updated[existingIdx].notes
        };
        return updated;
      }
      return [...prev, { service, quantity: 1, notes }];
    });
  };

  const removeFromCart = (serviceId: string) => {
    setItems((prev) => prev.filter((i) => i.service.id !== serviceId));
  };

  const updateQuantity = (serviceId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(serviceId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.service.id === serviceId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
    setCouponDiscount(0);
  };

  const applyCoupon = (coupon: DoorblyCoupon | null, discount: number) => {
    setAppliedCoupon(coupon);
    setCouponDiscount(discount);
  };

  const isInCart = (serviceId: string) => items.some((i) => i.service.id === serviceId);

  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const rawSubtotal = items.reduce(
    (sum, item) => sum + Number(item.service.price || 0) * item.quantity,
    0
  );

  const breakdown = calculateCustomerPriceBreakdown(rawSubtotal, couponDiscount);

  return (
    <CartContext.Provider
      value={{
        items,
        totalItemsCount,
        subtotal: breakdown.servicePrice,
        discountAmount: breakdown.discountAmount,
        taxAmount: breakdown.taxAmount,
        finalAmount: breakdown.finalPayableAmount,
        appliedCoupon,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        applyCoupon,
        isInCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
};
