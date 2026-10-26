export interface CoursePriceRecord {
    title: string;
    price: number;
    salePrice?: number | null;
    isPublished?: boolean;
}

export interface CourseQuote {
    courseId: string;
    title: string;
    amount: number;
}

/**
 * Treat missing, zero, invalid, or non-discounting sale prices as no sale.
 * Older course rows can contain sale_price = 0 when the admin left the field
 * blank; zero is not a valid Razorpay amount and must never disable checkout.
 */
export function getEffectiveCoursePrice(price: number, salePrice?: number | null): number {
    const regularPrice = Number(price);
    if (!Number.isSafeInteger(regularPrice) || regularPrice < 1) return 0;

    const sale = Number(salePrice);
    return Number.isSafeInteger(sale) && sale > 0 && sale < regularPrice
        ? sale
        : regularPrice;
}

/** Resolve a published catalog course into the same quote used by checkout. */
export function resolveCourseQuote(
    courseId: string,
    course: CoursePriceRecord | undefined,
    fallback: CoursePriceRecord | undefined,
    isOfferActive: boolean,
): CourseQuote | null {
    if (course && course.isPublished === false) return null;
    const selected = course || fallback;
    if (!selected) return null;

    const catalogPrice = getEffectiveCoursePrice(selected.price, selected.salePrice);
    const amount = courseId === 'fullstack' && isOfferActive ? 10000 : catalogPrice;
    if (!Number.isSafeInteger(amount) || amount < 1) return null;

    return { courseId, title: selected.title, amount };
}

/** A one-use fixed-amount coupon must leave at least ₹1 payable. */
export function calculateCouponPrice(baseAmount: number, amountOff: number) {
    if (!Number.isSafeInteger(baseAmount) || baseAmount < 1) {
        throw new Error('Course price must be a positive whole amount');
    }
    if (!Number.isSafeInteger(amountOff) || amountOff < 1) {
        throw new Error('Coupon discount must be a positive whole amount');
    }

    const discountAmount = Math.min(amountOff, Math.max(0, baseAmount - 1));
    return { discountAmount, finalAmount: baseAmount - discountAmount };
}

/** Store blank/zero sale prices as NULL and reject invalid sale prices. */
export function normalizeSalePrice(priceValue: unknown, salePriceValue: unknown): number | null {
    const price = Number(priceValue);
    if (!Number.isSafeInteger(price) || price < 1) {
        throw new Error('Course price must be a positive whole amount');
    }

    if (salePriceValue == null || String(salePriceValue).trim() === '' || Number(salePriceValue) === 0) {
        return null;
    }

    const salePrice = Number(salePriceValue);
    if (!Number.isSafeInteger(salePrice) || salePrice < 1 || salePrice >= price) {
        throw new Error('Sale price must be a whole amount greater than ₹0 and less than the course price');
    }
    return salePrice;
}

export function formatRupees(amount: number): string {
    return `₹${Number(amount).toLocaleString('en-IN')}`;
}
