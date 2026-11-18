/**
 * QuoteKaro Legal & Compliance Service
 * Comprehensive Terms of Service & Privacy Policy conforming to:
 * - Information Technology Act, 2000 & IT Rules 2011
 * - Digital Personal Data Protection (DPDP) Act, 2023
 * - Consumer Protection (E-Commerce) Rules, 2020 (India)
 */

const LEGAL_DOCUMENTS = {
  privacyPolicy: {
    title: 'Privacy Policy',
    effectiveDate: '2026-01-01',
    lastUpdated: '2026-11-18',
    entity: 'QuoteKaro Marketplace Technologies Pvt. Ltd.',
    operatingJurisdiction: 'Pune & PCMC, Maharashtra, India',
    sections: [
      {
        heading: '1. Introduction & Overview',
        content: 'QuoteKaro Marketplace Technologies Pvt. Ltd. ("QuoteKaro", "we", "our", or "us") operates a hyperlocal marketplace connecting residential homeowners and businesses in Pune and PCMC with vetted home maintenance service providers. This Privacy Policy details our commitment to protecting your personal data in accordance with the Digital Personal Data Protection (DPDP) Act, 2023 and the Information Technology Act, 2000.'
      },
      {
        heading: '2. Personal Data We Collect',
        content: 'We collect information that is strictly necessary to deliver, safeguard, and optimize home services:',
        subsections: [
          {
            title: 'a. Account & Identity Information',
            details: 'Name, verified mobile number (+91), email address, and optional profile photo.'
          },
          {
            title: 'b. Geolocation & Service Addresses',
            details: 'Saved service addresses (flat/house number, society/building, area, pincode), geographic coordinates, and service radius to calculate proximity to local technicians.'
          },
          {
            title: 'c. Appliance & Maintenance Records',
            details: 'Appliance types (AC, Water Purifier, Washing Machine, Geyser, Refrigerator, etc.), approximate purchase dates, daily usage frequency, and maintenance intervals utilized by the QuoteKaro AI Preventive Maintenance Engine.'
          },
          {
            title: 'd. Service Records & Proof-of-Work',
            details: 'Booking dates, service packages, before-and-after photographic evidence captured during work execution, and dispute logs.'
          },
          {
            title: 'e. Provider KYC Documentation',
            details: 'Government identity proof (Aadhaar, PAN card, or Trade License) submitted by service technicians for mandatory background verification before activation.'
          },
          {
            title: 'f. Financial & Transaction Data',
            details: 'Transaction identifiers, Razorpay payment reference IDs, and wallet ledger balances. QuoteKaro does NOT store debit/credit card numbers or CVV codes; all card transactions are securely tokenized and handled directly by RBI-licensed payment aggregators.'
          }
        ]
      },
      {
        heading: '3. How We Use Your Data',
        content: 'We process personal information exclusively for the following lawful purposes:',
        points: [
          'Matching customer requests with qualified, available nearby technicians.',
          'Generating automated AI preventive maintenance schedules and filter replacement reminders.',
          'Facilitating in-app status updates, booking dispatch, and customer support chatbot interactions.',
          'KYC document verification to ensure resident safety and maintain community trust.',
          'Admin arbitration and dispute resolution with photographic proof-of-work.',
          'Detecting fraud, fake quotes, and platform policy violations.'
        ]
      },
      {
        heading: '4. Data Sharing & Third-Party Processors',
        content: 'We do not sell, rent, or trade your personal information. Data is shared strictly on a need-to-know basis with:',
        points: [
          'Assigned Service Providers: Only your first name, service address, and masked contact number are shared upon booking confirmation.',
          'Payment Partners: Razorpay Technologies for secure transaction settlement and refunds.',
          'Cloud Infrastructure: AWS and Neon PostgreSQL (encrypted serverless storage with TLS 1.3).',
          'Legal & Regulatory Authorities: When required by applicable Indian law, court order, or lawful government directive.'
        ]
      },
      {
        heading: '5. Data Security & Storage Standards',
        content: 'We employ multi-layered technical safeguards including 256-bit TLS/SSL encryption for data in transit, encrypted database storage for KYC documents, salted cryptographic hashing for passwords, and strict role-based access control (RBAC).'
      },
      {
        heading: '6. Your Rights Under DPDP Act 2023',
        content: 'You retain full control over your personal data on QuoteKaro:',
        points: [
          'Right to Access & Review: View your profile details, past bookings, and appliance logs anytime.',
          'Right to Correction: Update your contact details, service addresses, and appliance usage patterns.',
          'Right to Erasure / Account Deactivation: Request complete account deactivation via the app settings or by writing to our Grievance Officer.'
        ]
      },
      {
        heading: '7. Grievance Redressal Officer',
        content: 'In compliance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, the contact details of our Grievance Officer are:\n\nName: Grievance Redressal Officer\nQuoteKaro Marketplace Technologies Pvt. Ltd.\nOffice: Baner Road, Pune, Maharashtra 411045, India\nEmail: grievance@quotekaro.com\nResponse Timeline: All consumer grievances are acknowledged within 24 hours and redressed within 15 working days.'
      }
    ]
  },
  termsOfService: {
    title: 'Terms of Service',
    effectiveDate: '2026-01-01',
    lastUpdated: '2026-11-18',
    sections: [
      {
        heading: '1. Platform Overview',
        content: 'QuoteKaro is an electronic marketplace platform that enables consumers to discover, compare quotes, and book independent home maintenance professionals in Pune and PCMC. QuoteKaro acts as an intermediary connecting customers with independent service providers.'
      },
      {
        heading: '2. Eligibility & Account Creation',
        content: 'Users must be at least 18 years of age. You agree to provide accurate, current, and complete mobile and email details during registration and promptly update them if they change.'
      },
      {
        heading: '3. Booking, Rescheduling & Cancellation Policy',
        content: 'Bookings may be cancelled or rescheduled free of charge up to two (2) hours prior to the scheduled time slot. Cancellations within two hours of the slot may incur a nominal technician conveyance charge of ₹99. If a provider fails to arrive within 30 minutes of the slot, the customer receives an automatic 100% refund.'
      },
      {
        heading: '4. Service Warranty & Guarantee',
        content: 'Standard catalog repairs booked through QuoteKaro include a 30-day service warranty covering the specific repair performed. Care Subscription members receive extended 60-day to 90-day warranty coverage.'
      },
      {
        heading: '5. Provider KYC & Platform Safety Standards',
        content: 'All service providers must undergo identity verification (Aadhaar/PAN/Trade License) and admin approval before receiving bookings. Providers agree to adhere to platform code of conduct, maintain tool cleanliness, and submit proof-of-work photographs upon job completion.'
      },
      {
        heading: '6. Dispute Resolution & Arbitration',
        content: 'In the event of quality dissatisfaction, property damage, or pricing disputes, either party may raise a dispute through the platform. The QuoteKaro Admin Dispute Tribunal reviews before-and-after photographs, chat transcripts, and provider GPS logs to issue final binding resolutions, including full or partial wallet refunds within 48 hours.'
      },
      {
        heading: '7. Governing Law & Jurisdiction',
        content: 'These Terms of Service shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or related to these terms shall be subject to the exclusive jurisdiction of the civil courts in Pune, Maharashtra, India.'
      }
    ]
  }
};

async function getPrivacyPolicy() {
  return LEGAL_DOCUMENTS.privacyPolicy;
}

async function getTermsOfService() {
  return LEGAL_DOCUMENTS.termsOfService;
}

module.exports = {
  getPrivacyPolicy,
  getTermsOfService
};
