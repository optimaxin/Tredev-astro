// Ascendant (Lagna) predictions broken into the standard categories a full
// Vedic report covers — Personality, Physical, Health, Career, Relationship,
// plus a short Do's & Don'ts list — one classical, sign-level profile per
// Ascendant (not house-specific, same scope as the "Ascendant Predictions"
// section of a typical commercial report). The description paragraph is
// generic by design (it explains what an Ascendant is, not what this one
// specifically means) — this app's own reference report format keeps that
// paragraph identical across signs too.
//
// Do's & Don'ts are classical, sign-level behavioural guidance (channel X,
// avoid Y) tied to the same themes already stated in that sign's own
// personality/health text — not remedies invented for this feature, and not
// gemstone/ritual prescriptions (those already have their own dedicated
// recommender elsewhere in this app).
const DESCRIPTION = `Your Ascendant (Lagna) is the zodiac sign that was rising on the eastern horizon at your exact moment and place of birth. It is one of the most personal points in a chart — unlike your Moon or Sun sign, which shift only monthly or yearly, the Ascendant is precise to the minute and place of birth, and it colors your outward personality, physical presence, and the lens through which the rest of your chart plays out.`;

const DESCRIPTION_HI = `आपका लग्न (Ascendant) वह राशि है जो आपके जन्म के ठीक समय और स्थान पर पूर्वी क्षितिज पर उदय हो रही थी। यह कुंडली के सबसे व्यक्तिगत बिंदुओं में से एक है — आपकी चंद्र या सूर्य राशि के विपरीत, जो केवल महीने या वर्ष भर में बदलती हैं, लग्न जन्म के मिनट और स्थान तक सटीक होता है, और यही आपके बाहरी व्यक्तित्व, शारीरिक उपस्थिति, और उस दृष्टिकोण को रंग देता है जिससे आपकी शेष कुंडली पढ़ी जाती है।`;

interface AscendantProfile {
  personality: string;
  physical: string;
  health: string;
  career: string;
  relationship: string;
  dos: string[];
  donts: string[];
}

