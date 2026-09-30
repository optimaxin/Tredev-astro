// Terms of Service / Privacy Policy / Safety — the three real legal pages
// (Footer.tsx used to route all of these to 'about' as a placeholder; see
// LegalPage.tsx for the renderer). This is a genuine first draft grounded in
// what this app actually does (Firebase phone/Google auth, chat/voice/video
// consultations, Cashfree payments, call recordings) — not lorem ipsum — but
// it hasn't been reviewed by a lawyer, so treat it as a starting point to
// have checked before this is the version real users sign up under.

export type LegalDocId = 'terms' | 'privacy' | 'safety';

export interface LegalSection {
  heading: string;
  body: string;
  bullets?: string[];
}

export interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

export const LEGAL_CONTENT: Record<LegalDocId, LegalDoc> = {
  terms: {
    title: 'Terms of Service',
    updated: '28 September 2026',
    intro: 'These Terms govern your use of TredevaAstro — our website, app, and the astrologer and pandit consultations, reports, and pooja bookings offered on it. By creating an account, you agree to them.',
    sections: [
      {
        heading: 'What we offer',
        body: 'TredevaAstro provides Vedic astrology tools (Kundli generation, Panchang, matching, calculators), paid consultations with independent astrologers over chat, voice, or video, astrology reports, courses, and pooja-related services (recorded videos, group poojas, 1:1 pandit bookings).',
        bullets: [
          'Astrology, Kundli readings, and pooja guidance are offered for entertainment and spiritual guidance only.',
          'Nothing on this platform is medical, legal, financial, or psychiatric advice — for those, please consult a licensed professional.',
        ],
      },
      {
        heading: 'Your account',
        body: 'You sign up with a phone number (verified by OTP) or a Google account. You are responsible for keeping access to that phone number or Google account secure — anyone who can complete your OTP or Google sign-in can act as you on this platform. Accounts are for individual personal use and are not transferable.',
      },
      {
        heading: 'Payments and refunds',
        body: 'Consultations, reports, courses, and pooja bookings are paid in advance through our payment gateway. Chat/voice/video consultation time is billed per minute at the astrologer\'s listed rate; a session ending early due to a technical failure on our side is eligible for a prorated refund on request. Digital reports and completed consultations are not refundable once delivered.',
      },
      {
        heading: 'Conduct',
        body: 'Consultations are between you and the astrologer or pandit — treat them, and they you, with respect. We may suspend or terminate an account for harassment, abusive language, sharing of illegal content, attempting to pay or solicit an astrologer outside the platform, or impersonating another person.',
      },
      {
        heading: 'Content you submit',
        body: 'Birth details, chat messages, and any images/audio you send during a consultation are yours, but you grant us a license to store and process them to provide the service (compute your chart, route your chat, retain a short-lived call recording — see our Privacy Policy for exactly how long).',
      },
      {
        heading: 'Astrologers and pandits are independent',
        body: 'Astrologers and pandits on TredevaAstro are independent practitioners we vet and list, not our employees. We facilitate the booking, payment, and platform, but predictions and remedies are their own professional judgment, not ours.',
      },
      {
        heading: 'Limitation of liability',
        body: 'TredevaAstro is provided "as is." We are not liable for decisions you make based on an astrological reading, or for indirect losses arising from your use of the platform, to the fullest extent the law allows.',
      },
      {
        heading: 'Changes to these Terms',
        body: 'We may update these Terms as the platform changes. Material changes will be reflected here with an updated date above; continued use after a change means you accept the update.',
      },
      {
        heading: 'Contact',
        body: 'Questions about these Terms can be sent through the Consult an Astrologer / Contact options on this site.',
      },
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    updated: '28 September 2026',
    intro: 'This explains what we collect, why, and how it\'s handled — in plain language, not legal boilerplate for its own sake.',
    sections: [
      {
        heading: 'What we collect',
        body: 'To create your account and calculate your chart, we collect:',
        bullets: [
          'Phone number or Google account email — used to sign you in via Firebase Authentication.',
          'Birth date, time, and place — used only to compute your Kundli/Panchang and to give astrologers the context they need during a consultation you\'ve booked.',
          'Payment details — handled entirely by our payment gateway (Cashfree); we never see or store your card/UPI credentials ourselves.',
          'Chat messages, and call audio/video during a live consultation, so the feature can work in real time.',
        ],
      },
      {
        heading: 'Call recordings',
        body: 'Voice/video consultations may be recorded for quality and dispute-resolution purposes. Recordings are visible only to staff handling a support issue, and are automatically deleted 10 days after the call.',
      },
      {
        heading: 'Who sees your data',
        body: 'The astrologer or pandit you book a session with sees your name and the birth details relevant to that session. Our staff can see account and consultation records to run support and moderation. We do not sell your personal data to advertisers or other third parties.',
      },
      {
        heading: 'Third-party services we rely on',
        body: 'Firebase (Google) for authentication, Cashfree for payments, and standard cloud hosting/database infrastructure to run the site. Each only receives the minimum data needed to do its job.',
      },
      {
        heading: 'How long we keep it',
        body: 'Your account and birth details are kept as long as your account exists. Call recordings are kept 10 days. You can ask us to delete your account and associated personal data at any time; some records (like payment receipts) may be retained longer where required by law.',
      },
      {
        heading: 'Your choices',
        body: 'You can edit your saved birth details, change your name, or request account deletion from your Profile / Account Settings, or by reaching out through Consult / Contact.',
      },
      {
        heading: 'Cookies',
        body: 'We use essential cookies/local storage to keep you signed in and remember preferences like language and theme. We don\'t use third-party advertising trackers.',
      },
      {
        heading: 'Children',
        body: 'TredevaAstro is not directed at children under 18. We don\'t knowingly collect data from anyone under that age.',
      },
    ],
  },

  safety: {
    title: 'Safety',
    updated: '28 September 2026',
    intro: 'How we try to keep consultations, group poojas, and pandit bookings safe — and what to do if something goes wrong.',
    sections: [
      {
        heading: 'Vetted astrologers and pandits',
        body: 'Every astrologer and pandit listed on TredevaAstro applies and is reviewed before going live on the platform. Ratings and reviews from real completed consultations stay visible so you can judge fit before booking.',
      },
      {
        heading: 'Keep it on the platform',
        body: 'Pay, chat, and call only through TredevaAstro — never through a personal number, UPI ID, or app an astrologer asks you to move to. Off-platform payments have no refund protection and can\'t be investigated if something goes wrong.',
      },
      {
        heading: 'Recorded for safety',
        body: 'Voice and video consultations may be recorded (see our Privacy Policy for retention). This protects both sides if a session needs to be reviewed for a complaint.',
      },
      {
        heading: 'Group pooja sessions',
        body: 'A group pooja is run by the listed pandit over an external meeting link, revealed only once you\'ve registered. Treat that link like any video-call link — don\'t share it publicly, and report the session if the pandit asks for payment or personal details outside what you already paid on TredevaAstro.',
      },
      {
        heading: 'Reporting a problem',
        body: 'If an astrologer, pandit, or another user behaves inappropriately, asks to move off-platform, or you suspect a scam, end the session and report it through Consult an Astrologer → the consultation\'s report option, or contact us directly. We review every report and can suspend accounts while we investigate.',
      },
      {
        heading: 'Not a substitute for professional help',
        body: 'Astrology and pooja guidance on this platform are for entertainment and spiritual guidance. For medical, mental health, legal, or financial decisions, please consult a licensed professional — an astrologer\'s reading is not a diagnosis or professional advice.',
      },
    ],
  },
};
