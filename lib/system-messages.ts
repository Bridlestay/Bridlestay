/**
 * System message templates and utilities
 */

export interface SystemMessageData {
  recipientId: string;
  subject: string;
  message: string;
  messageType: 'system' | 'admin_action';
  systemPriority?: boolean;
}

/**
 * Welcome message for new users
 */
export function getWelcomeMessage(userId: string, userName: string): SystemMessageData {
  return {
    recipientId: userId,
    subject: 'Welcome to padoq! 🐴',
    message: `Hello ${userName}!

Welcome to padoq, the UK's complete horse app - stays, routes, and community!

We're thrilled to have you join our community of horse lovers. Whether you're looking for the perfect countryside escape with your horses or hosting riders at your property, you're in the right place.

**Getting Started:**
• Complete your profile to help others get to know you
• Browse our verified properties across Worcestershire, Herefordshire, and Gloucestershire
• Hosts: List your property and start welcoming guests
• Guests: Make your first booking and start exploring!

**Safety & Community:**
• All payments are securely processed through Stripe
• Our platform monitors messages for safety
• Read our Terms of Service and Community Guidelines

If you have any questions, feel free to reach out to our support team.

Happy riding! 🏇

The padoq Team`,
    messageType: 'system',
    systemPriority: true,
  };
}

/**
 * Admin ban message
 */
export function getBanMessage(
  userId: string,
  userName: string,
  reason: string,
  adminName: string
): SystemMessageData {
  return {
    recipientId: userId,
    subject: 'Account Suspended',
    message: `Dear ${userName},

Your padoq account has been suspended.

**Action Taken:** Account Ban
**Reason:** ${reason}
**Date:** ${new Date().toLocaleDateString()}
**Reviewed By:** ${adminName}

**What This Means:**
• You can no longer access your account
• All active bookings have been cancelled
• Any pending payouts have been frozen

**Next Steps:**
If you believe this action was taken in error, please contact our support team at support@padoq.com with your account details.

padoq Admin Team`,
    messageType: 'admin_action',
    systemPriority: true,
  };
}

/**
 * Admin softban message
 */
export function getSoftbanMessage(
  userId: string,
  userName: string,
  reason: string,
  adminName: string,
  duration?: string
): SystemMessageData {
  return {
    recipientId: userId,
    subject: 'Account Temporarily Restricted',
    message: `Dear ${userName},

Your padoq account has been temporarily restricted.

**Action Taken:** Temporary Restriction (Soft Ban)
**Reason:** ${reason}
**Duration:** ${duration || 'Until further review'}
**Date:** ${new Date().toLocaleDateString()}
**Reviewed By:** ${adminName}

**What This Means:**
• You have limited access to your account
• You cannot make new bookings or list properties
• Existing bookings are not affected
• You can still message hosts/guests

**Next Steps:**
Please review our Community Guidelines and Terms of Service. If you have questions about this restriction, contact support@padoq.com.

padoq Admin Team`,
    messageType: 'admin_action',
    systemPriority: true,
  };
}

/**
 * Property removal message
 */
export function getPropertyRemovalMessage(
  userId: string,
  userName: string,
  propertyName: string,
  reason: string,
  adminName: string
): SystemMessageData {
  return {
    recipientId: userId,
    subject: `Property Removed: ${propertyName}`,
    message: `Dear ${userName},

Your property listing "${propertyName}" has been removed from padoq.

**Action Taken:** Property Removal
**Reason:** ${reason}
**Date:** ${new Date().toLocaleDateString()}
**Reviewed By:** ${adminName}

**What This Means:**
• The property is no longer visible to guests
• All pending bookings for this property have been cancelled
• You will not receive new booking requests

**Next Steps:**
If you believe this action was taken in error or if you've addressed the issues, please contact support@padoq.com to discuss reinstatement.

padoq Admin Team`,
    messageType: 'admin_action',
    systemPriority: true,
  };
}

/**
 * Account verification approved message
 */
export function getVerificationApprovedMessage(
  userId: string,
  userName: string
): SystemMessageData {
  return {
    recipientId: userId,
    subject: 'Payment Setup Complete ✅',
    message: `Congratulations ${userName}!

Your payment details have been verified through Stripe!

**What's Available:**
• You can now make bookings and payments
• You can receive payouts (if you're a host)
• You have full access to all platform features

Thank you for setting up your payment details. We're excited to have you as an active member of our community!

Happy riding! 🏇

padoq Team`,
    messageType: 'system',
    systemPriority: true,
  };
}

/**
 * Warning message
 */
export function getWarningMessage(
  userId: string,
  userName: string,
  reason: string,
  adminName: string
): SystemMessageData {
  return {
    recipientId: userId,
    subject: 'Important: Community Guidelines Warning',
    message: `Dear ${userName},

This is a warning regarding your activity on padoq.

**Warning Reason:** ${reason}
**Date:** ${new Date().toLocaleDateString()}
**Reviewed By:** ${adminName}

**What This Means:**
• This is a formal warning
• Repeated violations may result in account restrictions or suspension
• Please review our Community Guidelines

**Next Steps:**
Please ensure your future interactions on padoq comply with our Terms of Service and Community Guidelines. If you have questions, contact support@padoq.com.

padoq Admin Team`,
    messageType: 'admin_action',
    systemPriority: true,
  };
}



