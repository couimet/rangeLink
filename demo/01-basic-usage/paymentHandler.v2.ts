/**
 * Payment Handler - Version 2 (Robust error handling)
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
  errorCode?: string;
}

export const processPayment = async (request: PaymentRequest): Promise<PaymentResult> => {
  try {
    const response = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        errorCode: errorData.code || `HTTP_${response.status}`,
      };
    }

    const data = await response.json();
    return { success: true, transactionId: data.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Network error: ${message}`,
      errorCode: 'NETWORK_ERROR',
    };
  }
};

export const refundPayment = async (transactionId: string): Promise<PaymentResult> => {
  try {
    const response = await fetch(`/api/payments/${transactionId}/refund`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `Refund failed: HTTP ${response.status}`,
        errorCode: errorData.code || `HTTP_${response.status}`,
      };
    }

    const data = await response.json();
    return { success: true, transactionId: data.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Network error during refund: ${message}`,
      errorCode: 'NETWORK_ERROR',
    };
  }
};
