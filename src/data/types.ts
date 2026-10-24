export const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
export const REGIONS = ['NORTH', 'SOUTH', 'EAST', 'WEST', 'CENTRAL', 'NORTHEAST'] as const;
export const CHANNELS = ['web', 'app', 'phone', 'store'] as const;
export const PAYMENT_METHODS = ['upi', 'card', 'netbanking', 'cod', 'wallet'] as const;

export type Status = (typeof STATUSES)[number];   // 'pending' | 'processing' | ...
export type Region = (typeof REGIONS)[number];
export type Channel = (typeof CHANNELS)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type Order = {
  id: string;
  customer: string;
  customerEmail: string;
  status: Status;
  amount: number;            // always rupees
  currency: string;          // trimmed
  createdAt: number;         // timestamp in ms
  updatedAt: number | null;  // null = missing
  region: Region;
  channel: Channel;
  priority: 1 | 2 | 3 | null;
  paymentMethod: PaymentMethod;
  itemCount: number;
  notes: string;             // '' when null/empty
};
