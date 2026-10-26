import assert from 'node:assert/strict';
import test from 'node:test';
import { getPermanentlyOwnedCourseSlugs } from '../src/utils/courseOwnership.ts';

test('an active trial does not hide a permanently purchased course', () => {
    const user = {
        purchasedCourses: ['cyber'],
        trialExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    };

    assert.deepEqual(getPermanentlyOwnedCourseSlugs(user), new Set(['cyber']));
});

test('trial access alone does not count as a permanent purchase', () => {
    const user = {
        purchasedCourses: [],
        trialExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    };

    assert.deepEqual(getPermanentlyOwnedCourseSlugs(user), new Set());
});
