// Ascendant (Lagna) predictions broken into the standard categories a full
// Vedic report covers — Personality, Physical, Health, Career, Relationship
// — one classical, sign-level profile per Ascendant (not house-specific,
// same scope as the "Ascendant Predictions" section of a typical commercial
// report). The description paragraph is generic by design (it explains what
// an Ascendant is, not what this one specifically means) — this app's own
// reference report format keeps that paragraph identical across signs too.
const DESCRIPTION = `Your Ascendant (Lagna) is the zodiac sign that was rising on the eastern horizon at your exact moment and place of birth. It is one of the most personal points in a chart — unlike your Moon or Sun sign, which shift only monthly or yearly, the Ascendant is precise to the minute and place of birth, and it colors your outward personality, physical presence, and the lens through which the rest of your chart plays out.`;

const DESCRIPTION_HI = `आपका लग्न (Ascendant) वह राशि है जो आपके जन्म के ठीक समय और स्थान पर पूर्वी क्षितिज पर उदय हो रही थी। यह कुंडली के सबसे व्यक्तिगत बिंदुओं में से एक है — आपकी चंद्र या सूर्य राशि के विपरीत, जो केवल महीने या वर्ष भर में बदलती हैं, लग्न जन्म के मिनट और स्थान तक सटीक होता है, और यही आपके बाहरी व्यक्तित्व, शारीरिक उपस्थिति, और उस दृष्टिकोण को रंग देता है जिससे आपकी शेष कुंडली पढ़ी जाती है।`;

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

