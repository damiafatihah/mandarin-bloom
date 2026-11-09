import { expect, it } from 'vitest';
import { parseAuthHash } from './authLink';

it('reads the sign-in details from an email link', () => {
  expect(parseAuthHash('#access_token=abc&expires_in=3600&refresh_token=def&token_type=bearer&type=magiclink'))
    .toEqual({ accessToken: 'abc', refreshToken: 'def' });
});
it('reads an expired-link error', () => {
  expect(parseAuthHash('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'))
    .toEqual({ error: 'Email link is invalid or has expired' });
});
it('ignores ordinary addresses', () => {
  expect(parseAuthHash('')).toBeNull();
  expect(parseAuthHash('#section-2')).toBeNull();
});
