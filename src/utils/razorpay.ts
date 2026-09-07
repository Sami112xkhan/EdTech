
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
    onFailure?: (error: any) => void,
    description?: string
) => {
    const res = await loadRazorpayScript();

    if (!res) {
        alert('Razorpay SDK failed to load. Are you online?');
        return;
    }

    // Ensure amount is a valid positive number (in INR)
    const validAmount = (typeof amount === 'number' && amount > 0 && !isNaN(amount)) ? amount : 0;

    const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: validAmount * 100, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
        currency: "INR",
        name: "DevMastery Academy",
        description: description || "DevMastery Course",
        image: "https://devmastery.space/logo.png",
        prefill: {
            name: user.name,
            email: user.email,
            contact: user.contact || ""
        },
        theme: {
            color: "#3b82f6"
        },
        handler: function (response: any) {
            onSuccess(response);
        }
    };

    const paymentObject = new (window as any).Razorpay(options);
    paymentObject.on('payment.failed', function (response: any) {
        if (onFailure) onFailure(response.error);
    });
    paymentObject.open();
};
