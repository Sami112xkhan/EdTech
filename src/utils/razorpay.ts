export interface RazorpayOrderDetails {
    orderId: string;
    keyId: string;
    amount: number;
    currency: string;
    title?: string;
}

export const loadRazorpayScript = async (): Promise<boolean> => {
    if ((window as any).Razorpay) return true;
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-razorpay-checkout]');
    if (existingScript) {
        return new Promise((resolve) => {
            existingScript.addEventListener('load', () => resolve(true), { once: true });
            existingScript.addEventListener('error', () => resolve(false), { once: true });
        });
    }

    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.dataset.razorpayCheckout = 'true';
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

export const initializePayment = async (
    order: RazorpayOrderDetails,
    user: { name: string; email: string; contact?: string },
    onSuccess: (response: any) => void,
    onFailure?: (error: any) => void,
    onDismiss?: () => void,
): Promise<void> => {
    const loaded = await loadRazorpayScript();
    if (!loaded || !(window as any).Razorpay) throw new Error('Razorpay Checkout could not be loaded. Check your connection and try again.');

    const options = {
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'DevMastery Academy',
        description: order.title || 'DevMastery Course',
        image: 'https://devmastery.space/logo.png',
        prefill: {
            name: user.name,
            email: user.email,
            contact: user.contact || '',
        },
        theme: { color: '#3b82f6' },
        handler: onSuccess,
        modal: { ondismiss: onDismiss },
    };

    const paymentObject = new (window as any).Razorpay(options);
    paymentObject.on('payment.failed', (response: any) => onFailure?.(response.error));
    paymentObject.open();
};
