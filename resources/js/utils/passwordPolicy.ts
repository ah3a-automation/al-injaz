/**
 * Matches backend: Password::min(8)->mixedCase()->numbers() (Laravel Password rule).
 */
export function passwordMeetsRegistrationPolicy(password: string): boolean {
    return getPasswordPolicyFailures(password).length === 0;
}

/** Returns translation keys (supplier_portal) for each failed rule. */
export function getPasswordPolicyFailureKeys(password: string): string[] {
    return getPasswordPolicyFailures(password);
}

function getPasswordPolicyFailures(password: string): string[] {
    const failures: string[] = [];
    if (!password || password.length < 8) {
        failures.push('password_rule_min_length');
        return failures;
    }
    if (!/[a-z]/u.test(password)) {
        failures.push('password_rule_lowercase');
    }
    if (!/[A-Z]/u.test(password)) {
        failures.push('password_rule_uppercase');
    }
    if (!/\d/u.test(password)) {
        failures.push('password_rule_number');
    }
    return failures;
}
