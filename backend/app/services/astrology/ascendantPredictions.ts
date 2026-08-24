// Ascendant (Lagna) predictions broken into the standard categories a full
// Vedic report covers — Personality, Physical, Health, Career, Relationship
// — one classical, sign-level profile per Ascendant (not house-specific,
// same scope as the "Ascendant Predictions" section of a typical commercial
// report). The description paragraph is generic by design (it explains what
// an Ascendant is, not what this one specifically means) — this app's own
// reference report format keeps that paragraph identical across signs too.
const DESCRIPTION = `Your Ascendant (Lagna) is the zodiac sign that was rising on the eastern horizon at your exact moment and place of birth. It is one of the most personal points in a chart — unlike your Moon or Sun sign, which shift only monthly or yearly, the Ascendant is precise to the minute and place of birth, and it colors your outward personality, physical presence, and the lens through which the rest of your chart plays out.`;

interface AscendantProfile {
  personality: string;
  physical: string;
  health: string;
  career: string;
  relationship: string;
}

const PROFILES: Record<string, AscendantProfile> = {
  Aries: {
    personality: `Aries Ascendant natives are bold, direct, and quick to act, often leading with energy and initiative rather than deliberation. Ruled by Mars, they are natural self-starters who dislike waiting around, and their enthusiasm can be contagious even when their impatience shows.`,
    physical: `Typically of medium build with a strong, energetic presence and a distinctive head or face — Mars rules the head, so headaches or facial marks are common. Their gait tends to be quick and purposeful, matching their restless inner drive.`,
    health: `Prone to minor injuries from impulsiveness, headaches, and issues tied to excess heat in the body (Mars is a fiery, hot planet). Regular physical outlets for their high energy — sport, exercise — help keep both body and temper in balance.`,
    career: `Thrive in roles that reward initiative and courage: entrepreneurship, the military, sports, engineering, or any field where they can lead rather than follow. They do poorly in slow-moving, highly bureaucratic environments.`,
    relationship: `Passionate and direct in love, Aries Ascendants pursue what they want without much hesitation. They need a partner who can match their energy and give them room to lead, and can be prone to friction if their bluntness isn't met with patience.`,
  },
  Taurus: {
    personality: `Taurus Ascendant natives are steady, patient, and grounded, valuing comfort, stability, and follow-through over impulsive change. Ruled by Venus, they have a natural appreciation for beauty and quality, and once they commit to something, they rarely let go.`,
    physical: `Often sturdy and well-built with a strong neck and throat area (Taurus rules this region), pleasant features, and a calm, unhurried way of carrying themselves. Weight gain can come easily if their love of comfort tips into indulgence.`,
    health: `Vulnerable to throat, thyroid, and neck-related issues, and to sluggishness if their fondness for rich food and comfort isn't balanced with activity. A steady routine suits them far better than sudden lifestyle overhauls.`,
    career: `Excel in finance, agriculture, luxury goods, the arts, and any field rewarding patience and reliability. They build wealth slowly and steadily rather than through speculation, and are valued as dependable long-term contributors.`,
    relationship: `Loyal, sensual, and committed once settled, Taurus Ascendants take relationships seriously and dislike instability. They can be possessive or resistant to change within a partnership, but offer deep, dependable devotion in return.`,
  },
  Gemini: {
    personality: `Gemini Ascendant natives are curious, communicative, and adaptable, taking in and processing the world quickly. Ruled by Mercury, they think and speak fast, enjoy variety, and can seem like two different people depending on the context — hence the Twins symbolism.`,
    physical: `Usually of average to slim build, with expressive hands and quick, animated gestures while speaking. Their eyes and expressions tend to be lively, mirroring their restless, quick-moving mind.`,
    health: `Nervous system sensitivity, respiratory issues, and restlessness-driven fatigue are common weak points, since Gemini rules the lungs, arms, and nervous system. Mental overstimulation from constant multitasking can wear them down more than physical exertion does.`,
    career: `Natural fits for writing, journalism, sales, teaching, and any communication-heavy field — they need variety and mental stimulation to stay engaged. Repetitive, isolated work tends to frustrate them quickly.`,
    relationship: `Witty and engaging partners who need constant mental connection and conversation to stay interested. They can come across as inconsistent or hard to pin down, and do best with a partner who keeps things intellectually alive.`,
  },
  Cancer: {
    personality: `Cancer Ascendant natives are sensitive, nurturing, and protective, with instincts and emotions running deep beneath a often quiet exterior. Ruled by the Moon, their moods shift with their environment, and they form strong emotional attachments to home and family.`,
    physical: `Often has a rounded, soft appearance with expressive, emotive eyes, and a build that can fluctuate more than most with mood and diet. The chest area (Cancer's domain) can be a point of physical sensitivity.`,
    health: `Prone to digestive issues, water retention, and stress-related ailments tied closely to emotional state — their physical health often mirrors their emotional wellbeing more directly than for most signs. A stable home environment matters as much as diet.`,
    career: `Suited to caregiving, hospitality, real estate, food-related fields, and any work involving nurturing or emotional support. They perform best in roles where they feel emotionally invested, not purely transactional ones.`,
    relationship: `Deeply loyal and protective once attached, Cancer Ascendants seek emotional security above all else in a partnership. They can withdraw into their shell when hurt, and need reassurance and warmth to feel safe opening up.`,
  },
  Leo: {
    personality: `Leo Ascendant natives are confident, expressive, and warm, naturally drawing attention and inclined to lead. Ruled by the Sun, they have an innate charisma and a generous heart, though their pride can occasionally tip into stubbornness or a need for recognition.`,
    physical: `Typically have a commanding presence — a broad chest, upright bearing, and a warm, radiant expression that draws the eye even in a crowd. Hair is often a notable feature, thick or distinctive.`,
    health: `The heart and spine (Leo's domains) are areas to watch, along with stress from overexertion — Leos tend to push themselves hard chasing recognition. Regular rest and cardiovascular care matter more for them than for most.`,
    career: `Natural fits for leadership roles, performing arts, management, and anything public-facing where their presence can shine. They struggle in the background and thrive when given ownership and visibility.`,
    relationship: `Generous, loyal, and romantic, Leo Ascendants love grandly and expect to be admired in return. They need a partner who can appreciate their warmth without being overshadowed by their need to be the center of attention.`,
  },
  Virgo: {
    personality: `Virgo Ascendant natives are analytical, precise, and service-minded, noticing details others miss. Ruled by Mercury, they hold high standards for themselves and others, and their instinct to improve and refine things can tip into over-criticism if left unchecked.`,
    physical: `Often of a neat, moderate build with a careful, composed way of dressing and moving — Virgo rules the digestive system, and their build can be sensitive to diet. Their expression tends to be observant and measured.`,
    health: `Digestive sensitivity and anxiety-driven stress are the classic weak points for this Ascendant — their tendency to overthink and worry shows up in the gut before anywhere else. A calm, structured routine helps more than most remedies.`,
    career: `Excel in analysis, healthcare, editing, accounting, and any field rewarding precision and attention to detail. They are the reliable executors of a team, though they can struggle to delegate or accept imperfect work from others.`,
    relationship: `Devoted and practical in love, Virgo Ascendants show care through acts of service rather than grand gestures. Their tendency to critique can be misread as coldness, though it usually comes from a genuine wish to help.`,
  },
  Libra: {
    personality: `Libra Ascendant natives are diplomatic, balanced, and relationship-focused, seeking fairness and harmony in most situations. Ruled by Venus, they have a refined sense of aesthetics and social grace, though their dislike of conflict can lead to indecision.`,
    physical: `Usually well-proportioned with pleasant, symmetrical features and a graceful way of carrying themselves — Libra rules the kidneys and lower back, which can be points of sensitivity. They often dress with visible care and taste.`,
    health: `Kidney function and lower-back issues are the classical weak points, along with health effects of chronic indecision or people-pleasing stress. Balance in diet and routine suits them, matching their sign's own symbolism.`,
    career: `Well-suited to law, diplomacy, design, the arts, and any partnership-based field where fairness and aesthetics matter. They perform best in collaborative rather than solitary or highly competitive environments.`,
    relationship: `Romantic and partnership-oriented almost to a fault, Libra Ascendants often define themselves through their relationships. They seek balance and harmony with a partner, and can struggle being alone or making unilateral decisions.`,
  },
  Scorpio: {
    personality: `Scorpio Ascendant natives are intense, private, and resilient, going deep rather than staying on the surface. Ruled by Mars (and traditionally associated with transformation), they have strong willpower and a magnetic, somewhat mysterious presence that others notice immediately.`,
    physical: `Often has piercing, intense eyes and a strong, magnetic presence even at rest — Scorpio rules the reproductive and eliminative systems. Their expression can give away little, adding to their air of mystery.`,
    health: `Reproductive and eliminative system health, along with stress from suppressed emotion, are the classical concerns — Scorpios tend to internalize rather than express difficulty. Outlets for emotional release matter more for them than most.`,
    career: `Suited to research, investigation, psychology, surgery, finance, and any field requiring depth and the willingness to confront what others avoid. They excel where discretion and resilience under pressure are valued.`,
    relationship: `Deeply loyal and passionate but guarded, Scorpio Ascendants test trust before committing fully, and expect the same intensity they offer. Betrayal is rarely forgiven, but genuine loyalty is repaid many times over.`,
  },
  Sagittarius: {
    personality: `Sagittarius Ascendant natives are optimistic, independent, and philosophical, drawn to growth and exploration. Ruled by Jupiter, they have an expansive, big-picture outlook and a restless need for freedom that resists anything that feels confining.`,
    physical: `Often tall or long-limbed with an energetic, forward-leaning way of moving — Sagittarius rules the hips and thighs, a common area of minor strain from their active lifestyle. Their expression tends to be open and enthusiastic.`,
    health: `Hip and thigh injuries, along with issues from overindulgence (Jupiter's expansive tendencies can extend to food and drink), are the classical weak points. An active, varied routine keeps both body and restless mind satisfied.`,
    career: `Thrive in teaching, travel, publishing, law, and philosophy — any field with room to explore ideas and move rather than stay confined to one desk or task. Rigid hierarchies frustrate them quickly.`,
    relationship: `Warm and enthusiastic but freedom-loving, Sagittarius Ascendants need a partner who won't feel threatened by their independence. Honesty (sometimes blunt) and shared adventure matter more to them than routine displays of affection.`,
  },
  Capricorn: {
    personality: `Capricorn Ascendant natives are disciplined, ambitious, and practical, building things that last rather than chasing quick wins. Ruled by Saturn, they carry a natural seriousness and sense of responsibility, sometimes appearing older or more reserved than their age.`,
    physical: `Often has a lean, bony structure with strong bone density and a composed, reserved bearing — Saturn's influence tends to show in the knees, joints, and skin. Their presence is understated rather than flashy.`,
    health: `Joint, bone, and knee issues are the classical weak points for this Ascendant, along with stress-related conditions from relentless self-discipline. Rest doesn't come naturally to them, but is exactly what their Saturn-ruled body needs most.`,
    career: `Excel in management, government, engineering, and any field rewarding long-term structure-building and patience. They rise slowly but steadily, and are trusted with responsibility precisely because they take it seriously.`,
    relationship: `Reserved and slow to open up, but deeply committed once they do, Capricorn Ascendants show love through consistency and reliability rather than grand romantic display. They value a partner who respects their need for structure and independence.`,
  },
  Aquarius: {
    personality: `Aquarius Ascendant natives are independent, original, and idea-driven, often thinking ahead of the crowd. Ruled by Saturn (with a modern association to Uranus), they value intellectual freedom and social causes over convention, and can seem detached even while deeply caring.`,
    physical: `Often has a distinctive, unconventional look with a lean build and calm, observant eyes — Aquarius rules the calves and ankles, a common minor point of strain. Their overall presence tends to be understated but memorable.`,
    health: `Circulatory issues and ankle or lower-leg strain are the classical weak points, along with stress from overthinking or emotional detachment. Staying socially connected matters for their wellbeing as much as any physical remedy.`,
    career: `Well-suited to technology, science, social reform, and any field rewarding original thinking over tradition. They dislike rigid hierarchies and do best where their ideas are given real room to shape outcomes.`,
    relationship: `Loyal in their own unconventional way, Aquarius Ascendants need intellectual connection and independence within a relationship more than constant emotional display. Partners who respect their need for space tend to get their deepest loyalty.`,
  },
  Pisces: {
    personality: `Pisces Ascendant natives are imaginative, empathetic, and intuitive, feeling and absorbing what is around them more than most. Ruled by Jupiter (with a modern association to Neptune), they have a dreamy, compassionate nature and a strong pull toward art, spirituality, or escapism.`,
    physical: `Often has soft, expressive features and eyes that seem to carry a faraway quality — Pisces rules the feet, a common area of minor sensitivity. Their presence tends to feel gentle and easily affected by their surroundings.`,
    health: `Foot-related issues and a tendency to absorb others' stress emotionally are the classical weak points — Pisces natives often need more alone time to recover than they realize. Clear boundaries matter as much as physical care.`,
    career: `Thrive in the arts, healing professions, spirituality, and any field where empathy and imagination are assets rather than liabilities. Overly rigid, numbers-driven environments tend to drain them quickly.`,
    relationship: `Deeply romantic and self-sacrificing in love, Pisces Ascendants can idealize a partner or lose themselves in a relationship if they aren't careful. They need a partner who respects their sensitivity without taking advantage of their giving nature.`,
  },
};

export interface AscendantPredictions {
  ascendant: string;
  description: string;
  personality: string;
  physical: string;
  health: string;
  career: string;
  relationship: string;
}

export function buildAscendantPredictions(ascendantRashi: string): AscendantPredictions {
  const profile = PROFILES[ascendantRashi];
  return {
    ascendant: ascendantRashi,
    description: DESCRIPTION,
    personality: profile?.personality ?? '',
    physical: profile?.physical ?? '',
    health: profile?.health ?? '',
    career: profile?.career ?? '',
    relationship: profile?.relationship ?? '',
  };
}
