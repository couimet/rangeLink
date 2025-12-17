/**
 * Payment Handler - Version 1 (Basic error handling)
 */
interface PaymentRequest {
  amount: number;
  currency: string;
  cardToken: string;
  customerId: string;
}

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export const processPayment = async (request: PaymentRequest): Promise<PaymentResult> => {
  try {
    const response = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const data = await response.json();
    return { success: true, transactionId: data.id };
  } catch (error) {
    return { success: false, error: 'Payment failed' };
  }
};

export const refundPayment = async (transactionId: string): Promise<PaymentResult> => {
  try {
    const response = await fetch(`/api/payments/${transactionId}/refund`, {
      method: 'POST',
    });
    const data = await response.json();
    return { success: true, transactionId: data.id };
  } catch (error) {
    return { success: false, error: 'Refund failed' };
  }
};
