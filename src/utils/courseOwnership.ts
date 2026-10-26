import type { User } from '../types';

/**
 * Temporary trial state is separate from permanent ownership. A trial must not
 * hide courses already purchased by the same account.
 */
export function getPermanentlyOwnedCourseSlugs(
    user: Pick<User, 'purchasedCourses' | 'trialExpiresAt'> | null | undefined,
): Set<string> {
    return new Set(user?.purchasedCourses || []);
}
