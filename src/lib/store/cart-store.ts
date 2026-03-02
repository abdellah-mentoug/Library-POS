import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

export interface CartItem {
  productId: string;
  name: string;
  barcode: string | null;
  unitPrice: number;
  costPrice: number;
  taxRate: number;
  quantity: number;
  discountAmount: number;
  lineTotal: number;
  taxAmount: number;
}

export interface CartState {
  items: CartItem[];
  customerId: string | null;
  customerName: string | null;
  discountType: "fixed" | "percentage" | null;
  discountValue: number;
  notes: string;

  addItem: (product: Omit<CartItem, "quantity" | "discountAmount" | "lineTotal" | "taxAmount">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setItemDiscount: (productId: string, amount: number) => void;
  setCustomer: (id: string | null, name: string | null) => void;
  setCartDiscount: (type: "fixed" | "percentage" | null, value: number) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;
}

function calculateLineItem(
  unitPrice: number,
  quantity: number,
  taxRate: number,
  discountAmount: number
): { lineTotal: number; taxAmount: number } {
  const subtotal = unitPrice * quantity - discountAmount;
  const taxAmount = subtotal * (taxRate / 100);
  const lineTotal = subtotal + taxAmount;
  return {
    lineTotal: Math.round(lineTotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
  };
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  customerId: null,
  customerName: null,
  discountType: null,
  discountValue: 0,
  notes: "",

  addItem: (product) =>
    set((state) => {
      const existing = state.items.find(
        (item) => item.productId === product.productId
      );
      if (existing) {
        return {
          items: state.items.map((item) =>
            item.productId === product.productId
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                  ...calculateLineItem(
                    item.unitPrice,
                    item.quantity + 1,
                    item.taxRate,
                    item.discountAmount
                  ),
                }
              : item
          ),
        };
      }
      const calculated = calculateLineItem(
        product.unitPrice,
        1,
        product.taxRate,
        0
      );
      return {
        items: [
          ...state.items,
          { ...product, quantity: 1, discountAmount: 0, ...calculated },
        ],
      };
    }),

  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((item) => item.productId !== productId),
    })),

  updateQuantity: (productId, quantity) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity,
              ...calculateLineItem(
                item.unitPrice,
                quantity,
                item.taxRate,
                item.discountAmount
              ),
            }
          : item
      ),
    })),

  setItemDiscount: (productId, amount) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.productId === productId
          ? {
              ...item,
              discountAmount: amount,
              ...calculateLineItem(
                item.unitPrice,
                item.quantity,
                item.taxRate,
                amount
              ),
            }
          : item
      ),
    })),

  setCustomer: (id, name) =>
    set({ customerId: id, customerName: name }),

  setCartDiscount: (type, value) =>
    set({ discountType: type, discountValue: value }),

  setNotes: (notes) => set({ notes }),

  clearCart: () =>
    set({
      items: [],
      customerId: null,
      customerName: null,
      discountType: null,
      discountValue: 0,
      notes: "",
    }),
}));

export function useCartTotals() {
  return useCartStore(
    useShallow((state) => {
      const itemSubtotal = state.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity - item.discountAmount,
        0
      );
      const itemTaxTotal = state.items.reduce(
        (sum, item) => sum + item.taxAmount,
        0
      );

      let cartDiscount = 0;
      if (state.discountType === "fixed") {
        cartDiscount = state.discountValue;
      } else if (state.discountType === "percentage") {
        cartDiscount = itemSubtotal * (state.discountValue / 100);
      }
      cartDiscount = Math.round(cartDiscount * 100) / 100;

      const subtotal = Math.round(itemSubtotal * 100) / 100;
      const taxTotal = Math.round(itemTaxTotal * 100) / 100;
      const total = Math.round((subtotal + taxTotal - cartDiscount) * 100) / 100;

      return {
        subtotal,
        taxTotal,
        cartDiscount,
        total,
        itemCount: state.items.reduce((sum, item) => sum + item.quantity, 0),
      };
    })
  );
}
