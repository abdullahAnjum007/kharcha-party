export type VoiceLog = {
  id: string;
  transcript: string;
  time: string;
  status: 'Accepted' | 'Pending';
};

export type ExpenseRow = {
  id: string;
  person: string;
  category: string;
  amount: number;
  paidBy: string;
  emoji: string;
};

export const voiceLogs: VoiceLog[] = [
  { id: '1', transcript: 'Ali ne dinner ke 8200 diye', time: 'Aaj, 9:42 PM', status: 'Accepted' },
  { id: '2', transcript: 'Fuel ke 4500, mera', time: 'Aaj, 4:15 PM', status: 'Accepted' },
  { id: '3', transcript: 'Hotel 12000 sab ke liye', time: 'Kal, 11:08 PM', status: 'Pending' },
];

export const expenses: ExpenseRow[] = [
  { id: '1', person: 'Ali', category: 'Food', amount: 8200, paidBy: 'Ali', emoji: '🍕' },
  { id: '2', person: 'You', category: 'Transport', amount: 4500, paidBy: 'You', emoji: '⛽' },
  { id: '3', person: 'Sara', category: 'Hotel', amount: 12000, paidBy: 'Sara', emoji: '🏨' },
  { id: '4', person: 'Hamza', category: 'Extra', amount: 2750, paidBy: 'Hamza', emoji: '🎉' },
];

export const formatRupees = (amount: number) => `Rs. ${amount.toLocaleString('en-PK')}`;