const PROFILES_HI: Record<string, AscendantProfile> = {
  Aries: {
    personality: `मेष लग्न वाले जातक साहसी, स्पष्टवादी और शीघ्र कार्य करने वाले होते हैं, अक्सर सोच-विचार से अधिक ऊर्जा और पहल के साथ आगे बढ़ते हैं। मंगल द्वारा शासित होने के कारण ये स्वाभाविक रूप से स्वयं आरंभ करने वाले होते हैं जिन्हें इंतज़ार करना पसंद नहीं, और इनका उत्साह संक्रामक होता है भले ही इनकी अधीरता कभी-कभी झलक जाए।`,
    physical: `सामान्यतः मध्यम कद-काठी, ऊर्जावान उपस्थिति और विशिष्ट सिर या चेहरे वाले होते हैं — मंगल सिर पर शासन करता है, इसलिए सिरदर्द या चेहरे पर निशान सामान्य हैं। इनकी चाल तेज़ और उद्देश्यपूर्ण होती है, जो इनकी बेचैन आंतरिक प्रेरणा से मेल खाती है।`,
    health: `आवेग के कारण छोटी-मोटी चोटें, सिरदर्द, और शरीर में अत्यधिक गर्मी से जुड़ी समस्याएं (मंगल एक उग्र, तप्त ग्रह है) होने की संभावना रहती है। इनकी उच्च ऊर्जा के लिए नियमित शारीरिक निकास — खेल, व्यायाम — शरीर और स्वभाव दोनों को संतुलित रखने में सहायक है।`,
    career: `पहल और साहस को पुरस्कृत करने वाली भूमिकाओं में फलते-फूलते हैं: उद्यमिता, सेना, खेल, इंजीनियरिंग, या कोई भी क्षेत्र जहां ये अनुसरण करने के बजाय नेतृत्व कर सकें। धीमी गति वाले, अत्यधिक नौकरशाही वातावरण में इनका प्रदर्शन कमज़ोर रहता है।`,
    relationship: `प्रेम में जुनूनी और स्पष्टवादी, मेष लग्न बिना अधिक हिचकिचाहट के वही पाना चाहते हैं जो वे चाहते हैं। इन्हें ऐसे साथी की आवश्यकता होती है जो इनकी ऊर्जा का मुकाबला कर सके और इन्हें नेतृत्व करने की जगह दे, और यदि इनकी स्पष्टवादिता को धैर्य से न लिया जाए तो घर्षण हो सकता है।`,
  },
  Taurus: {
    personality: `वृषभ लग्न वाले जातक स्थिर, धैर्यवान और व्यावहारिक होते हैं, आवेगपूर्ण बदलाव के बजाय आराम, स्थिरता और निरंतरता को महत्व देते हैं। शुक्र द्वारा शासित होने के कारण इनमें सौंदर्य और गुणवत्ता की स्वाभाविक समझ होती है, और एक बार प्रतिबद्ध होने पर ये शायद ही कभी पीछे हटते हैं।`,
    physical: `प्रायः मज़बूत और सुगठित शरीर, मज़बूत गर्दन और गले का क्षेत्र (वृषभ इस क्षेत्र पर शासन करता है), सुखद विशेषताएं, और शांत, बिना जल्दबाज़ी वाला आचरण होता है। यदि आराम का प्रेम भोग-विलास में बदल जाए तो वज़न बढ़ना आसान हो सकता है।`,
    health: `गले, थायरॉइड और गर्दन से संबंधित समस्याओं के प्रति संवेदनशील होते हैं, और यदि स्वादिष्ट भोजन तथा आराम के प्रति इनका लगाव सक्रियता से संतुलित न हो तो सुस्ती की समस्या हो सकती है। अचानक जीवनशैली में बदलाव की तुलना में एक स्थिर दिनचर्या इनके लिए कहीं अधिक उपयुक्त है।`,
    career: `वित्त, कृषि, विलासिता की वस्तुओं, कला, और धैर्य तथा विश्वसनीयता को पुरस्कृत करने वाले किसी भी क्षेत्र में उत्कृष्ट प्रदर्शन करते हैं। ये सट्टे के बजाय धीरे-धीरे और स्थिर रूप से धन अर्जित करते हैं, और भरोसेमंद दीर्घकालिक योगदानकर्ता के रूप में मूल्यवान माने जाते हैं।`,
    relationship: `एक बार स्थिर हो जाने पर वफादार, कामुक और प्रतिबद्ध, वृषभ लग्न संबंधों को गंभीरता से लेते हैं और अस्थिरता पसंद नहीं करते। ये किसी साझेदारी में स्वामित्व की भावना या परिवर्तन के प्रति प्रतिरोधी हो सकते हैं, लेकिन बदले में गहरी, भरोसेमंद निष्ठा प्रदान करते हैं।`,
  },
  Gemini: {
    personality: `मिथुन लग्न वाले जातक जिज्ञासु, संवादप्रिय और अनुकूलनशील होते हैं, संसार को शीघ्रता से ग्रहण और संसाधित करते हैं। बुध द्वारा शासित होने के कारण ये तेज़ी से सोचते और बोलते हैं, विविधता का आनंद लेते हैं, और संदर्भ के अनुसार दो अलग-अलग व्यक्ति प्रतीत हो सकते हैं — इसीलिए मिथुन का प्रतीक जुड़वां है।`,
    physical: `सामान्यतः औसत से पतले शरीर के, बोलते समय अभिव्यंजक हाथों और तेज़, सजीव भाव-भंगिमाओं वाले होते हैं। इनकी आंखें और भाव जीवंत होते हैं, जो इनके बेचैन, तेज़ी से चलने वाले मन को दर्शाते हैं।`,
    health: `तंत्रिका तंत्र की संवेदनशीलता, श्वसन संबंधी समस्याएं, और बेचैनी से उत्पन्न थकान सामान्य कमज़ोरियां हैं, क्योंकि मिथुन फेफड़ों, भुजाओं और तंत्रिका तंत्र पर शासन करता है। निरंतर बहु-कार्य से उत्पन्न मानसिक अति-उत्तेजना शारीरिक परिश्रम से अधिक इन्हें थका सकती है।`,
    career: `लेखन, पत्रकारिता, बिक्री, शिक्षण, और संचार-प्रधान किसी भी क्षेत्र के लिए स्वाभाविक रूप से उपयुक्त — इन्हें व्यस्त रहने के लिए विविधता और मानसिक उत्तेजना चाहिए। दोहराव वाला, एकाकी कार्य इन्हें शीघ्र निराश कर देता है।`,
    relationship: `बुद्धिमान और आकर्षक साथी जिन्हें रुचि बनाए रखने के लिए निरंतर मानसिक जुड़ाव और बातचीत चाहिए। ये असंगत या समझ पाना कठिन प्रतीत हो सकते हैं, और ऐसे साथी के साथ सर्वोत्तम रहते हैं जो चीज़ों को बौद्धिक रूप से जीवंत बनाए रखे।`,
  },
  Cancer: {
    personality: `कर्क लग्न वाले जातक संवेदनशील, पोषण करने वाले और सुरक्षात्मक होते हैं, अक्सर शांत बाहरी रूप के नीचे गहरी प्रवृत्तियां और भावनाएं छिपी होती हैं। चंद्रमा द्वारा शासित होने के कारण इनके मनोभाव वातावरण के साथ बदलते हैं, और ये घर तथा परिवार से गहरा भावनात्मक लगाव बनाते हैं।`,
    physical: `प्रायः गोल, कोमल रूप, अभिव्यंजक और भावुक आंखें, और ऐसा शरीर जो मनोदशा तथा आहार के साथ अधिकांश की तुलना में अधिक उतार-चढ़ाव करता है। छाती का क्षेत्र (कर्क का अधिकार क्षेत्र) शारीरिक संवेदनशीलता का बिंदु हो सकता है।`,
    health: `पाचन संबंधी समस्याएं, जल प्रतिधारण, और भावनात्मक स्थिति से निकटता से जुड़े तनाव-संबंधी रोग होने की प्रवृत्ति रहती है — इनका शारीरिक स्वास्थ्य अधिकांश राशियों की तुलना में इनके भावनात्मक कल्याण को सीधे प्रतिबिंबित करता है। स्थिर घरेलू वातावरण उतना ही महत्वपूर्ण है जितना आहार।`,
    career: `देखभाल, आतिथ्य, रियल एस्टेट, खाद्य-संबंधी क्षेत्रों, और पोषण या भावनात्मक सहयोग से जुड़े किसी भी कार्य के लिए उपयुक्त। ये उन भूमिकाओं में सर्वोत्तम प्रदर्शन करते हैं जहां वे भावनात्मक रूप से निवेशित महसूस करें, केवल लेन-देन वाली भूमिकाओं में नहीं।`,
    relationship: `एक बार जुड़ जाने पर गहराई से वफादार और सुरक्षात्मक, कर्क लग्न किसी साझेदारी में सबसे ऊपर भावनात्मक सुरक्षा चाहते हैं। आहत होने पर ये अपने खोल में सिमट सकते हैं, और खुलकर सामने आने के लिए इन्हें आश्वासन और गर्मजोशी की आवश्यकता होती है।`,
  },
  Leo: {
    personality: `सिंह लग्न वाले जातक आत्मविश्वासी, अभिव्यंजक और उष्ण होते हैं, स्वाभाविक रूप से ध्यान आकर्षित करते हैं और नेतृत्व की ओर झुकाव रखते हैं। सूर्य द्वारा शासित होने के कारण इनमें सहज करिश्मा और उदार हृदय होता है, हालांकि इनका अभिमान कभी-कभी हठ या पहचान की आवश्यकता में बदल सकता है।`,
    physical: `सामान्यतः प्रभावशाली उपस्थिति रखते हैं — चौड़ी छाती, सीधी मुद्रा, और एक गर्मजोशी भरी, तेजस्वी अभिव्यक्ति जो भीड़ में भी नज़र खींचती है। बाल अक्सर एक उल्लेखनीय विशेषता होते हैं, घने या विशिष्ट।`,
    health: `हृदय और रीढ़ (सिंह के अधिकार क्षेत्र) ध्यान देने योग्य क्षेत्र हैं, साथ ही अति-परिश्रम से तनाव — सिंह राशि वाले पहचान पाने के लिए स्वयं को कठोरता से आगे बढ़ाते हैं। नियमित विश्राम और हृदय-संबंधी देखभाल इनके लिए अधिकांश की तुलना में अधिक महत्वपूर्ण है।`,
    career: `नेतृत्व की भूमिकाओं, प्रदर्शन कलाओं, प्रबंधन, और किसी भी सार्वजनिक क्षेत्र के लिए स्वाभाविक रूप से उपयुक्त जहां इनकी उपस्थिति चमक सके। ये पृष्ठभूमि में संघर्ष करते हैं और स्वामित्व तथा दृश्यता दिए जाने पर फलते-फूलते हैं।`,
    relationship: `उदार, वफादार और रोमांटिक, सिंह लग्न भव्यता से प्रेम करते हैं और बदले में प्रशंसा की अपेक्षा रखते हैं। इन्हें ऐसे साथी की आवश्यकता है जो इनकी गर्मजोशी की सराहना कर सके, बिना ध्यान का केंद्र बनने की इनकी आवश्यकता से दबे।`,
  },
  Virgo: {
    personality: `कन्या लग्न वाले जातक विश्लेषणात्मक, सटीक और सेवा-भावी होते हैं, ऐसे विवरण नोटिस करते हैं जो अन्य लोग चूक जाते हैं। बुध द्वारा शासित होने के कारण ये स्वयं और दूसरों के लिए उच्च मानक रखते हैं, और सुधार तथा परिष्कार की इनकी प्रवृत्ति अनियंत्रित रहने पर अति-आलोचना में बदल सकती है।`,
    physical: `प्रायः सुव्यवस्थित, मध्यम शरीर, कपड़े पहनने और चलने का सावधान, संयत तरीका — कन्या पाचन तंत्र पर शासन करती है, और इनका शरीर आहार के प्रति संवेदनशील हो सकता है। इनकी अभिव्यक्ति सजग और मापी हुई होती है।`,
    health: `पाचन संवेदनशीलता और चिंता-प्रेरित तनाव इस लग्न की क्लासिक कमज़ोरियां हैं — अति-चिंतन और चिंता की इनकी प्रवृत्ति सबसे पहले पेट में प्रकट होती है। एक शांत, संरचित दिनचर्या अधिकांश उपायों से अधिक सहायक है।`,
    career: `विश्लेषण, स्वास्थ्य सेवा, संपादन, लेखांकन, और सटीकता तथा विवरण पर ध्यान देने वाले किसी भी क्षेत्र में उत्कृष्ट प्रदर्शन करते हैं। ये किसी टीम के भरोसेमंद क्रियान्वयक होते हैं, हालांकि इन्हें काम सौंपने या दूसरों से अपूर्ण कार्य स्वीकार करने में कठिनाई हो सकती है।`,
    relationship: `प्रेम में समर्पित और व्यावहारिक, कन्या लग्न भव्य इशारों के बजाय सेवा के कार्यों से देखभाल दिखाते हैं। इनकी आलोचना करने की प्रवृत्ति को ठंडापन समझ लिया जा सकता है, हालांकि यह सामान्यतः सहायता करने की सच्ची इच्छा से आती है।`,
  },
  Libra: {
    personality: `तुला लग्न वाले जातक कूटनीतिक, संतुलित और संबंध-केंद्रित होते हैं, अधिकांश परिस्थितियों में निष्पक्षता और सामंजस्य चाहते हैं। शुक्र द्वारा शासित होने के कारण इनमें सौंदर्यशास्त्र और सामाजिक शिष्टाचार की परिष्कृत समझ होती है, हालांकि टकराव के प्रति इनकी नापसंदगी अनिर्णय की ओर ले जा सकती है।`,
    physical: `प्रायः सुडौल शरीर, सुखद, सममित विशेषताएं, और एक सुंदर आचरण — तुला गुर्दों और पीठ के निचले हिस्से पर शासन करता है, जो संवेदनशीलता के बिंदु हो सकते हैं। ये अक्सर स्पष्ट देखभाल और रुचि के साथ कपड़े पहनते हैं।`,
    health: `गुर्दे की कार्यक्षमता और पीठ के निचले हिस्से की समस्याएं क्लासिक कमज़ोरियां हैं, साथ ही दीर्घकालिक अनिर्णय या लोगों को प्रसन्न करने के तनाव के स्वास्थ्य प्रभाव। आहार और दिनचर्या में संतुलन इन्हें सूट करता है, इनकी राशि के अपने प्रतीकवाद से मेल खाते हुए।`,
    career: `कानून, कूटनीति, डिज़ाइन, कला, और किसी भी साझेदारी-आधारित क्षेत्र के लिए उपयुक्त जहां निष्पक्षता और सौंदर्यशास्त्र मायने रखते हैं। ये एकल या अत्यधिक प्रतिस्पर्धी वातावरण के बजाय सहयोगात्मक वातावरण में सर्वोत्तम प्रदर्शन करते हैं।`,
    relationship: `रोमांटिक और साझेदारी-उन्मुख लगभग एक दोष की हद तक, तुला लग्न अक्सर स्वयं को अपने संबंधों के माध्यम से परिभाषित करते हैं। ये साथी के साथ संतुलन और सामंजस्य चाहते हैं, और अकेले रहने या एकतरफा निर्णय लेने में संघर्ष कर सकते हैं।`,
  },
  Scorpio: {
    personality: `वृश्चिक लग्न वाले जातक तीव्र, निजी और लचीले होते हैं, सतह पर रहने के बजाय गहराई में जाते हैं। मंगल द्वारा शासित (और परंपरागत रूप से परिवर्तन से जुड़े) होने के कारण इनमें प्रबल इच्छाशक्ति और एक चुंबकीय, कुछ हद तक रहस्यमय उपस्थिति होती है जिसे अन्य तुरंत नोटिस करते हैं।`,
    physical: `प्रायः तीक्ष्ण, गहरी आंखें और आराम के समय भी एक मज़बूत, चुंबकीय उपस्थिति होती है — वृश्चिक प्रजनन और उत्सर्जन तंत्र पर शासन करता है। इनकी अभिव्यक्ति बहुत कम प्रकट करती है, जो इनके रहस्य को और बढ़ाती है।`,
    health: `प्रजनन और उत्सर्जन तंत्र का स्वास्थ्य, साथ ही दबी हुई भावना से तनाव, क्लासिक चिंताएं हैं — वृश्चिक राशि वाले कठिनाई व्यक्त करने के बजाय उसे आंतरिक रूप से समाहित करते हैं। भावनात्मक मुक्ति के साधन इनके लिए अधिकांश से अधिक मायने रखते हैं।`,
    career: `अनुसंधान, जांच, मनोविज्ञान, शल्य चिकित्सा, वित्त, और गहराई तथा वह सामना करने की इच्छा चाहने वाले किसी भी क्षेत्र के लिए उपयुक्त जिससे अन्य बचते हैं। ये वहां उत्कृष्ट होते हैं जहां विवेक और दबाव में लचीलापन मूल्यवान हो।`,
    relationship: `गहराई से वफादार और जुनूनी लेकिन सतर्क, वृश्चिक लग्न पूरी तरह प्रतिबद्ध होने से पहले विश्वास की परीक्षा लेते हैं, और वही तीव्रता अपेक्षा रखते हैं जो वे स्वयं प्रदान करते हैं। विश्वासघात शायद ही कभी क्षमा किया जाता है, लेकिन सच्ची वफादारी कई गुना लौटाई जाती है।`,
  },
  Sagittarius: {
    personality: `धनु लग्न वाले जातक आशावादी, स्वतंत्र और दार्शनिक होते हैं, विकास और अन्वेषण की ओर आकर्षित होते हैं। गुरु द्वारा शासित होने के कारण इनका दृष्टिकोण विस्तृत और बड़ी तस्वीर वाला होता है, तथा स्वतंत्रता की एक बेचैन आवश्यकता होती है जो किसी भी बंधनकारी चीज़ का विरोध करती है।`,
    physical: `प्रायः लंबे या लंबे अंगों वाले, ऊर्जावान, आगे झुककर चलने वाले होते हैं — धनु कूल्हों और जांघों पर शासन करता है, इनकी सक्रिय जीवनशैली से मामूली खिंचाव का एक सामान्य क्षेत्र। इनकी अभिव्यक्ति खुली और उत्साही होती है।`,
    health: `कूल्हे और जांघ की चोटें, साथ ही अति-भोग से समस्याएं (गुरु की विस्तृत प्रवृत्तियां भोजन और पेय तक बढ़ सकती हैं), क्लासिक कमज़ोरियां हैं। एक सक्रिय, विविध दिनचर्या शरीर और बेचैन मन दोनों को संतुष्ट रखती है।`,
    career: `शिक्षण, यात्रा, प्रकाशन, कानून, और दर्शनशास्त्र में फलते-फूलते हैं — कोई भी क्षेत्र जहां विचारों को खोजने और एक डेस्क या कार्य तक सीमित रहने के बजाय आगे बढ़ने की जगह हो। कठोर पदानुक्रम इन्हें शीघ्र निराश करते हैं।`,
    relationship: `उष्ण और उत्साही लेकिन स्वतंत्रता-प्रिय, धनु लग्न को ऐसे साथी की आवश्यकता है जो इनकी स्वतंत्रता से खतरा महसूस न करे। ईमानदारी (कभी-कभी स्पष्ट) और साझा साहसिक कार्य इनके लिए स्नेह के नियमित प्रदर्शनों से अधिक मायने रखते हैं।`,
  },
  Capricorn: {
    personality: `मकर लग्न वाले जातक अनुशासित, महत्वाकांक्षी और व्यावहारिक होते हैं, त्वरित जीत के बजाय ऐसी चीज़ें बनाते हैं जो टिकाऊ हों। शनि द्वारा शासित होने के कारण इनमें एक स्वाभाविक गंभीरता और जिम्मेदारी की भावना होती है, कभी-कभी अपनी आयु से अधिक बड़े या संयमित प्रतीत होते हैं।`,
    physical: `प्रायः दुबली, हड्डीदार संरचना, मज़बूत अस्थि घनत्व, और संयत, संकोची आचरण — शनि का प्रभाव घुटनों, जोड़ों और त्वचा में दिखाई देता है। इनकी उपस्थिति दिखावटी होने के बजाय संयत होती है।`,
    health: `जोड़ों, हड्डियों और घुटनों की समस्याएं इस लग्न की क्लासिक कमज़ोरियां हैं, साथ ही निरंतर आत्म-अनुशासन से तनाव-संबंधी स्थितियां। विश्राम इनके लिए स्वाभाविक रूप से नहीं आता, लेकिन यही इनके शनि-शासित शरीर को सबसे अधिक चाहिए।`,
    career: `प्रबंधन, सरकार, इंजीनियरिंग, और दीर्घकालिक संरचना-निर्माण तथा धैर्य को पुरस्कृत करने वाले किसी भी क्षेत्र में उत्कृष्ट प्रदर्शन करते हैं। ये धीरे लेकिन स्थिर रूप से ऊपर उठते हैं, और जिम्मेदारी को गंभीरता से लेने के कारण ही इन पर भरोसा किया जाता है।`,
    relationship: `संकोची और खुलने में धीमे, लेकिन एक बार खुलने पर गहराई से प्रतिबद्ध, मकर लग्न भव्य रोमांटिक प्रदर्शन के बजाय निरंतरता और विश्वसनीयता के माध्यम से प्रेम दिखाते हैं। ये ऐसे साथी को महत्व देते हैं जो इनकी संरचना और स्वतंत्रता की आवश्यकता का सम्मान करे।`,
  },
  Aquarius: {
    personality: `कुंभ लग्न वाले जातक स्वतंत्र, मौलिक और विचार-प्रेरित होते हैं, अक्सर भीड़ से आगे सोचते हैं। शनि द्वारा शासित (आधुनिक संबंध यूरेनस से) होने के कारण ये परंपरा से अधिक बौद्धिक स्वतंत्रता और सामाजिक उद्देश्यों को महत्व देते हैं, और गहराई से परवाह करते हुए भी अलग-थलग प्रतीत हो सकते हैं।`,
    physical: `प्रायः विशिष्ट, अपरंपरागत रूप, दुबला शरीर, और शांत, सजग आंखें — कुंभ पिंडलियों और टखनों पर शासन करता है, खिंचाव का एक सामान्य मामूली बिंदु। इनकी समग्र उपस्थिति संयत लेकिन यादगार होती है।`,
    health: `परिसंचरण संबंधी समस्याएं और टखने या निचले पैर में खिंचाव क्लासिक कमज़ोरियां हैं, साथ ही अति-चिंतन या भावनात्मक अलगाव से तनाव। सामाजिक रूप से जुड़े रहना इनके कल्याण के लिए किसी भी शारीरिक उपाय जितना ही मायने रखता है।`,
    career: `प्रौद्योगिकी, विज्ञान, सामाजिक सुधार, और परंपरा से अधिक मौलिक सोच को पुरस्कृत करने वाले किसी भी क्षेत्र के लिए उपयुक्त। इन्हें कठोर पदानुक्रम पसंद नहीं, और वहां सर्वोत्तम प्रदर्शन करते हैं जहां इनके विचारों को परिणाम आकार देने की वास्तविक जगह मिले।`,
    relationship: `अपने ही अपरंपरागत तरीके से वफादार, कुंभ लग्न को निरंतर भावनात्मक प्रदर्शन से अधिक किसी संबंध में बौद्धिक जुड़ाव और स्वतंत्रता चाहिए। जो साथी इनकी स्थान की आवश्यकता का सम्मान करते हैं वे इनकी सबसे गहरी वफादारी पाते हैं।`,
  },
  Pisces: {
    personality: `मीन लग्न वाले जातक कल्पनाशील, सहानुभूतिपूर्ण और सहज-ज्ञानी होते हैं, अपने आसपास की चीज़ों को अधिकांश की तुलना में अधिक महसूस और आत्मसात करते हैं। गुरु द्वारा शासित (आधुनिक संबंध नेप्च्यून से) होने के कारण इनमें एक स्वप्निल, दयालु स्वभाव और कला, आध्यात्म, या पलायनवाद की ओर प्रबल आकर्षण होता है।`,
    physical: `प्रायः कोमल, अभिव्यंजक विशेषताएं और ऐसी आंखें जो दूर की गहराई रखती प्रतीत होती हैं — मीन पैरों पर शासन करता है, मामूली संवेदनशीलता का एक सामान्य क्षेत्र। इनकी उपस्थिति कोमल और आसपास के वातावरण से आसानी से प्रभावित महसूस होती है।`,
    health: `पैरों से संबंधित समस्याएं और दूसरों के तनाव को भावनात्मक रूप से आत्मसात करने की प्रवृत्ति क्लासिक कमज़ोरियां हैं — मीन राशि के जातकों को अक्सर उतनी अकेली अवधि की आवश्यकता होती है जितनी वे स्वयं महसूस नहीं करते। स्पष्ट सीमाएं शारीरिक देखभाल जितनी ही मायने रखती हैं।`,
    career: `कला, चिकित्सा व्यवसायों, आध्यात्म, और किसी भी ऐसे क्षेत्र में फलते-फूलते हैं जहां सहानुभूति और कल्पना देनदारी के बजाय संपत्ति हों। अत्यधिक कठोर, आंकड़ों से संचालित वातावरण इन्हें शीघ्र निचोड़ देते हैं।`,
    relationship: `प्रेम में गहराई से रोमांटिक और आत्म-त्यागी, मीन लग्न किसी साथी को आदर्श बना सकते हैं या सावधान न रहने पर किसी संबंध में स्वयं को खो सकते हैं। इन्हें ऐसे साथी की आवश्यकता है जो इनकी देने वाली प्रकृति का लाभ उठाए बिना इनकी संवेदनशीलता का सम्मान करे।`,
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
  };
}
