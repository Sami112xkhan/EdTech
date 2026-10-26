import assert from 'node:assert/strict';
import test from 'node:test';
import {
    calculateCouponPrice,
    formatRupees,
    getEffectiveCoursePrice,
    normalizeSalePrice,
    resolveCourseQuote,
} from '../src/utils/coursePricing.ts';

test('legacy zero sale price uses the regular Cloud Computing price', () => {
    const course = { title: 'Cloud Computing', price: 12000, salePrice: 0, isPublished: true };
    const quote = resolveCourseQuote('cloudcomputing', course, undefined, true);

    assert.deepEqual(quote, { courseId: 'cloudcomputing', title: 'Cloud Computing', amount: 12000 });
    assert.equal(formatRupees(quote!.amount), '₹12,000');
});

test('valid sale prices apply while missing or invalid sale prices fall back to list price', () => {
    assert.equal(getEffectiveCoursePrice(12000, 8000), 8000);
    assert.equal(getEffectiveCoursePrice(12000, null), 12000);
    assert.equal(getEffectiveCoursePrice(12000, 0), 12000);
    assert.equal(getEffectiveCoursePrice(12000, 12000), 12000);
    assert.equal(getEffectiveCoursePrice(12000, 13000), 12000);
});

test('draft courses cannot be quoted and full-stack offer quote stays consistent', () => {
    assert.equal(resolveCourseQuote('cloudcomputing', {
        title: 'Cloud Computing', price: 12000, salePrice: 0, isPublished: false,
    }, undefined, true), null);

    assert.deepEqual(resolveCourseQuote('fullstack', {
        title: 'Full Stack Web Dev', price: 15000, salePrice: 8000, isPublished: true,
    }, undefined, true), { courseId: 'fullstack', title: 'Full Stack Web Dev', amount: 10000 });
});

test('coupon amount calculation used by preview and order leaves at least one rupee payable', () => {
    assert.deepEqual(calculateCouponPrice(12000, 3000), { discountAmount: 3000, finalAmount: 9000 });
    assert.deepEqual(calculateCouponPrice(12000, 15000), { discountAmount: 11999, finalAmount: 1 });
});

test('blank or zero admin sale price is saved as no sale', () => {
    assert.equal(normalizeSalePrice(12000, ''), null);
    assert.equal(normalizeSalePrice(12000, 0), null);
    assert.equal(normalizeSalePrice(12000, 8000), 8000);
    assert.throws(() => normalizeSalePrice(12000, 12000), /less than the course price/);
});
