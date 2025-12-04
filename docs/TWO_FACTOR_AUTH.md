# Two-Factor Authentication (2FA) System

BridleStay supports Two-Factor Authentication using TOTP (Time-based One-Time Password), which works with authenticator apps like Google Authenticator, Authy, Microsoft Authenticator, and others.

## How It Works

### For Users

1. **Enabling 2FA**
   - Go to Account Settings (`/account`)
   - Find the "Two-Factor Authentication" section
   - Click "Enable 2FA"
   - Scan the QR code with your authenticator app (or manually enter the secret)
   - Enter the 6-digit verification code from your app
   - 2FA is now active on your account

2. **Signing In with 2FA**
   - Enter your email and password as usual
   - After password verification, you'll be prompted for your 2FA code
   - Enter the 6-digit code from your authenticator app
   - You're now signed in

3. **Disabling 2FA**
   - Go to Account Settings (`/account`)
   - Click "Disable 2FA"
   - Confirm the action
   - 2FA is now disabled (note: your account will be less secure)

## Technical Implementation

### API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/mfa/enroll` | POST | Start MFA enrollment, returns QR code and secret |
| `/api/auth/mfa/verify` | POST | Verify TOTP code to complete enrollment |
| `/api/auth/mfa/unenroll` | POST | Remove MFA factor from account |
| `/api/auth/mfa/factors` | GET | List user's active MFA factors |
| `/api/auth/mfa/challenge` | POST | Create MFA challenge for login verification |
| `/api/auth/mfa/challenge` | PUT | Verify challenge with TOTP code |

### Components

- `components/account/two-factor-settings.tsx` - 2FA management UI for account page
- Updated `app/auth/sign-in/page.tsx` - Handles 2FA verification during login

### Supabase MFA

This implementation uses Supabase's built-in MFA support:

- **Factor Type**: TOTP (Time-based One-Time Password)
- **Assurance Level**: AAL2 (Authenticator Assurance Level 2)
- **Verification**: 6-digit codes that refresh every 30 seconds

## Security Considerations

1. **QR Code Security**
   - QR codes are only shown once during enrollment
   - Users should not screenshot or share their QR codes
   - The secret key should be stored securely if entered manually

2. **Recovery**
   - If a user loses access to their authenticator app, they will need to contact support
   - Consider implementing backup codes in a future update

3. **Session Security**
   - After MFA verification, the session is upgraded to AAL2
   - Sensitive operations can require AAL2 verification

## Future Enhancements

- [ ] Backup codes for account recovery
- [ ] SMS-based 2FA as an alternative
- [ ] Security keys (WebAuthn/FIDO2)
- [ ] Remember trusted devices
- [ ] Admin enforcement of 2FA for certain user roles