const PROFILES: Record<string, AscendantProfile> = {
  Aries: {
    personality: `Aries Ascendant natives are bold, direct, and quick to act, often leading with energy and initiative rather than deliberation. Ruled by Mars, they are natural self-starters who dislike waiting around, and their enthusiasm can be contagious even when their impatience shows.`,
    physical: `Typically of medium build with a strong, energetic presence and a distinctive head or face — Mars rules the head, so headaches or facial marks are common. Their gait tends to be quick and purposeful, matching their restless inner drive.`,
    health: `Prone to minor injuries from impulsiveness, headaches, and issues tied to excess heat in the body (Mars is a fiery, hot planet). Regular physical outlets for their high energy — sport, exercise — help keep both body and temper in balance. Watch for cuts, burns, and fevers specifically, and for blood-pressure spikes when anger goes unreleased.`,
    career: `Thrive in roles that reward initiative and courage: entrepreneurship, the military, sports, engineering, or any field where they can lead rather than follow. They do poorly in slow-moving, highly bureaucratic environments.`,
    relationship: `Passionate and direct in love, Aries Ascendants pursue what they want without much hesitation. They need a partner who can match their energy and give them room to lead, and can be prone to friction if their bluntness isn't met with patience.`,
    dos: [
      "Channel high energy into regular exercise or sport before it turns into restlessness or irritability.",
      "Take a breath before reacting in anger — a short pause prevents most of the conflicts this Ascendant is prone to.",
      "Take the lead on new initiatives; this placement genuinely does its best work starting things rather than maintaining them.",
    ],
    donts: [
      "Don't make major decisions (financial, relationship, or career) in the heat of the moment — revisit them after a day.",
      "Don't ignore minor injuries or headaches; this Ascendant tends to push through pain instead of treating it early.",
      "Don't let bluntness go unchecked with people who need patience — it costs more relationships than the honesty is worth.",
    ],
  },
  Taurus: {
    personality: `Taurus Ascendant natives are steady, patient, and grounded, valuing comfort, stability, and follow-through over impulsive change. Ruled by Venus, they have a natural appreciation for beauty and quality, and once they commit to something, they rarely let go.`,
    physical: `Often sturdy and well-built with a strong neck and throat area (Taurus rules this region), pleasant features, and a calm, unhurried way of carrying themselves. Weight gain can come easily if their love of comfort tips into indulgence.`,
    health: `Vulnerable to throat, thyroid, and neck-related issues, and to sluggishness if their fondness for rich food and comfort isn't balanced with activity. A steady routine suits them far better than sudden lifestyle overhauls. Watch specifically for weight gain, thyroid imbalance, and throat infections during stressful periods.`,
    career: `Excel in finance, agriculture, luxury goods, the arts, and any field rewarding patience and reliability. They build wealth slowly and steadily rather than through speculation, and are valued as dependable long-term contributors.`,
    relationship: `Loyal, sensual, and committed once settled, Taurus Ascendants take relationships seriously and dislike instability. They can be possessive or resistant to change within a partnership, but offer deep, dependable devotion in return.`,
    dos: [
      "Build a steady daily routine — this Ascendant thrives on consistency far more than on dramatic lifestyle changes.",
      "Get regular movement into the week deliberately, since comfort-seeking otherwise crowds it out.",
      "Save and invest steadily rather than chasing quick returns; patience is this placement\'s real financial strength.",
    ],
    donts: [
      "Don't let comfort tip into indulgence — rich food and inactivity are this Ascendant's most common health drain.",
      "Don't hold onto possessiveness or resistance-to-change in a relationship once it starts causing real friction.",
      "Don't dig in out of sheer stubbornness on something that genuinely needs to change — reconsider before refusing.",
    ],
  },
  Gemini: {
    personality: `Gemini Ascendant natives are curious, communicative, and adaptable, taking in and processing the world quickly. Ruled by Mercury, they think and speak fast, enjoy variety, and can seem like two different people depending on the context — hence the Twins symbolism.`,
    physical: `Usually of average to slim build, with expressive hands and quick, animated gestures while speaking. Their eyes and expressions tend to be lively, mirroring their restless, quick-moving mind.`,
    health: `Nervous system sensitivity, respiratory issues, and restlessness-driven fatigue are common weak points, since Gemini rules the lungs, arms, and nervous system. Mental overstimulation from constant multitasking can wear them down more than physical exertion does. Watch specifically for anxiety, insomnia, and breathing-related issues during overloaded periods.`,
    career: `Natural fits for writing, journalism, sales, teaching, and any communication-heavy field — they need variety and mental stimulation to stay engaged. Repetitive, isolated work tends to frustrate them quickly.`,
    relationship: `Witty and engaging partners who need constant mental connection and conversation to stay interested. They can come across as inconsistent or hard to pin down, and do best with a partner who keeps things intellectually alive.`,
    dos: [
      "Build in real downtime between tasks — this Ascendant\'s fatigue is mental far more than physical, and needs mental rest.",
      "Write things down or journal regularly; it settles a mind that otherwise runs on too many parallel threads.",
      "Seek variety deliberately in work and routine, rather than letting boredom build until it forces a disruptive change.",
    ],
    donts: [
      "Don't take on more simultaneous commitments than can actually be followed through on — half-finished threads pile up fast.",
      "Don't let restlessness talk you out of a genuinely good, if less exciting, opportunity or relationship.",
      "Don't rely on words alone to smooth over inconsistency with people who need to see it followed by action.",
    ],
  },
  Cancer: {
    personality: `Cancer Ascendant natives are sensitive, nurturing, and protective, with instincts and emotions running deep beneath a often quiet exterior. Ruled by the Moon, their moods shift with their environment, and they form strong emotional attachments to home and family.`,
    physical: `Often has a rounded, soft appearance with expressive, emotive eyes, and a build that can fluctuate more than most with mood and diet. The chest area (Cancer's domain) can be a point of physical sensitivity.`,
    health: `Prone to digestive issues, water retention, and stress-related ailments tied closely to emotional state — their physical health often mirrors their emotional wellbeing more directly than for most signs. A stable home environment matters as much as diet. Watch specifically for acidity, bloating, and mood-linked appetite swings.`,
    career: `Suited to caregiving, hospitality, real estate, food-related fields, and any work involving nurturing or emotional support. They perform best in roles where they feel emotionally invested, not purely transactional ones.`,
    relationship: `Deeply loyal and protective once attached, Cancer Ascendants seek emotional security above all else in a partnership. They can withdraw into their shell when hurt, and need reassurance and warmth to feel safe opening up.`,
    dos: [
      "Keep the home environment calm and stable where possible — this Ascendant\'s wellbeing genuinely tracks it closely.",
      "Talk through hurt feelings with someone trusted rather than withdrawing silently; the shell helps short-term, not long-term.",
      "Watch diet during emotionally difficult periods specifically, since stress shows up in digestion before anywhere else.",
    ],
    donts: [
      "Don't let mood swings go unaddressed for long stretches — they compound into digestive and sleep issues here.",
      "Don't withdraw completely when hurt in a relationship; it reads as rejection to a partner who may not know why.",
      "Don't take on others' emotional burdens as your own without limits — the instinct to nurture needs boundaries too.",
    ],
  },
  Leo: {
    personality: `Leo Ascendant natives are confident, expressive, and warm, naturally drawing attention and inclined to lead. Ruled by the Sun, they have an innate charisma and a generous heart, though their pride can occasionally tip into stubbornness or a need for recognition.`,
    physical: `Typically have a commanding presence — a broad chest, upright bearing, and a warm, radiant expression that draws the eye even in a crowd. Hair is often a notable feature, thick or distinctive.`,
    health: `The heart and spine (Leo's domains) are areas to watch, along with stress from overexertion — Leos tend to push themselves hard chasing recognition. Regular rest and cardiovascular care matter more for them than for most. Watch specifically for high blood pressure, back strain, and burnout from overcommitting.`,
    career: `Natural fits for leadership roles, performing arts, management, and anything public-facing where their presence can shine. They struggle in the background and thrive when given ownership and visibility.`,
    relationship: `Generous, loyal, and romantic, Leo Ascendants love grandly and expect to be admired in return. They need a partner who can appreciate their warmth without being overshadowed by their need to be the center of attention.`,
    dos: [
      "Schedule real rest, not just downtime between commitments — the heart and spine here need actual recovery.",
      "Give credit and attention to others deliberately; it costs little and prevents the pride-driven friction this placement is prone to.",
      "Take leadership roles when offered — this Ascendant's confidence is a genuine asset in front of people, not just an ego need.",
    ],
    donts: [
      "Don't chase recognition to the point of overexertion — cardiovascular strain here is real, not just a figure of speech.",
      "Don't let stubbornness or wounded pride stall a relationship or working conflict past the point it needs resolving.",
      "Don't need to be the center of attention in every relationship — a partner's own spotlight moments deserve equal warmth.",
    ],
  },
  Virgo: {
    personality: `Virgo Ascendant natives are analytical, precise, and service-minded, noticing details others miss. Ruled by Mercury, they hold high standards for themselves and others, and their instinct to improve and refine things can tip into over-criticism if left unchecked.`,
    physical: `Often of a neat, moderate build with a careful, composed way of dressing and moving — Virgo rules the digestive system, and their build can be sensitive to diet. Their expression tends to be observant and measured.`,
    health: `Digestive sensitivity and anxiety-driven stress are the classic weak points for this Ascendant — their tendency to overthink and worry shows up in the gut before anywhere else. A calm, structured routine helps more than most remedies. Watch specifically for acidity, IBS-type symptoms, and stress headaches during high-pressure periods.`,
    career: `Excel in analysis, healthcare, editing, accounting, and any field rewarding precision and attention to detail. They are the reliable executors of a team, though they can struggle to delegate or accept imperfect work from others.`,
    relationship: `Devoted and practical in love, Virgo Ascendants show care through acts of service rather than grand gestures. Their tendency to critique can be misread as coldness, though it usually comes from a genuine wish to help.`,
    dos: [
      "Build a calm, structured daily routine deliberately — it settles this Ascendant\'s digestion and mind more than any remedy.",
      "Say the caring intention out loud alongside the critique, so it doesn\'t land as coldness to people who don\'t know this placement well.",
      "Delegate on purpose, even imperfectly done work — perfectionism here quietly overloads them more than it helps anyone.",
    ],
    donts: [
      "Don't let overthinking run unchecked before bed or during meals — it shows up directly as digestive trouble here.",
      "Don't criticize before acknowledging what's working; the habit reads as harsher than it's usually meant.",
      "Don't take on everyone's unfinished work rather than trusting others to finish their own, even imperfectly.",
    ],
  },
  Libra: {
    personality: `Libra Ascendant natives are diplomatic, balanced, and relationship-focused, seeking fairness and harmony in most situations. Ruled by Venus, they have a refined sense of aesthetics and social grace, though their dislike of conflict can lead to indecision.`,
    physical: `Usually well-proportioned with pleasant, symmetrical features and a graceful way of carrying themselves — Libra rules the kidneys and lower back, which can be points of sensitivity. They often dress with visible care and taste.`,
    health: `Kidney function and lower-back issues are the classical weak points, along with health effects of chronic indecision or people-pleasing stress. Balance in diet and routine suits them, matching their sign's own symbolism. Watch specifically for kidney/urinary issues and lower-back pain from prolonged poor posture or stress.`,
    career: `Well-suited to law, diplomacy, design, the arts, and any partnership-based field where fairness and aesthetics matter. They perform best in collaborative rather than solitary or highly competitive environments.`,
    relationship: `Romantic and partnership-oriented almost to a fault, Libra Ascendants often define themselves through their relationships. They seek balance and harmony with a partner, and can struggle being alone or making unilateral decisions.`,
    dos: [
      "Set a decision deadline for yourself on things that don\'t need endless weighing — indecision itself is the real cost here.",
      "Stay hydrated and mind posture specifically, given this Ascendant\'s kidney and lower-back sensitivity.",
      "Build comfort with being alone occasionally on purpose, so the relationship isn\'t carrying the entire sense of identity.",
    ],
    donts: [
      "Don't avoid necessary conflict just to preserve short-term harmony — it usually resurfaces larger later.",
      "Don't let people-pleasing stress build silently; it shows up physically here before it shows up as a stated complaint.",
      "Don't make major life decisions solely to keep a partner happy at your own consistent expense.",
    ],
  },
  Scorpio: {
    personality: `Scorpio Ascendant natives are intense, private, and resilient, going deep rather than staying on the surface. Ruled by Mars (and traditionally associated with transformation), they have strong willpower and a magnetic, somewhat mysterious presence that others notice immediately.`,
    physical: `Often has piercing, intense eyes and a strong, magnetic presence even at rest — Scorpio rules the reproductive and eliminative systems. Their expression can give away little, adding to their air of mystery.`,
    health: `Reproductive and eliminative system health, along with stress from suppressed emotion, are the classical concerns — Scorpios tend to internalize rather than express difficulty. Outlets for emotional release matter more for them than most. Watch specifically for reproductive-health checkups and stress that manifests as tension rather than visible symptoms.`,
    career: `Suited to research, investigation, psychology, surgery, finance, and any field requiring depth and the willingness to confront what others avoid. They excel where discretion and resilience under pressure are valued.`,
    relationship: `Deeply loyal and passionate but guarded, Scorpio Ascendants test trust before committing fully, and expect the same intensity they offer. Betrayal is rarely forgiven, but genuine loyalty is repaid many times over.`,
    dos: [
      "Find a real outlet for emotional release — physical activity, trusted conversation, even writing — rather than internalizing everything.",
      "Get regular health checkups even without visible symptoms, since this Ascendant tends to notice problems late.",
      "Let trust build gradually with people who've earned it, rather than testing indefinitely once it's clearly warranted.",
    ],
    donts: [
      "Don't suppress difficulty until it becomes a health issue — the internalizing habit here has a real physical cost.",
      "Don't let a single betrayal generalize into permanent guardedness with everyone new.",
      "Don't use secrecy as a default in a relationship where actual transparency would resolve the guardedness faster.",
    ],
  },
  Sagittarius: {
    personality: `Sagittarius Ascendant natives are optimistic, independent, and philosophical, drawn to growth and exploration. Ruled by Jupiter, they have an expansive, big-picture outlook and a restless need for freedom that resists anything that feels confining.`,
    physical: `Often tall or long-limbed with an energetic, forward-leaning way of moving — Sagittarius rules the hips and thighs, a common area of minor strain from their active lifestyle. Their expression tends to be open and enthusiastic.`,
    health: `Hip and thigh injuries, along with issues from overindulgence (Jupiter's expansive tendencies can extend to food and drink), are the classical weak points. An active, varied routine keeps both body and restless mind satisfied. Watch specifically for hip/joint strain from overexertion and weight gain from overindulgence during good times.`,
    career: `Thrive in teaching, travel, publishing, law, and philosophy — any field with room to explore ideas and move rather than stay confined to one desk or task. Rigid hierarchies frustrate them quickly.`,
    relationship: `Warm and enthusiastic but freedom-loving, Sagittarius Ascendants need a partner who won't feel threatened by their independence. Honesty (sometimes blunt) and shared adventure matter more to them than routine displays of affection.`,
    dos: [
      "Keep an active, varied routine deliberately — both body and mind here genuinely need the variety, not just enjoy it.",
      "Say the honest thing with a little more tact than instinct suggests; the substance can stay, only the delivery needs softening.",
      "Give a partner explicit reassurance about independence rather than assuming they'll simply understand the need for space.",
    ],
    donts: [
      "Don't let overindulgence during good periods go unchecked — weight and joint strain build quietly here.",
      "Don't mistake bluntness for honesty when the moment actually calls for more care in how something is said.",
      "Don't commit to more obligations than the restless need for freedom can actually tolerate long-term.",
    ],
  },
  Capricorn: {
    personality: `Capricorn Ascendant natives are disciplined, ambitious, and practical, building things that last rather than chasing quick wins. Ruled by Saturn, they carry a natural seriousness and sense of responsibility, sometimes appearing older or more reserved than their age.`,
    physical: `Often has a lean, bony structure with strong bone density and a composed, reserved bearing — Saturn's influence tends to show in the knees, joints, and skin. Their presence is understated rather than flashy.`,
    health: `Joint, bone, and knee issues are the classical weak points for this Ascendant, along with stress-related conditions from relentless self-discipline. Rest doesn't come naturally to them, but is exactly what their Saturn-ruled body needs most. Watch specifically for joint pain, skin issues, and chronic fatigue from underrested self-discipline.`,
    career: `Excel in management, government, engineering, and any field rewarding long-term structure-building and patience. They rise slowly but steadily, and are trusted with responsibility precisely because they take it seriously.`,
    relationship: `Reserved and slow to open up, but deeply committed once they do, Capricorn Ascendants show love through consistency and reliability rather than grand romantic display. They value a partner who respects their need for structure and independence.`,
    dos: [
      "Schedule rest as deliberately as work — this Ascendant\'s Saturn-ruled body needs it most precisely because it resists taking it.",
      "Open up to a committed partner earlier than instinct suggests; the reserve here often reads as distance rather than depth.",
      "Take on responsibility at a pace that's sustainable, not just whatever's offered — the rise here is meant to be steady, not relentless.",
    ],
    donts: [
      "Don't push through fatigue as a badge of discipline — joint and bone strain here compounds silently over years.",
      "Don't let consistency substitute entirely for warmth in a relationship; both are needed, not one instead of the other.",
      "Don't take on every available responsibility just because you're trusted with it — overload builds slowly and stays long.",
    ],
  },
  Aquarius: {
    personality: `Aquarius Ascendant natives are independent, original, and idea-driven, often thinking ahead of the crowd. Ruled by Saturn (with a modern association to Uranus), they value intellectual freedom and social causes over convention, and can seem detached even while deeply caring.`,
    physical: `Often has a distinctive, unconventional look with a lean build and calm, observant eyes — Aquarius rules the calves and ankles, a common minor point of strain. Their overall presence tends to be understated but memorable.`,
    health: `Circulatory issues and ankle or lower-leg strain are the classical weak points, along with stress from overthinking or emotional detachment. Staying socially connected matters for their wellbeing as much as any physical remedy. Watch specifically for circulation problems and isolation-driven low mood during withdrawn periods.`,
    career: `Well-suited to technology, science, social reform, and any field rewarding original thinking over tradition. They dislike rigid hierarchies and do best where their ideas are given real room to shape outcomes.`,
    relationship: `Loyal in their own unconventional way, Aquarius Ascendants need intellectual connection and independence within a relationship more than constant emotional display. Partners who respect their need for space tend to get their deepest loyalty.`,
    dos: [
      "Stay socially connected on purpose, even briefly — isolation here affects mood more than this Ascendant tends to notice.",
      "Name the caring feeling out loud occasionally; detachment is often misread by others as indifference.",
      "Move regularly to support circulation, since this placement's sedentary tendency compounds a real physical weak point.",
    ],
    donts: [
      "Don't withdraw for long stretches when overthinking — it feeds the isolation that worsens the mood dip.",
      "Don't assume a partner will infer the loyalty underneath the detachment without ever being told directly.",
      "Don't dismiss convention so reflexively that genuinely useful structure gets rejected along with the unnecessary parts.",
    ],
  },
  Pisces: {
    personality: `Pisces Ascendant natives are imaginative, empathetic, and intuitive, feeling and absorbing what is around them more than most. Ruled by Jupiter (with a modern association to Neptune), they have a dreamy, compassionate nature and a strong pull toward art, spirituality, or escapism.`,
    physical: `Often has soft, expressive features and eyes that seem to carry a faraway quality — Pisces rules the feet, a common area of minor sensitivity. Their presence tends to feel gentle and easily affected by their surroundings.`,
    health: `Foot-related issues and a tendency to absorb others' stress emotionally are the classical weak points — Pisces natives often need more alone time to recover than they realize. Clear boundaries matter as much as physical care. Watch specifically for foot problems and emotional exhaustion from absorbing others' moods.`,
    career: `Thrive in the arts, healing professions, spirituality, and any field where empathy and imagination are assets rather than liabilities. Overly rigid, numbers-driven environments tend to drain them quickly.`,
    relationship: `Deeply romantic and self-sacrificing in love, Pisces Ascendants can idealize a partner or lose themselves in a relationship if they aren't careful. They need a partner who respects their sensitivity without taking advantage of their giving nature.`,
    dos: [
      "Set clear emotional boundaries deliberately — this Ascendant absorbs others' stress more than it realizes in the moment.",
      "Schedule real alone time to recover, even when it doesn't feel urgently needed; the need shows up as exhaustion later.",
      "Keep a grounding practice (a routine, a craft, anything concrete) alongside the imagination, so escapism has a limit.",
    ],
    donts: [
      "Don't idealize a partner past the point of seeing them clearly — this placement's romanticism can outrun reality here.",
      "Don't take on other people's emotional weight without limits; giving needs a boundary to stay sustainable.",
      "Don't use escapism (real or emotional) as the default response to stress instead of addressing its source.",
    ],
  },
};

