
export const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
            resolve(true);
        };
        script.onerror = () => {
            resolve(false);
        };
        document.body.appendChild(script);
    });
};

export const initializePayment = async (
    amount: number,
    user: { name: string; email: string; contact?: string },
    onSuccess: (response: any) => void,
    onFailure?: (error: any) => void
) => {
    const res = await loadRazorpayScript();

    if (!res) {
        alert('Razorpay SDK failed to load. Are you online?');
        return;
    }

    const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: amount * 100, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
        currency: "INR",
        name: "DevMastery Academy",
        description: "Full Stack Mastery Course",
        image: "https://devmastery.space/logo.png", // Ensure this path is correct or use a public URL
        prefill: {
            name: user.name,
            email: user.email,
            contact: user.contact || ""
        },
        theme: {
            color: "#3b82f6"
        },
        handler: function (response: any) {
            // alert(response.razorpay_payment_id);
            // alert(response.razorpay_order_id);
            // alert(response.razorpay_signature)
            onSuccess(response);
        }
    };

    const paymentObject = new (window as any).Razorpay(options);
    paymentObject.on('payment.failed', function (response: any) {
        // alert(response.error.code);
        // alert(response.error.description);
        // alert(response.error.source);
        // alert(response.error.step);
        // alert(response.error.reason);
        // alert(response.error.metadata.order_id);
        // alert(response.error.metadata.payment_id);
        if (onFailure) onFailure(response.error);
    });
    paymentObject.open();
};