const PROFILES_HI: Record<string, AscendantProfile> = {
  Aries: {
    personality: `मेष लग्न वाले जातक साहसी, स्पष्टवादी और शीघ्र कार्य करने वाले होते हैं, अक्सर सोच-विचार से अधिक ऊर्जा और पहल के साथ आगे बढ़ते हैं। मंगल द्वारा शासित होने के कारण ये स्वाभाविक रूप से स्वयं आरंभ करने वाले होते हैं जिन्हें इंतज़ार करना पसंद नहीं, और इनका उत्साह संक्रामक होता है भले ही इनकी अधीरता कभी-कभी झलक जाए।`,
    physical: `सामान्यतः मध्यम कद-काठी, ऊर्जावान उपस्थिति और विशिष्ट सिर या चेहरे वाले होते हैं — मंगल सिर पर शासन करता है, इसलिए सिरदर्द या चेहरे पर निशान सामान्य हैं। इनकी चाल तेज़ और उद्देश्यपूर्ण होती है, जो इनकी बेचैन आंतरिक प्रेरणा से मेल खाती है।`,
    health: `आवेग के कारण छोटी-मोटी चोटें, सिरदर्द, और शरीर में अत्यधिक गर्मी से जुड़ी समस्याएं (मंगल एक उग्र, तप्त ग्रह है) होने की संभावना रहती है। इनकी उच्च ऊर्जा के लिए नियमित शारीरिक निकास — खेल, व्यायाम — शरीर और स्वभाव दोनों को संतुलित रखने में सहायक है। विशेष रूप से कट-चोट, जलन, और गुस्सा दबाने पर रक्तचाप बढ़ने पर ध्यान दें।`,
    career: `पहल और साहस को पुरस्कृत करने वाली भूमिकाओं में फलते-फूलते हैं: उद्यमिता, सेना, खेल, इंजीनियरिंग, या कोई भी क्षेत्र जहां ये अनुसरण करने के बजाय नेतृत्व कर सकें। धीमी गति वाले, अत्यधिक नौकरशाही वातावरण में इनका प्रदर्शन कमज़ोर रहता है।`,
    relationship: `प्रेम में जुनूनी और स्पष्टवादी, मेष लग्न बिना अधिक हिचकिचाहट के वही पाना चाहते हैं जो वे चाहते हैं। इन्हें ऐसे साथी की आवश्यकता होती है जो इनकी ऊर्जा का मुकाबला कर सके और इन्हें नेतृत्व करने की जगह दे, और यदि इनकी स्पष्टवादिता को धैर्य से न लिया जाए तो घर्षण हो सकता है।`,
    dos: [
      "ऊर्जा को नियमित व्यायाम या खेल में लगाएं इससे पहले कि यह बेचैनी या चिड़चिड़ेपन में बदल जाए।",
      "गुस्से में प्रतिक्रिया देने से पहले एक क्षण रुकें — यह इस लग्न के अधिकांश टकरावों को रोक देता है।",
      "नई पहलों का नेतृत्व करें; यह लग्न चीज़ों को बनाए रखने के बजाय शुरू करने में सबसे अच्छा प्रदर्शन करता है।",
    ],
    donts: [
      'गुस्से के क्षण में बड़े निर्णय (वित्तीय, संबंध, या करियर) न लें — एक दिन बाद फिर से विचार करें।',
      'छोटी चोटों या सिरदर्द को नज़रअंदाज़ न करें; यह लग्न इलाज करने के बजाय दर्द सहने की प्रवृत्ति रखता है।',
      'जिन्हें धैर्य चाहिए उनके साथ बेलगाम स्पष्टवादिता न दिखाएं — यह ईमानदारी से अधिक संबंधों की कीमत चुकाता है।',
    ],
  },
  Taurus: {
    personality: `वृषभ लग्न वाले जातक स्थिर, धैर्यवान और व्यावहारिक होते हैं, आवेगपूर्ण बदलाव के बजाय आराम, स्थिरता और निरंतरता को महत्व देते हैं। शुक्र द्वारा शासित होने के कारण इनमें सौंदर्य और गुणवत्ता की स्वाभाविक समझ होती है, और एक बार प्रतिबद्ध होने पर ये शायद ही कभी पीछे हटते हैं।`,
    physical: `प्रायः मज़बूत और सुगठित शरीर, मज़बूत गर्दन और गले का क्षेत्र (वृषभ इस क्षेत्र पर शासन करता है), सुखद विशेषताएं, और शांत, बिना जल्दबाज़ी वाला आचरण होता है। यदि आराम का प्रेम भोग-विलास में बदल जाए तो वज़न बढ़ना आसान हो सकता है।`,
    health: `गले, थायरॉइड और गर्दन से संबंधित समस्याओं के प्रति संवेदनशील होते हैं, और यदि स्वादिष्ट भोजन तथा आराम के प्रति इनका लगाव सक्रियता से संतुलित न हो तो सुस्ती की समस्या हो सकती है। अचानक जीवनशैली में बदलाव की तुलना में एक स्थिर दिनचर्या इनके लिए कहीं अधिक उपयुक्त है। तनावपूर्ण समय में विशेष रूप से वज़न बढ़ने, थायरॉइड असंतुलन, और गले के संक्रमण पर ध्यान दें।`,
    career: `वित्त, कृषि, विलासिता की वस्तुओं, कला, और धैर्य तथा विश्वसनीयता को पुरस्कृत करने वाले किसी भी क्षेत्र में उत्कृष्ट प्रदर्शन करते हैं। ये सट्टे के बजाय धीरे-धीरे और स्थिर रूप से धन अर्जित करते हैं, और भरोसेमंद दीर्घकालिक योगदानकर्ता के रूप में मूल्यवान माने जाते हैं।`,
    relationship: `एक बार स्थिर हो जाने पर वफादार, कामुक और प्रतिबद्ध, वृषभ लग्न संबंधों को गंभीरता से लेते हैं और अस्थिरता पसंद नहीं करते। ये किसी साझेदारी में स्वामित्व की भावना या परिवर्तन के प्रति प्रतिरोधी हो सकते हैं, लेकिन बदले में गहरी, भरोसेमंद निष्ठा प्रदान करते हैं।`,
    dos: [
      "एक स्थिर दैनिक दिनचर्या बनाएं — यह लग्न नाटकीय बदलावों की तुलना में निरंतरता में कहीं अधिक फलता-फूलता है।",
      "सप्ताह में जान-बूझकर नियमित गतिविधि शामिल करें, क्योंकि आराम की चाहत अन्यथा इसे बाहर कर देती है।",
      "त्वरित लाभ के पीछे भागने के बजाय स्थिर रूप से बचत और निवेश करें; धैर्य ही इस लग्न की असली वित्तीय शक्ति है।",
    ],
    donts: [
      'आराम को भोग-विलास में न बदलने दें — स्वादिष्ट भोजन और निष्क्रियता इस लग्न के स्वास्थ्य की सबसे आम कमज़ोरी है।',
      'किसी संबंध में स्वामित्व की भावना या परिवर्तन के प्रतिरोध को वास्तविक घर्षण पैदा करने तक न पकड़े रहें।',
      'केवल हठ के कारण किसी ऐसी चीज़ पर अड़े न रहें जिसे वास्तव में बदलने की आवश्यकता है।',
    ],
  },
  Gemini: {
    personality: `मिथुन लग्न वाले जातक जिज्ञासु, संवादप्रिय और अनुकूलनशील होते हैं, संसार को शीघ्रता से ग्रहण और संसाधित करते हैं। बुध द्वारा शासित होने के कारण ये तेज़ी से सोचते और बोलते हैं, विविधता का आनंद लेते हैं, और संदर्भ के अनुसार दो अलग-अलग व्यक्ति प्रतीत हो सकते हैं — इसीलिए मिथुन का प्रतीक जुड़वां है।`,
    physical: `सामान्यतः औसत से पतले शरीर के, बोलते समय अभिव्यंजक हाथों और तेज़, सजीव भाव-भंगिमाओं वाले होते हैं। इनकी आंखें और भाव जीवंत होते हैं, जो इनके बेचैन, तेज़ी से चलने वाले मन को दर्शाते हैं।`,
    health: `तंत्रिका तंत्र की संवेदनशीलता, श्वसन संबंधी समस्याएं, और बेचैनी से उत्पन्न थकान सामान्य कमज़ोरियां हैं, क्योंकि मिथुन फेफड़ों, भुजाओं और तंत्रिका तंत्र पर शासन करता है। निरंतर बहु-कार्य से उत्पन्न मानसिक अति-उत्तेजना शारीरिक परिश्रम से अधिक इन्हें थका सकती है। अधिक व्यस्त समय में विशेष रूप से चिंता, अनिद्रा, और श्वास संबंधी समस्याओं पर ध्यान दें।`,
    career: `लेखन, पत्रकारिता, बिक्री, शिक्षण, और संचार-प्रधान किसी भी क्षेत्र के लिए स्वाभाविक रूप से उपयुक्त — इन्हें व्यस्त रहने के लिए विविधता और मानसिक उत्तेजना चाहिए। दोहराव वाला, एकाकी कार्य इन्हें शीघ्र निराश कर देता है।`,
    relationship: `बुद्धिमान और आकर्षक साथी जिन्हें रुचि बनाए रखने के लिए निरंतर मानसिक जुड़ाव और बातचीत चाहिए। ये असंगत या समझ पाना कठिन प्रतीत हो सकते हैं, और ऐसे साथी के साथ सर्वोत्तम रहते हैं जो चीज़ों को बौद्धिक रूप से जीवंत बनाए रखे।`,
    dos: [
      "कार्यों के बीच वास्तविक विश्राम शामिल करें — इस लग्न की थकान शारीरिक से कहीं अधिक मानसिक होती है।",
      "नियमित रूप से लिखें या डायरी बनाएं; यह ऐसे मन को शांत करता है जो अन्यथा बहुत सारे समानांतर विचारों पर चलता है।",
      "दिनचर्या में जान-बूझकर विविधता लाएं, बजाय इसके कि ऊबन इतना बढ़े कि वह विघटनकारी बदलाव मजबूर कर दे।",
    ],
    donts: [
      'वास्तव में पूरी की जा सकने वाली से अधिक एक साथ प्रतिबद्धताएं न लें — अधूरे काम जल्दी जमा हो जाते हैं।',
      'बेचैनी को किसी वास्तव में अच्छे, भले ही कम रोमांचक, अवसर या संबंध से दूर न होने दें।',
      'जिन लोगों को कार्य के साथ निरंतरता देखने की आवश्यकता है उनके साथ केवल शब्दों पर निर्भर न रहें।',
    ],
  },
  Cancer: {
    personality: `कर्क लग्न वाले जातक संवेदनशील, पोषण करने वाले और सुरक्षात्मक होते हैं, अक्सर शांत बाहरी रूप के नीचे गहरी प्रवृत्तियां और भावनाएं छिपी होती हैं। चंद्रमा द्वारा शासित होने के कारण इनके मनोभाव वातावरण के साथ बदलते हैं, और ये घर तथा परिवार से गहरा भावनात्मक लगाव बनाते हैं।`,
    physical: `प्रायः गोल, कोमल रूप, अभिव्यंजक और भावुक आंखें, और ऐसा शरीर जो मनोदशा तथा आहार के साथ अधिकांश की तुलना में अधिक उतार-चढ़ाव करता है। छाती का क्षेत्र (कर्क का अधिकार क्षेत्र) शारीरिक संवेदनशीलता का बिंदु हो सकता है।`,
    health: `पाचन संबंधी समस्याएं, जल प्रतिधारण, और भावनात्मक स्थिति से निकटता से जुड़े तनाव-संबंधी रोग होने की प्रवृत्ति रहती है — इनका शारीरिक स्वास्थ्य अधिकांश राशियों की तुलना में इनके भावनात्मक कल्याण को सीधे प्रतिबिंबित करता है। स्थिर घरेलू वातावरण उतना ही महत्वपूर्ण है जितना आहार। विशेष रूप से एसिडिटी, पेट फूलना, और मनोदशा से जुड़ी भूख के उतार-चढ़ाव पर ध्यान दें।`,
    career: `देखभाल, आतिथ्य, रियल एस्टेट, खाद्य-संबंधी क्षेत्रों, और पोषण या भावनात्मक सहयोग से जुड़े किसी भी कार्य के लिए उपयुक्त। ये उन भूमिकाओं में सर्वोत्तम प्रदर्शन करते हैं जहां वे भावनात्मक रूप से निवेशित महसूस करें, केवल लेन-देन वाली भूमिकाओं में नहीं।`,
    relationship: `एक बार जुड़ जाने पर गहराई से वफादार और सुरक्षात्मक, कर्क लग्न किसी साझेदारी में सबसे ऊपर भावनात्मक सुरक्षा चाहते हैं। आहत होने पर ये अपने खोल में सिमट सकते हैं, और खुलकर सामने आने के लिए इन्हें आश्वासन और गर्मजोशी की आवश्यकता होती है।`,
    dos: [
      "जहां तक संभव हो घरेलू वातावरण को शांत और स्थिर रखें — इस लग्न की भलाई वास्तव में इससे निकटता से जुड़ी है।",
      "चुपचाप पीछे हटने के बजाय किसी विश्वसनीय व्यक्ति से आहत भावनाओं के बारे में बात करें; खोल थोड़े समय के लिए ही मदद करता है।",
      "भावनात्मक रूप से कठिन समय में विशेष रूप से आहार पर ध्यान दें, क्योंकि तनाव सबसे पहले पाचन में दिखाई देता है।",
    ],
    donts: [
      'मनोदशा के उतार-चढ़ाव को लंबे समय तक अनसुलझा न छोड़ें — यह पाचन और नींद की समस्याओं में बदल जाता है।',
      'किसी संबंध में आहत होने पर पूरी तरह पीछे न हटें; यह साथी को अस्वीकृति जैसा लग सकता है जो शायद कारण न जानता हो।',
      'दूसरों के भावनात्मक बोझ को बिना सीमा के अपना न बना लें — पोषण करने की प्रवृत्ति को भी सीमाओं की आवश्यकता है।',
    ],
  },
  Leo: {
    personality: `सिंह लग्न वाले जातक आत्मविश्वासी, अभिव्यंजक और उष्ण होते हैं, स्वाभाविक रूप से ध्यान आकर्षित करते हैं और नेतृत्व की ओर झुकाव रखते हैं। सूर्य द्वारा शासित होने के कारण इनमें सहज करिश्मा और उदार हृदय होता है, हालांकि इनका अभिमान कभी-कभी हठ या पहचान की आवश्यकता में बदल सकता है।`,
    physical: `सामान्यतः प्रभावशाली उपस्थिति रखते हैं — चौड़ी छाती, सीधी मुद्रा, और एक गर्मजोशी भरी, तेजस्वी अभिव्यक्ति जो भीड़ में भी नज़र खींचती है। बाल अक्सर एक उल्लेखनीय विशेषता होते हैं, घने या विशिष्ट।`,
    health: `हृदय और रीढ़ (सिंह के अधिकार क्षेत्र) ध्यान देने योग्य क्षेत्र हैं, साथ ही अति-परिश्रम से तनाव — सिंह राशि वाले पहचान पाने के लिए स्वयं को कठोरता से आगे बढ़ाते हैं। नियमित विश्राम और हृदय-संबंधी देखभाल इनके लिए अधिकांश की तुलना में अधिक महत्वपूर्ण है। विशेष रूप से उच्च रक्तचाप, पीठ में खिंचाव, और अत्यधिक प्रतिबद्धता से थकावट पर ध्यान दें।`,
    career: `नेतृत्व की भूमिकाओं, प्रदर्शन कलाओं, प्रबंधन, और किसी भी सार्वजनिक क्षेत्र के लिए स्वाभाविक रूप से उपयुक्त जहां इनकी उपस्थिति चमक सके। ये पृष्ठभूमि में संघर्ष करते हैं और स्वामित्व तथा दृश्यता दिए जाने पर फलते-फूलते हैं।`,
    relationship: `उदार, वफादार और रोमांटिक, सिंह लग्न भव्यता से प्रेम करते हैं और बदले में प्रशंसा की अपेक्षा रखते हैं। इन्हें ऐसे साथी की आवश्यकता है जो इनकी गर्मजोशी की सराहना कर सके, बिना ध्यान का केंद्र बनने की इनकी आवश्यकता से दबे।`,
    dos: [
      "वास्तविक विश्राम निर्धारित करें, न कि केवल प्रतिबद्धताओं के बीच खाली समय — यहां हृदय और रीढ़ को असली रिकवरी चाहिए।",
      "जान-बूझकर दूसरों को श्रेय और ध्यान दें; इससे कम खर्च होता है और अभिमान से उत्पन्न घर्षण रुक जाता है।",
      "जब नेतृत्व की भूमिका मिले तो उसे लें — इस लग्न का आत्मविश्वास लोगों के सामने एक वास्तविक संपत्ति है, केवल अहम की आवश्यकता नहीं।",
    ],
    donts: [
      'पहचान के पीछे अति-परिश्रम की हद तक न भागें — यहां हृदय संबंधी तनाव वास्तविक है, केवल एक कहावत नहीं।',
      'हठ या आहत अभिमान को किसी संबंध या कार्य विवाद को उसकी आवश्यक सीमा से आगे न रुकने दें।',
      'हर संबंध में ध्यान का केंद्र बनने की आवश्यकता न रखें — साथी के अपने पल भी उतनी ही गर्मजोशी के हकदार हैं।',
    ],
  },
  Virgo: {
    personality: `कन्या लग्न वाले जातक विश्लेषणात्मक, सटीक और सेवा-भावी होते हैं, ऐसे विवरण नोटिस करते हैं जो अन्य लोग चूक जाते हैं। बुध द्वारा शासित होने के कारण ये स्वयं और दूसरों के लिए उच्च मानक रखते हैं, और सुधार तथा परिष्कार की इनकी प्रवृत्ति अनियंत्रित रहने पर अति-आलोचना में बदल सकती है।`,
    physical: `प्रायः सुव्यवस्थित, मध्यम शरीर, कपड़े पहनने और चलने का सावधान, संयत तरीका — कन्या पाचन तंत्र पर शासन करती है, और इनका शरीर आहार के प्रति संवेदनशील हो सकता है। इनकी अभिव्यक्ति सजग और मापी हुई होती है।`,
    health: `पाचन संवेदनशीलता और चिंता-प्रेरित तनाव इस लग्न की क्लासिक कमज़ोरियां हैं — अति-चिंतन और चिंता की इनकी प्रवृत्ति सबसे पहले पेट में प्रकट होती है। एक शांत, संरचित दिनचर्या अधिकांश उपायों से अधिक सहायक है। उच्च-दबाव के समय में विशेष रूप से एसिडिटी, IBS-प्रकार के लक्षण, और तनाव सिरदर्द पर ध्यान दें।`,
    career: `विश्लेषण, स्वास्थ्य सेवा, संपादन, लेखांकन, और सटीकता तथा विवरण पर ध्यान देने वाले किसी भी क्षेत्र में उत्कृष्ट प्रदर्शन करते हैं। ये किसी टीम के भरोसेमंद क्रियान्वयक होते हैं, हालांकि इन्हें काम सौंपने या दूसरों से अपूर्ण कार्य स्वीकार करने में कठिनाई हो सकती है।`,
    relationship: `प्रेम में समर्पित और व्यावहारिक, कन्या लग्न भव्य इशारों के बजाय सेवा के कार्यों से देखभाल दिखाते हैं। इनकी आलोचना करने की प्रवृत्ति को ठंडापन समझ लिया जा सकता है, हालांकि यह सामान्यतः सहायता करने की सच्ची इच्छा से आती है।`,
    dos: [
      "जान-बूझकर एक शांत, संरचित दैनिक दिनचर्या बनाएं — यह किसी भी उपाय से अधिक इस लग्न के पाचन और मन को शांत करती है।",
      "आलोचना के साथ देखभाल की भावना को स्पष्ट रूप से व्यक्त करें, ताकि यह उन लोगों को ठंडापन न लगे जो इस लग्न को अच्छी तरह नहीं जानते।",
      "जान-बूझकर काम सौंपें, भले ही अपूर्ण रूप से किया गया हो — यहां पूर्णतावाद चुपचाप दूसरों से अधिक स्वयं पर बोझ डालता है।",
    ],
    donts: [
      'सोने से पहले या भोजन के दौरान अति-चिंतन को बेलगाम न होने दें — यह यहां सीधे पाचन संबंधी परेशानी के रूप में दिखाई देता है।',
      'जो काम कर रहा है उसे स्वीकार किए बिना आलोचना न करें; यह आदत इच्छा से अधिक कठोर लगती है।',
      'दूसरों को अपना अधूरा काम खुद पूरा करने पर भरोसा करने के बजाय सबका अधूरा काम स्वयं न उठाएं।',
    ],
  },
  Libra: {
    personality: `तुला लग्न वाले जातक कूटनीतिक, संतुलित और संबंध-केंद्रित होते हैं, अधिकांश परिस्थितियों में निष्पक्षता और सामंजस्य चाहते हैं। शुक्र द्वारा शासित होने के कारण इनमें सौंदर्यशास्त्र और सामाजिक शिष्टाचार की परिष्कृत समझ होती है, हालांकि टकराव के प्रति इनकी नापसंदगी अनिर्णय की ओर ले जा सकती है।`,
    physical: `प्रायः सुडौल शरीर, सुखद, सममित विशेषताएं, और एक सुंदर आचरण — तुला गुर्दों और पीठ के निचले हिस्से पर शासन करता है, जो संवेदनशीलता के बिंदु हो सकते हैं। ये अक्सर स्पष्ट देखभाल और रुचि के साथ कपड़े पहनते हैं।`,
    health: `गुर्दे की कार्यक्षमता और पीठ के निचले हिस्से की समस्याएं क्लासिक कमज़ोरियां हैं, साथ ही दीर्घकालिक अनिर्णय या लोगों को प्रसन्न करने के तनाव के स्वास्थ्य प्रभाव। आहार और दिनचर्या में संतुलन इन्हें सूट करता है, इनकी राशि के अपने प्रतीकवाद से मेल खाते हुए। विशेष रूप से गुर्दे/मूत्र संबंधी समस्याओं और खराब मुद्रा या तनाव से पीठ के निचले हिस्से के दर्द पर ध्यान दें।`,
    career: `कानून, कूटनीति, डिज़ाइन, कला, और किसी भी साझेदारी-आधारित क्षेत्र के लिए उपयुक्त जहां निष्पक्षता और सौंदर्यशास्त्र मायने रखते हैं। ये एकल या अत्यधिक प्रतिस्पर्धी वातावरण के बजाय सहयोगात्मक वातावरण में सर्वोत्तम प्रदर्शन करते हैं।`,
    relationship: `रोमांटिक और साझेदारी-उन्मुख लगभग एक दोष की हद तक, तुला लग्न अक्सर स्वयं को अपने संबंधों के माध्यम से परिभाषित करते हैं। ये साथी के साथ संतुलन और सामंजस्य चाहते हैं, और अकेले रहने या एकतरफा निर्णय लेने में संघर्ष कर सकते हैं।`,
    dos: [
      "उन चीज़ों पर स्वयं के लिए निर्णय की समय-सीमा तय करें जिन्हें अंतहीन तौलने की आवश्यकता नहीं है — अनिर्णय ही यहां असली कीमत है।",
      "विशेष रूप से हाइड्रेटेड रहें और मुद्रा का ध्यान रखें, इस लग्न की गुर्दे और पीठ के निचले हिस्से की संवेदनशीलता को देखते हुए।",
      "कभी-कभी जान-बूझकर अकेले रहने में सहजता विकसित करें, ताकि पूरी पहचान संबंध पर निर्भर न रहे।",
    ],
    donts: [
      'केवल अल्पकालिक सामंजस्य बनाए रखने के लिए आवश्यक टकराव से बचें — यह सामान्यतः बाद में बड़ा होकर सामने आता है।',
      'लोगों को प्रसन्न करने के तनाव को चुपचाप न बढ़ने दें; यह यहां किसी बताई गई शिकायत से पहले शारीरिक रूप से दिखाई देता है।',
      'केवल साथी को खुश रखने के लिए स्वयं की लगातार कीमत पर बड़े जीवन निर्णय न लें।',
    ],
  },
  Scorpio: {
    personality: `वृश्चिक लग्न वाले जातक तीव्र, निजी और लचीले होते हैं, सतह पर रहने के बजाय गहराई में जाते हैं। मंगल द्वारा शासित (और परंपरागत रूप से परिवर्तन से जुड़े) होने के कारण इनमें प्रबल इच्छाशक्ति और एक चुंबकीय, कुछ हद तक रहस्यमय उपस्थिति होती है जिसे अन्य तुरंत नोटिस करते हैं।`,
    physical: `प्रायः तीक्ष्ण, गहरी आंखें और आराम के समय भी एक मज़बूत, चुंबकीय उपस्थिति होती है — वृश्चिक प्रजनन और उत्सर्जन तंत्र पर शासन करता है। इनकी अभिव्यक्ति बहुत कम प्रकट करती है, जो इनके रहस्य को और बढ़ाती है।`,
    health: `प्रजनन और उत्सर्जन तंत्र का स्वास्थ्य, साथ ही दबी हुई भावना से तनाव, क्लासिक चिंताएं हैं — वृश्चिक राशि वाले कठिनाई व्यक्त करने के बजाय उसे आंतरिक रूप से समाहित करते हैं। भावनात्मक मुक्ति के साधन इनके लिए अधिकांश से अधिक मायने रखते हैं। विशेष रूप से नियमित प्रजनन-स्वास्थ्य जांच और तनाव जो दिखाई देने वाले लक्षणों के बजाय तनाव के रूप में प्रकट होता है, पर ध्यान दें।`,
    career: `अनुसंधान, जांच, मनोविज्ञान, शल्य चिकित्सा, वित्त, और गहराई तथा वह सामना करने की इच्छा चाहने वाले किसी भी क्षेत्र के लिए उपयुक्त जिससे अन्य बचते हैं। ये वहां उत्कृष्ट होते हैं जहां विवेक और दबाव में लचीलापन मूल्यवान हो।`,
    relationship: `गहराई से वफादार और जुनूनी लेकिन सतर्क, वृश्चिक लग्न पूरी तरह प्रतिबद्ध होने से पहले विश्वास की परीक्षा लेते हैं, और वही तीव्रता अपेक्षा रखते हैं जो वे स्वयं प्रदान करते हैं। विश्वासघात शायद ही कभी क्षमा किया जाता है, लेकिन सच्ची वफादारी कई गुना लौटाई जाती है।`,
    dos: [
      "भावनात्मक मुक्ति के लिए वास्तविक साधन खोजें — शारीरिक गतिविधि, विश्वसनीय बातचीत, यहां तक कि लेखन — बजाय सब कुछ आंतरिक रूप से समाहित करने के।",
      "बिना दिखाई देने वाले लक्षणों के भी नियमित स्वास्थ्य जांच कराएं, क्योंकि यह लग्न समस्याओं को देर से नोटिस करता है।",
      "जिन लोगों ने स्पष्ट रूप से इसे अर्जित किया है उनके साथ धीरे-धीरे विश्वास बनने दें, अनिश्चित काल तक परीक्षा लेने के बजाय।",
    ],
    donts: [
      'कठिनाई को तब तक न दबाएं जब तक यह स्वास्थ्य समस्या न बन जाए — यहां आंतरिकीकरण की आदत की वास्तविक शारीरिक कीमत है।',
      'एक विश्वासघात को हर नए व्यक्ति के प्रति स्थायी सतर्कता में सामान्यीकृत न करें।',
      'किसी संबंध में गुप्तता को डिफ़ॉल्ट न बनाएं जहां वास्तविक पारदर्शिता सतर्कता को तेज़ी से हल कर देगी।',
    ],
  },
  Sagittarius: {
    personality: `धनु लग्न वाले जातक आशावादी, स्वतंत्र और दार्शनिक होते हैं, विकास और अन्वेषण की ओर आकर्षित होते हैं। गुरु द्वारा शासित होने के कारण इनका दृष्टिकोण विस्तृत और बड़ी तस्वीर वाला होता है, तथा स्वतंत्रता की एक बेचैन आवश्यकता होती है जो किसी भी बंधनकारी चीज़ का विरोध करती है।`,
    physical: `प्रायः लंबे या लंबे अंगों वाले, ऊर्जावान, आगे झुककर चलने वाले होते हैं — धनु कूल्हों और जांघों पर शासन करता है, इनकी सक्रिय जीवनशैली से मामूली खिंचाव का एक सामान्य क्षेत्र। इनकी अभिव्यक्ति खुली और उत्साही होती है।`,
    health: `कूल्हे और जांघ की चोटें, साथ ही अति-भोग से समस्याएं (गुरु की विस्तृत प्रवृत्तियां भोजन और पेय तक बढ़ सकती हैं), क्लासिक कमज़ोरियां हैं। एक सक्रिय, विविध दिनचर्या शरीर और बेचैन मन दोनों को संतुष्ट रखती है। अच्छे समय में विशेष रूप से अति-परिश्रम से कूल्हे/जोड़ों में खिंचाव और अति-भोग से वज़न बढ़ने पर ध्यान दें।`,
    career: `शिक्षण, यात्रा, प्रकाशन, कानून, और दर्शनशास्त्र में फलते-फूलते हैं — कोई भी क्षेत्र जहां विचारों को खोजने और एक डेस्क या कार्य तक सीमित रहने के बजाय आगे बढ़ने की जगह हो। कठोर पदानुक्रम इन्हें शीघ्र निराश करते हैं।`,
    relationship: `उष्ण और उत्साही लेकिन स्वतंत्रता-प्रिय, धनु लग्न को ऐसे साथी की आवश्यकता है जो इनकी स्वतंत्रता से खतरा महसूस न करे। ईमानदारी (कभी-कभी स्पष्ट) और साझा साहसिक कार्य इनके लिए स्नेह के नियमित प्रदर्शनों से अधिक मायने रखते हैं।`,
    dos: [
      "जान-बूझकर एक सक्रिय, विविध दिनचर्या बनाए रखें — यहां शरीर और मन दोनों को वास्तव में विविधता चाहिए, केवल पसंद नहीं।",
      "सहज प्रवृत्ति से थोड़ी अधिक चतुराई के साथ ईमानदार बात कहें; सार वही रह सकता है, केवल प्रस्तुति को नरम करने की आवश्यकता है।",
      "साथी को स्वतंत्रता के बारे में स्पष्ट आश्वासन दें, बजाय यह मान लेने के कि वे बस स्थान की आवश्यकता समझ जाएंगे।",
    ],
    donts: [
      'अच्छे समय के दौरान अति-भोग को बेलगाम न होने दें — यहां वज़न और जोड़ों में खिंचाव चुपचाप बढ़ते हैं।',
      'जब क्षण वास्तव में कहने के तरीके में अधिक देखभाल की मांग करे तो स्पष्टवादिता को ईमानदारी न समझें।',
      'स्वतंत्रता की बेचैन आवश्यकता जितना वास्तव में दीर्घकाल में सहन कर सके उससे अधिक प्रतिबद्धताएं न लें।',
    ],
  },
  Capricorn: {
    personality: `मकर लग्न वाले जातक अनुशासित, महत्वाकांक्षी और व्यावहारिक होते हैं, त्वरित जीत के बजाय ऐसी चीज़ें बनाते हैं जो टिकाऊ हों। शनि द्वारा शासित होने के कारण इनमें एक स्वाभाविक गंभीरता और जिम्मेदारी की भावना होती है, कभी-कभी अपनी आयु से अधिक बड़े या संयमित प्रतीत होते हैं।`,
    physical: `प्रायः दुबली, हड्डीदार संरचना, मज़बूत अस्थि घनत्व, और संयत, संकोची आचरण — शनि का प्रभाव घुटनों, जोड़ों और त्वचा में दिखाई देता है। इनकी उपस्थिति दिखावटी होने के बजाय संयत होती है।`,
    health: `जोड़ों, हड्डियों और घुटनों की समस्याएं इस लग्न की क्लासिक कमज़ोरियां हैं, साथ ही निरंतर आत्म-अनुशासन से तनाव-संबंधी स्थितियां। विश्राम इनके लिए स्वाभाविक रूप से नहीं आता, लेकिन यही इनके शनि-शासित शरीर को सबसे अधिक चाहिए। विशेष रूप से जोड़ों के दर्द, त्वचा की समस्याओं, और अल्प-विश्राम आत्म-अनुशासन से दीर्घकालिक थकान पर ध्यान दें।`,
    career: `प्रबंधन, सरकार, इंजीनियरिंग, और दीर्घकालिक संरचना-निर्माण तथा धैर्य को पुरस्कृत करने वाले किसी भी क्षेत्र में उत्कृष्ट प्रदर्शन करते हैं। ये धीरे लेकिन स्थिर रूप से ऊपर उठते हैं, और जिम्मेदारी को गंभीरता से लेने के कारण ही इन पर भरोसा किया जाता है।`,
    relationship: `संकोची और खुलने में धीमे, लेकिन एक बार खुलने पर गहराई से प्रतिबद्ध, मकर लग्न भव्य रोमांटिक प्रदर्शन के बजाय निरंतरता और विश्वसनीयता के माध्यम से प्रेम दिखाते हैं। ये ऐसे साथी को महत्व देते हैं जो इनकी संरचना और स्वतंत्रता की आवश्यकता का सम्मान करे।`,
    dos: [
      "काम जितनी ही जान-बूझकर विश्राम भी निर्धारित करें — इस लग्न के शनि-शासित शरीर को इसकी सबसे अधिक आवश्यकता है ठीक इसलिए क्योंकि यह इसे लेने से बचता है।",
      "सहज प्रवृत्ति से पहले ही किसी प्रतिबद्ध साथी के सामने खुलें; यहां संकोच अक्सर गहराई के बजाय दूरी जैसा लगता है।",
      "जो टिकाऊ हो उस गति से जिम्मेदारी लें, न कि जो भी मिले उसे — यहां उठान स्थिर होनी चाहिए, निरंतर नहीं।",
    ],
    donts: [
      'अनुशासन के प्रतीक के रूप में थकान से न जूझें — यहां जोड़ों और हड्डियों में खिंचाव वर्षों में चुपचाप बढ़ता है।',
      'किसी संबंध में गर्मजोशी की जगह पूरी तरह निरंतरता को न लेने दें; दोनों की आवश्यकता है, एक के बजाय दूसरा नहीं।',
      'केवल इसलिए हर उपलब्ध जिम्मेदारी न लें कि आप पर भरोसा किया गया है — अधिभार धीरे-धीरे बनता है और लंबे समय तक रहता है।',
    ],
  },
  Aquarius: {
    personality: `कुंभ लग्न वाले जातक स्वतंत्र, मौलिक और विचार-प्रेरित होते हैं, अक्सर भीड़ से आगे सोचते हैं। शनि द्वारा शासित (आधुनिक संबंध यूरेनस से) होने के कारण ये परंपरा से अधिक बौद्धिक स्वतंत्रता और सामाजिक उद्देश्यों को महत्व देते हैं, और गहराई से परवाह करते हुए भी अलग-थलग प्रतीत हो सकते हैं।`,
    physical: `प्रायः विशिष्ट, अपरंपरागत रूप, दुबला शरीर, और शांत, सजग आंखें — कुंभ पिंडलियों और टखनों पर शासन करता है, खिंचाव का एक सामान्य मामूली बिंदु। इनकी समग्र उपस्थिति संयत लेकिन यादगार होती है।`,
    health: `परिसंचरण संबंधी समस्याएं और टखने या निचले पैर में खिंचाव क्लासिक कमज़ोरियां हैं, साथ ही अति-चिंतन या भावनात्मक अलगाव से तनाव। सामाजिक रूप से जुड़े रहना इनके कल्याण के लिए किसी भी शारीरिक उपाय जितना ही मायने रखता है। अलग-थलग रहने के समय में विशेष रूप से परिसंचरण समस्याओं और अलगाव-प्रेरित उदासी पर ध्यान दें।`,
    career: `प्रौद्योगिकी, विज्ञान, सामाजिक सुधार, और परंपरा से अधिक मौलिक सोच को पुरस्कृत करने वाले किसी भी क्षेत्र के लिए उपयुक्त। इन्हें कठोर पदानुक्रम पसंद नहीं, और वहां सर्वोत्तम प्रदर्शन करते हैं जहां इनके विचारों को परिणाम आकार देने की वास्तविक जगह मिले।`,
    relationship: `अपने ही अपरंपरागत तरीके से वफादार, कुंभ लग्न को निरंतर भावनात्मक प्रदर्शन से अधिक किसी संबंध में बौद्धिक जुड़ाव और स्वतंत्रता चाहिए। जो साथी इनकी स्थान की आवश्यकता का सम्मान करते हैं वे इनकी सबसे गहरी वफादारी पाते हैं।`,
    dos: [
      "जान-बूझकर सामाजिक रूप से जुड़े रहें, भले ही संक्षेप में — यहां अलगाव मनोदशा को इस लग्न की अपेक्षा से अधिक प्रभावित करता है।",
      "कभी-कभी देखभाल की भावना को स्पष्ट रूप से व्यक्त करें; अलगाव को अक्सर दूसरों द्वारा उदासीनता समझ लिया जाता है।",
      "परिसंचरण को समर्थन देने के लिए नियमित रूप से चलें, क्योंकि इस लग्न की गतिहीन प्रवृत्ति एक वास्तविक शारीरिक कमज़ोरी को बढ़ाती है।",
    ],
    donts: [
      'अति-चिंतन के समय लंबे समय तक पीछे न हटें — यह उस अलगाव को बढ़ाता है जो मनोदशा को और बिगाड़ता है।',
      'यह न मान लें कि साथी बिना कभी सीधे बताए अलगाव के नीचे की वफादारी को समझ लेगा।',
      'परंपरा को इतनी सहज प्रतिक्रिया से न ठुकराएं कि वास्तव में उपयोगी संरचना भी अनावश्यक हिस्सों के साथ अस्वीकृत हो जाए।',
    ],
  },
  Pisces: {
    personality: `मीन लग्न वाले जातक कल्पनाशील, सहानुभूतिपूर्ण और सहज-ज्ञानी होते हैं, अपने आसपास की चीज़ों को अधिकांश की तुलना में अधिक महसूस और आत्मसात करते हैं। गुरु द्वारा शासित (आधुनिक संबंध नेप्च्यून से) होने के कारण इनमें एक स्वप्निल, दयालु स्वभाव और कला, आध्यात्म, या पलायनवाद की ओर प्रबल आकर्षण होता है।`,
    physical: `प्रायः कोमल, अभिव्यंजक विशेषताएं और ऐसी आंखें जो दूर की गहराई रखती प्रतीत होती हैं — मीन पैरों पर शासन करता है, मामूली संवेदनशीलता का एक सामान्य क्षेत्र। इनकी उपस्थिति कोमल और आसपास के वातावरण से आसानी से प्रभावित महसूस होती है।`,
    health: `पैरों से संबंधित समस्याएं और दूसरों के तनाव को भावनात्मक रूप से आत्मसात करने की प्रवृत्ति क्लासिक कमज़ोरियां हैं — मीन राशि के जातकों को अक्सर उतनी अकेली अवधि की आवश्यकता होती है जितनी वे स्वयं महसूस नहीं करते। स्पष्ट सीमाएं शारीरिक देखभाल जितनी ही मायने रखती हैं। विशेष रूप से पैरों की समस्याओं और दूसरों की मनोदशा को आत्मसात करने से भावनात्मक थकावट पर ध्यान दें।`,
    career: `कला, चिकित्सा व्यवसायों, आध्यात्म, और किसी भी ऐसे क्षेत्र में फलते-फूलते हैं जहां सहानुभूति और कल्पना देनदारी के बजाय संपत्ति हों। अत्यधिक कठोर, आंकड़ों से संचालित वातावरण इन्हें शीघ्र निचोड़ देते हैं।`,
    relationship: `प्रेम में गहराई से रोमांटिक और आत्म-त्यागी, मीन लग्न किसी साथी को आदर्श बना सकते हैं या सावधान न रहने पर किसी संबंध में स्वयं को खो सकते हैं। इन्हें ऐसे साथी की आवश्यकता है जो इनकी देने वाली प्रकृति का लाभ उठाए बिना इनकी संवेदनशीलता का सम्मान करे।`,
    dos: [
      "जान-बूझकर स्पष्ट भावनात्मक सीमाएं तय करें — यह लग्न क्षण में एहसास होने से अधिक दूसरों का तनाव आत्मसात करता है।",
      "वास्तविक अकेला समय निर्धारित करें, भले ही यह तुरंत आवश्यक न लगे; आवश्यकता बाद में थकावट के रूप में दिखाई देती है।",
      "कल्पना के साथ एक ज़मीनी अभ्यास (एक दिनचर्या, एक शिल्प, कुछ ठोस) बनाए रखें, ताकि पलायनवाद की एक सीमा हो।",
    ],
    donts: [
      'किसी साथी को इतना आदर्श न बनाएं कि उन्हें स्पष्ट रूप से देखना बंद हो जाए — यहां इस लग्न का रोमांटिकवाद वास्तविकता से आगे निकल सकता है।',
      'बिना सीमा के दूसरों का भावनात्मक बोझ न उठाएं; देने के टिकाऊ बने रहने के लिए एक सीमा चाहिए।',
      'तनाव के स्रोत को संबोधित करने के बजाय पलायनवाद (वास्तविक या भावनात्मक) को डिफ़ॉल्ट प्रतिक्रिया न बनाएं।',
    ],
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
  dos: string[];
  donts: string[];
}

export function buildAscendantPredictions(ascendantRashi: string, language: 'en' | 'hi' = 'en'): AscendantPredictions {
  const profile = (language === 'hi' ? PROFILES_HI : PROFILES)[ascendantRashi];
  return {
    ascendant: ascendantRashi,
    description: language === 'hi' ? DESCRIPTION_HI : DESCRIPTION,
    personality: profile?.personality ?? '',
    physical: profile?.physical ?? '',
    health: profile?.health ?? '',
    career: profile?.career ?? '',
    relationship: profile?.relationship ?? '',
    dos: profile?.dos ?? [],
    donts: profile?.donts ?? [],
  };
}
