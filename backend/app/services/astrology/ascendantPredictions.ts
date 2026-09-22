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
    personality: `Mars rules this Ascendant, and it shows: Aries natives lead with energy and initiative rather than deliberation. They're bold, direct, quick to act, and genuinely dislike waiting around. That enthusiasm is contagious, even on the days their impatience gets the better of them.`,
    physical: `Mars rules the head, so a distinctive head or face, headaches, or the occasional facial mark are common here. Build tends to be medium and energetic, and the gait is quick and purposeful — it matches the restless drive underneath.`,
    health: `Impulsiveness leads to minor injuries more often than it should, and Mars's fiery nature shows up as excess heat in the body: headaches, cuts, burns, fevers. Sport or regular exercise gives that high energy somewhere to go, which keeps both body and temper in balance. Anger held in rather than released tends to show up as blood-pressure spikes, so watch for that specifically.`,
    career: `Entrepreneurship, the military, sports, engineering — anywhere initiative and courage get rewarded, and where leading beats following. Slow, bureaucratic environments are the opposite of what this placement wants.`,
    relationship: `Love, for an Aries Ascendant, is pursued without much hesitation — passionate and direct. A partner needs to match that energy and leave room for them to lead. Bluntness unmet by patience is usually where the friction starts.`,
    dos: [
      "Channel high energy into regular exercise or sport before it turns into restlessness or irritability.",
      "Take a breath before reacting in anger — a short pause prevents most of the conflicts this Ascendant is prone to.",
      "Take the lead on new initiatives; this placement genuinely does its best work starting things rather than maintaining them.",
    ],
    donts: [
      "Making major decisions — financial, relationship, career — in the heat of the moment. Give it a day.",
      "Ignoring minor injuries or headaches. This Ascendant tends to push through pain rather than treat it early.",
      "Letting bluntness run unchecked around people who need patience. It costs more relationships than the honesty is worth.",
    ],
  },
  Taurus: {
    personality: `Venus rules Taurus Ascendants, and their steadiness reflects it: comfort, stability, and follow-through matter more to them than impulsive change. They have a natural eye for beauty and quality, and once they commit to something, letting go rarely crosses their mind.`,
    physical: `Taurus governs the neck and throat, which is often where this build shows its strength — sturdy, well-proportioned, with pleasant features and an unhurried way of carrying themselves. Comfort-seeking that tips into indulgence is the usual route to weight gain here.`,
    health: `Throat, thyroid, and neck issues are the classical weak spot, alongside a sluggishness that creeps in when rich food and comfort go unbalanced by activity. What suits this Ascendant is a steady routine, not sudden overhauls. During stretches of stress, keep an eye specifically on weight, thyroid balance, and throat infections.`,
    career: `Finance, agriculture, luxury goods, the arts — fields that reward patience and reliability rather than speed. Wealth builds slowly and steadily here, through dependable long-term contribution rather than speculation.`,
    relationship: `Once settled, a Taurus Ascendant is loyal, sensual, and serious about the relationship — instability is simply not to their taste. Possessiveness or resistance to change can creep in within a partnership, but what they offer back is deep, dependable devotion.`,
    dos: [
      "Build a steady daily routine — this Ascendant thrives on consistency far more than on dramatic lifestyle changes.",
      "Get regular movement into the week deliberately, since comfort-seeking otherwise crowds it out.",
      "Save and invest steadily rather than chasing quick returns; patience is this placement's real financial strength.",
    ],
    donts: [
      "Letting comfort slide into indulgence. Rich food and inactivity are this Ascendant's most common health drain.",
      "Holding onto possessiveness or resistance to change once it starts causing real friction in a relationship.",
      "Digging in out of sheer stubbornness on something that genuinely needs to change. Reconsider before refusing.",
    ],
  },
  Gemini: {
    personality: `Two people in one, almost — that's the Twins symbolism at work. Mercury rules this Ascendant, so the mind moves fast: curious, communicative, adaptable, taking in the world and processing it before most people have finished the first sentence. Which version shows up often just depends on the room.`,
    physical: `Build runs average to slim, hands stay expressive and animated while talking, and the eyes tend to be lively — a fairly direct window into a mind that rarely sits still.`,
    health: `Gemini rules the lungs, arms, and nervous system, so sensitivity there — respiratory issues, nervous tension, restlessness that tips into fatigue — is the classic weak point. Mental overstimulation from constant multitasking wears this Ascendant down faster than physical exertion ever does. When things get overloaded, anxiety, insomnia, and breathing trouble are what to watch for.`,
    career: `Writing, journalism, sales, teaching — anything communication-heavy, where variety and mental stimulation keep them engaged. Repetitive, isolated work frustrates them fast.`,
    relationship: `Witty, engaging, and needing constant mental connection to stay interested — conversation is basically oxygen here. It can read as inconsistent or hard to pin down from the outside, but a partner who keeps things intellectually alive gets the best of this placement.`,
    dos: [
      "Build in real downtime between tasks — this Ascendant's fatigue is mental far more than physical, and needs mental rest.",
      "Write things down or journal regularly; it settles a mind that otherwise runs on too many parallel threads.",
      "Seek variety deliberately in work and routine, rather than letting boredom build until it forces a disruptive change.",
    ],
    donts: [
      "Taking on more simultaneous commitments than can actually be followed through on. Half-finished threads pile up fast.",
      "Letting restlessness talk you out of a genuinely good, if less exciting, opportunity or relationship.",
      "Relying on words alone to smooth over inconsistency with people who need to see it followed by action.",
    ],
  },
  Cancer: {
    personality: `The Moon rules this Ascendant, so moods shift with the surroundings more than most signs. Underneath a quiet exterior, Cancer natives run sensitive, nurturing, and protective, with instincts and emotions that go deep — and a strong emotional pull toward home and family.`,
    physical: `A rounded, soft appearance and expressive, emotive eyes are typical, with a build that fluctuates more than most with mood and diet. Cancer's domain is the chest area, which tends to be a point of physical sensitivity.`,
    health: `Physical health tends to mirror emotional wellbeing more directly here than in most signs — digestive issues, water retention, and stress-related ailments track closely with emotional state. A stable home environment matters as much as diet does. Acidity, bloating, and mood-linked appetite swings are worth watching specifically.`,
    career: `Caregiving, hospitality, real estate, food-related fields — anything involving nurturing or emotional support suits this placement, and it performs best where the investment feels emotional, not purely transactional.`,
    relationship: `Once attached, deeply loyal and protective, with emotional security topping the list of what they need from a partnership. Hurt tends to send them into their shell, and coming back out takes reassurance and warmth.`,
    dos: [
      "Keep the home environment calm and stable where possible — this Ascendant's wellbeing genuinely tracks it closely.",
      "Talk through hurt feelings with someone trusted rather than withdrawing silently; the shell helps short-term, not long-term.",
      "Watch diet during emotionally difficult periods specifically, since stress shows up in digestion before anywhere else.",
    ],
    donts: [
      "Letting mood swings go unaddressed for long stretches. They compound into digestive and sleep issues here.",
      "Withdrawing completely when hurt in a relationship — it reads as rejection to a partner who may not know why.",
      "Taking on others' emotional burdens as your own without limits. The instinct to nurture needs boundaries too.",
    ],
  },
  Leo: {
    personality: `The Sun rules Leo Ascendants, and the charisma shows: confident, expressive, warm, naturally drawing attention and comfortable leading. There's a generous heart underneath the pride — though that same pride can tip into stubbornness, or a hunger for recognition, when it's not kept in check.`,
    physical: `A commanding presence is typical here — broad chest, upright bearing, a warm and radiant expression that draws the eye even in a crowd. Hair is often a notable feature, thick or distinctive.`,
    health: `Leo's domains are the heart and spine, and both deserve attention here, especially since this Ascendant tends to push hard chasing recognition and burns out doing it. Regular rest and cardiovascular care matter more than for most signs — high blood pressure, back strain, and overcommitment-driven burnout are the specific things to watch.`,
    career: `Leadership roles, performing arts, management, anything public-facing where presence gets to shine. Staying in the background is a struggle; ownership and visibility are where this placement thrives.`,
    relationship: `Generous, loyal, romantic — Leo Ascendants love grandly and expect admiration in return. A partner needs to appreciate that warmth without getting overshadowed by the need to be the center of attention.`,
    dos: [
      "Schedule real rest, not just downtime between commitments — the heart and spine here need actual recovery.",
      "Give credit and attention to others deliberately; it costs little and prevents the pride-driven friction this placement is prone to.",
      "Take leadership roles when offered — this Ascendant's confidence is a genuine asset in front of people, not just an ego need.",
    ],
    donts: [
      "Chasing recognition to the point of overexertion. Cardiovascular strain here is real, not just a figure of speech.",
      "Letting stubbornness or wounded pride stall a relationship or working conflict past the point it needs resolving.",
      "Needing to be the center of attention in every relationship — a partner's own spotlight moments deserve equal warmth.",
    ],
  },
  Virgo: {
    personality: `Details others miss rarely get past a Virgo Ascendant. Mercury rules here too, but it expresses as precision rather than speed: analytical, service-minded, holding high standards for self and others alike. Left unchecked, the instinct to improve things tips into over-criticism.`,
    physical: `Neat and moderate in build, with a careful, composed way of dressing and moving. Virgo rules the digestive system, so this build tends to be sensitive to diet, and the expression usually reads as observant and measured.`,
    health: `Overthinking and worry show up in the gut before they show up anywhere else — digestive sensitivity and anxiety-driven stress are this Ascendant's classic weak points. A calm, structured routine does more here than most remedies. During high-pressure stretches, watch specifically for acidity, IBS-type symptoms, and stress headaches.`,
    career: `Analysis, healthcare, editing, accounting — fields that reward precision and attention to detail. The reliable executor of any team, though delegating, or accepting imperfect work from others, doesn't come easily.`,
    relationship: `Care shows up as acts of service here, not grand gestures — devoted and practical rather than romantic in the showy sense. The tendency to critique can read as coldness, but it's usually a genuine wish to help underneath.`,
    dos: [
      "Build a calm, structured daily routine deliberately — it settles this Ascendant's digestion and mind more than any remedy.",
      "Say the caring intention out loud alongside the critique, so it doesn't land as coldness to people who don't know this placement well.",
      "Delegate on purpose, even imperfectly done work — perfectionism here quietly overloads them more than it helps anyone.",
    ],
    donts: [
      "Letting overthinking run unchecked before bed or during meals. It shows up directly as digestive trouble here.",
      "Criticizing before acknowledging what's working — the habit reads as harsher than it's usually meant.",
      "Taking on everyone's unfinished work instead of trusting others to finish their own, even imperfectly.",
    ],
  },
  Libra: {
    personality: `Fairness and harmony aren't just values for a Libra Ascendant, they're a default setting — Venus rules this Ascendant, giving it a refined sense of aesthetics and real social grace. The one cost: a dislike of conflict that can tip into indecision when a clear call is actually needed.`,
    physical: `Well-proportioned, with pleasant and fairly symmetrical features, and a graceful way of moving through a room. Libra rules the kidneys and lower back, which tend to be the sensitive points, and dressing with visible care and taste is typical.`,
    health: `Kidney function and lower-back issues sit at the classical weak point here, compounded by the physical toll of chronic indecision or people-pleasing stress. Balance — in diet, in routine — suits this Ascendant the way its own symbolism suggests. Kidney/urinary issues and lower-back pain from poor posture or stress are worth watching specifically.`,
    career: `Law, diplomacy, design, the arts — any partnership-based field where fairness and aesthetics genuinely matter. Collaborative environments bring out the best; solitary or highly competitive ones don't.`,
    relationship: `Relationships can end up defining a Libra Ascendant's whole sense of self — romantic and partnership-oriented almost to a fault. Balance and harmony with a partner matter enormously, and being alone, or deciding unilaterally, doesn't come easily.`,
    dos: [
      "Set a decision deadline for yourself on things that don't need endless weighing — indecision itself is the real cost here.",
      "Stay hydrated and mind posture specifically, given this Ascendant's kidney and lower-back sensitivity.",
      "Build comfort with being alone occasionally on purpose, so the relationship isn't carrying the entire sense of identity.",
    ],
    donts: [
      "Avoiding necessary conflict just to preserve short-term harmony — it usually resurfaces larger later.",
      "Letting people-pleasing stress build silently. It shows up physically here before it shows up as a stated complaint.",
      "Making major life decisions solely to keep a partner happy at your own consistent expense.",
    ],
  },
  Scorpio: {
    personality: `There's a magnetism to a Scorpio Ascendant that others notice immediately, and a mystery behind it that rarely gets fully explained. Mars rules this placement (traditionally tied to transformation too), lending strong willpower and a preference for going deep over staying on the surface.`,
    physical: `Piercing, intense eyes and a strong presence even at rest are typical — Scorpio rules the reproductive and eliminative systems. The expression tends to give away little, which only adds to the air of mystery.`,
    health: `Difficulty gets internalized rather than expressed here, which is exactly why reproductive and eliminative system health, plus stress from suppressed emotion, are the classical concerns. Outlets for emotional release matter more for this Ascendant than for most. Regular checkups even without visible symptoms are worth it — problems tend to get noticed late — and stress here often shows as tension rather than obvious symptoms.`,
    career: `Research, investigation, psychology, surgery, finance — fields that require depth and a willingness to confront what others avoid. Discretion and resilience under pressure are genuine assets here.`,
    relationship: `Loyal and passionate, but guarded until trust is actually earned — a Scorpio Ascendant tests before committing fully, and expects the same intensity back. Betrayal is rarely forgiven; genuine loyalty gets repaid many times over.`,
    dos: [
      "Find a real outlet for emotional release — physical activity, trusted conversation, even writing — rather than internalizing everything.",
      "Get regular health checkups even without visible symptoms, since this Ascendant tends to notice problems late.",
      "Let trust build gradually with people who've earned it, rather than testing indefinitely once it's clearly warranted.",
    ],
    donts: [
      "Suppressing difficulty until it becomes a health issue. The internalizing habit here has a real physical cost.",
      "Letting a single betrayal generalize into permanent guardedness with everyone new.",
      "Defaulting to secrecy in a relationship where actual transparency would resolve the guardedness faster.",
    ],
  },
  Sagittarius: {
    personality: `Jupiter rules this Ascendant, and the outlook matches — expansive, big-picture, optimistic. Growth and exploration pull at Sagittarius natives constantly, and freedom is close to non-negotiable; anything that feels confining gets resisted almost on instinct.`,
    physical: `Often tall or long-limbed, moving with an energetic, forward-leaning stride. Sagittarius rules the hips and thighs, which pick up minor strain from an active lifestyle, and the expression usually reads open and enthusiastic.`,
    health: `Hip and thigh injuries sit alongside overindulgence — Jupiter's expansive tendencies stretch to food and drink just as easily as anything else — as the classical weak points. An active, varied routine keeps both body and restless mind satisfied. During good times specifically, watch for hip/joint strain from overexertion and weight gain from overindulgence.`,
    career: `Teaching, travel, publishing, law, philosophy — fields with room to explore ideas and move, rather than stay confined to one desk. Rigid hierarchies frustrate this placement fast.`,
    relationship: `Warm and enthusiastic, but freedom-loving enough that a partner needs to not feel threatened by the independence. Honesty — sometimes bluntly so — and shared adventure matter more here than routine displays of affection.`,
    dos: [
      "Keep an active, varied routine deliberately — both body and mind here genuinely need the variety, not just enjoy it.",
      "Say the honest thing with a little more tact than instinct suggests; the substance can stay, only the delivery needs softening.",
      "Give a partner explicit reassurance about independence rather than assuming they'll simply understand the need for space.",
    ],
    donts: [
      "Letting overindulgence during good periods go unchecked. Weight and joint strain build quietly here.",
      "Mistaking bluntness for honesty when the moment actually calls for more care in how something is said.",
      "Committing to more obligations than the restless need for freedom can actually tolerate long-term.",
    ],
  },
  Capricorn: {
    personality: `Saturn rules Capricorn Ascendants, and it shows in a natural seriousness — disciplined, ambitious, practical, more interested in building things that last than chasing a quick win. It's common for this placement to seem older or more reserved than their actual age.`,
    physical: `A lean, bony structure with strong bone density and a composed, understated bearing is typical. Saturn's influence tends to show in the knees, joints, and skin — nothing flashy about the overall presence.`,
    health: `Joint, bone, and knee issues are the classical weak point, compounded by stress-related conditions from relentless self-discipline. Rest doesn't come naturally here, which is exactly why the Saturn-ruled body needs it most. Joint pain, skin issues, and chronic fatigue from under-rested self-discipline are what to watch for specifically.`,
    career: `Management, government, engineering — fields that reward long-term structure-building and patience. The rise is slow but steady, and responsibility gets trusted to this placement precisely because it's taken seriously.`,
    relationship: `Reserved and slow to open up, but once committed, genuinely committed — love shows up as consistency and reliability rather than grand romantic display. A partner who respects the need for structure and independence gets the most out of this placement.`,
    dos: [
      "Schedule rest as deliberately as work — this Ascendant's Saturn-ruled body needs it most precisely because it resists taking it.",
      "Open up to a committed partner earlier than instinct suggests; the reserve here often reads as distance rather than depth.",
      "Take on responsibility at a pace that's sustainable, not just whatever's offered — the rise here is meant to be steady, not relentless.",
    ],
    donts: [
      "Pushing through fatigue as a badge of discipline. Joint and bone strain here compounds silently over years.",
      "Letting consistency substitute entirely for warmth in a relationship — both are needed, not one instead of the other.",
      "Taking on every available responsibility just because you're trusted with it. Overload builds slowly and stays long.",
    ],
  },
  Aquarius: {
    personality: `Thinking a step ahead of the crowd comes naturally to an Aquarius Ascendant. Saturn rules this placement (Uranus in the modern association), and it leans toward intellectual freedom and social causes over convention — sometimes reading as detached even in moments of genuine care.`,
    physical: `A distinctive, unconventional look is typical, paired with a lean build and calm, observant eyes. Aquarius rules the calves and ankles, a common minor point of strain, and the overall presence tends to be understated but memorable.`,
    health: `Circulatory issues and ankle or lower-leg strain sit at the classical weak point, along with stress that builds from overthinking or emotional detachment. Staying socially connected does as much for this Ascendant's wellbeing as any physical remedy would. During withdrawn periods, watch specifically for circulation problems and isolation-driven low mood.`,
    career: `Technology, science, social reform — anywhere original thinking gets rewarded over tradition. Rigid hierarchies are disliked; real room for ideas to shape outcomes is where this placement does its best work.`,
    relationship: `Loyalty runs deep here, just expressed unconventionally — intellectual connection and independence within a relationship matter more than constant emotional display. Partners who respect the need for space tend to get the deepest version of that loyalty.`,
    dos: [
      "Stay socially connected on purpose, even briefly — isolation here affects mood more than this Ascendant tends to notice.",
      "Name the caring feeling out loud occasionally; detachment is often misread by others as indifference.",
      "Move regularly to support circulation, since this placement's sedentary tendency compounds a real physical weak point.",
    ],
    donts: [
      "Withdrawing for long stretches when overthinking. It feeds the isolation that worsens the mood dip.",
      "Assuming a partner will infer the loyalty underneath the detachment without ever being told directly.",
      "Dismissing convention so reflexively that genuinely useful structure gets rejected along with the unnecessary parts.",
    ],
  },
  Pisces: {
    personality: `More gets felt and absorbed here than most signs can manage — Jupiter rules this Ascendant (Neptune in the modern association), giving it a dreamy, compassionate nature and a real pull toward art, spirituality, or escapism. Imaginative and intuitive almost by default.`,
    physical: `Soft, expressive features and eyes that seem to carry a faraway quality are typical. Pisces rules the feet, a common area of minor sensitivity, and the overall presence tends to feel gentle, easily affected by its surroundings.`,
    health: `Absorbing others' stress emotionally is close to reflexive for this Ascendant, which alongside foot-related issues makes up the classical weak point — more alone time than they realize gets needed to actually recover. Clear boundaries matter as much as physical care. Watch specifically for foot problems and emotional exhaustion from soaking up others' moods.`,
    career: `The arts, healing professions, spirituality — any field where empathy and imagination are assets rather than liabilities. Rigid, numbers-driven environments drain this placement quickly.`,
    relationship: `Romantic and self-sacrificing almost to a fault — a Pisces Ascendant can idealize a partner, or lose themselves in a relationship, without meaning to. What they need is a partner who respects the sensitivity without taking advantage of the giving nature underneath it.`,
    dos: [
      "Set clear emotional boundaries deliberately — this Ascendant absorbs others' stress more than it realizes in the moment.",
      "Schedule real alone time to recover, even when it doesn't feel urgently needed; the need shows up as exhaustion later.",
      "Keep a grounding practice (a routine, a craft, anything concrete) alongside the imagination, so escapism has a limit.",
    ],
    donts: [
      "Idealizing a partner past the point of seeing them clearly. This placement's romanticism can outrun reality here.",
      "Taking on other people's emotional weight without limits — giving needs a boundary to stay sustainable.",
      "Using escapism, real or emotional, as the default response to stress instead of addressing its source.",
    ],
  },
};

const PROFILES_HI: Record<string, AscendantProfile> = {
  Aries: {
    personality: `मंगल इस लग्न का स्वामी है, और यह साफ़ झलकता है — मेष लग्न वाले सोच-विचार से अधिक ऊर्जा और पहल के साथ आगे बढ़ते हैं। साहसी, स्पष्टवादी, शीघ्र कार्य करने वाले, और इंतज़ार करना इन्हें बिल्कुल पसंद नहीं। इनका उत्साह संक्रामक होता है, भले ही अधीरता कभी-कभी झलक जाए।`,
    physical: `मंगल सिर पर शासन करता है, इसलिए विशिष्ट सिर या चेहरा, सिरदर्द, या चेहरे पर निशान यहाँ सामान्य हैं। कद-काठी मध्यम और ऊर्जावान रहती है, और चाल तेज़-उद्देश्यपूर्ण — भीतर की बेचैन प्रेरणा से मेल खाती हुई।`,
    health: `आवेग के कारण छोटी-मोटी चोटें आम हैं, और मंगल की उग्र प्रकृति शरीर में गर्मी के रूप में दिखती है — सिरदर्द, कट-चोट, जलन, बुखार। खेल या नियमित व्यायाम इस उच्च ऊर्जा को निकास देता है, जिससे शरीर और स्वभाव दोनों संतुलित रहते हैं। गुस्सा दबाने पर रक्तचाप बढ़ने पर विशेष ध्यान दें।`,
    career: `उद्यमिता, सेना, खेल, इंजीनियरिंग — जहां भी पहल और साहस को पुरस्कृत किया जाए, और जहां अनुसरण की बजाय नेतृत्व मिले। धीमी, नौकरशाही वातावरण इसके बिल्कुल विपरीत है।`,
    relationship: `प्रेम में यह लग्न बिना अधिक हिचकिचाहट के आगे बढ़ता है — जुनूनी और स्पष्टवादी। साथी को इनकी ऊर्जा का मुकाबला करना और नेतृत्व की जगह देना आना चाहिए। स्पष्टवादिता को धैर्य से न लिया जाए तो वहीं से घर्षण शुरू होता है।`,
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
    personality: `शुक्र वृषभ लग्न का स्वामी है, और इनकी स्थिरता में यह साफ़ दिखता है — आवेगपूर्ण बदलाव की बजाय आराम, स्थिरता और निरंतरता को महत्व देना इनका स्वभाव है। सौंदर्य और गुणवत्ता की स्वाभाविक समझ इनमें होती है, और एक बार प्रतिबद्ध हो जाएं तो पीछे हटना इनके स्वभाव में नहीं।`,
    physical: `वृषभ गर्दन और गले के क्षेत्र पर शासन करता है, जहां अक्सर इनकी मज़बूती दिखती है — सुगठित शरीर, सुखद विशेषताएं, और शांत, बिना जल्दबाज़ी वाला आचरण। आराम का प्रेम यदि भोग-विलास में बदल जाए तो वज़न बढ़ना आसान हो जाता है।`,
    health: `गले, थायरॉइड और गर्दन की समस्याएं क्लासिक कमज़ोरी हैं, साथ ही सुस्ती जो तब आती है जब स्वादिष्ट भोजन और आराम का लगाव सक्रियता से संतुलित न हो। अचानक जीवनशैली बदलाव की बजाय एक स्थिर दिनचर्या इस लग्न को कहीं बेहतर सूट करती है। तनावपूर्ण समय में वज़न बढ़ने, थायरॉइड असंतुलन, और गले के संक्रमण पर विशेष ध्यान दें।`,
    career: `वित्त, कृषि, विलासिता की वस्तुएं, कला — धैर्य और विश्वसनीयता को पुरस्कृत करने वाला कोई भी क्षेत्र। धन यहाँ सट्टे से नहीं, धीरे-धीरे और स्थिर रूप से बनता है, और भरोसेमंद दीर्घकालिक योगदान के लिए इन्हें महत्व दिया जाता है।`,
    relationship: `एक बार स्थिर हो जाने पर निष्ठा गहरी होती है — वफादार, कामुक, और संबंध को गंभीरता से लेने वाला। किसी साझेदारी में स्वामित्व की भावना या परिवर्तन का प्रतिरोध आ सकता है, लेकिन बदले में जो भरोसेमंद निष्ठा मिलती है वह उतनी ही गहरी होती है।`,
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
    personality: `जैसे एक शरीर में दो व्यक्ति हों — यही जुड़वां का प्रतीक इस लग्न में साकार होता है। बुध का शासन होने से मन तेज़ चलता है: जिज्ञासु, संवादप्रिय, अनुकूलनशील, संसार को दूसरों से पहले ग्रहण और संसाधित कर लेने वाला। कौन-सा रूप सामने आएगा, यह अक्सर माहौल पर निर्भर करता है।`,
    physical: `कद-काठी औसत से पतली रहती है, हाथ बोलते समय अभिव्यंजक और सजीव रहते हैं, और आंखें जीवंत — एक ऐसे मन की सीधी झलक जो शायद ही कभी शांत बैठता है।`,
    health: `मिथुन फेफड़ों, भुजाओं और तंत्रिका तंत्र पर शासन करता है, इसलिए यहीं संवेदनशीलता सबसे पहले दिखती है — श्वसन समस्याएं, तंत्रिका तनाव, बेचैनी जो थकान में बदल जाए। निरंतर बहु-कार्य से उत्पन्न मानसिक अति-उत्तेजना शारीरिक परिश्रम से कहीं अधिक थकाती है। व्यस्त समय में चिंता, अनिद्रा, और श्वास संबंधी परेशानी पर ध्यान दें।`,
    career: `लेखन, पत्रकारिता, बिक्री, शिक्षण — संचार-प्रधान कुछ भी, जहां विविधता और मानसिक उत्तेजना बनी रहे। दोहराव वाला, एकाकी कार्य जल्दी निराश करता है।`,
    relationship: `बुद्धिमान, आकर्षक, और रुचि बनाए रखने के लिए निरंतर मानसिक जुड़ाव चाहने वाला — बातचीत यहाँ लगभग प्राणवायु जैसी है। बाहर से यह असंगत लग सकता है, पर जो साथी चीज़ों को बौद्धिक रूप से जीवंत रखे, उसे इस लग्न का सर्वश्रेष्ठ मिलता है।`,
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
    personality: `चंद्रमा इस लग्न का स्वामी है, इसलिए मनोभाव वातावरण के साथ अधिकांश राशियों से ज़्यादा बदलते हैं। शांत बाहरी रूप के नीचे गहरी प्रवृत्तियां और भावनाएं छिपी होती हैं — संवेदनशील, पोषण करने वाला, सुरक्षात्मक — और घर-परिवार से गहरा भावनात्मक लगाव इसका स्वभाव है।`,
    physical: `छाती का क्षेत्र कर्क के अधिकार में आता है, और यहीं शारीरिक संवेदनशीलता का बिंदु भी रहता है। रूप गोल-कोमल, आंखें अभिव्यंजक-भावुक, और शरीर मनोदशा तथा आहार के साथ अधिकांश की तुलना में अधिक उतार-चढ़ाव करता है।`,
    health: `इनका शारीरिक स्वास्थ्य भावनात्मक कल्याण को अधिकांश राशियों से अधिक सीधे प्रतिबिंबित करता है — पाचन संबंधी समस्याएं, जल प्रतिधारण, और तनाव-संबंधी रोग भावनात्मक स्थिति से निकटता से जुड़े रहते हैं। स्थिर घरेलू वातावरण आहार जितना ही महत्वपूर्ण है। एसिडिटी, पेट फूलना, और मनोदशा से जुड़ी भूख के उतार-चढ़ाव पर विशेष ध्यान दें।`,
    career: `देखभाल, आतिथ्य, रियल एस्टेट, खाद्य-संबंधी क्षेत्र — पोषण या भावनात्मक सहयोग से जुड़ा कुछ भी। जहां भावनात्मक निवेश महसूस हो, वहां प्रदर्शन सर्वोत्तम रहता है, सिर्फ लेन-देन वाली भूमिकाओं में नहीं।`,
    relationship: `एक बार जुड़ जाने पर निष्ठा और सुरक्षा-भाव गहरा होता है — किसी साझेदारी में भावनात्मक सुरक्षा सबसे ऊपर चाहिए। आहत होने पर अपने खोल में सिमट जाना स्वाभाविक है, और बाहर आने के लिए आश्वासन व गर्मजोशी चाहिए।`,
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
    personality: `सूर्य सिंह लग्न का स्वामी है, और करिश्मा इसी से आता है — आत्मविश्वासी, अभिव्यंजक, उष्ण, स्वाभाविक रूप से ध्यान आकर्षित करने वाला। हृदय उदार रहता है, पर अभिमान संभले न रहे तो हठ या पहचान की भूख में बदल सकता है।`,
    physical: `प्रभावशाली उपस्थिति यहाँ सामान्य है — चौड़ी छाती, सीधी मुद्रा, और एक गर्मजोशी भरी अभिव्यक्ति जो भीड़ में भी नज़र खींच लेती है। बाल अक्सर घने या विशिष्ट, एक उल्लेखनीय विशेषता बन जाते हैं।`,
    health: `हृदय और रीढ़ सिंह के अधिकार में आते हैं, और यहीं ध्यान देने की सबसे ज़्यादा ज़रूरत है — खासकर क्योंकि पहचान पाने के लिए यह लग्न स्वयं को कठोरता से आगे बढ़ाता है। नियमित विश्राम और हृदय-संबंधी देखभाल अधिकांश से अधिक महत्वपूर्ण हैं। उच्च रक्तचाप, पीठ में खिंचाव, और अत्यधिक प्रतिबद्धता से थकावट पर विशेष ध्यान दें।`,
    career: `नेतृत्व की भूमिकाएं, प्रदर्शन कलाएं, प्रबंधन — कोई भी सार्वजनिक क्षेत्र जहां उपस्थिति चमक सके। पृष्ठभूमि में रहना संघर्षपूर्ण लगता है; स्वामित्व और दृश्यता मिलने पर यह लग्न फलता-फूलता है।`,
    relationship: `प्रेम यहाँ भव्य होता है — उदार, वफादार, रोमांटिक, और बदले में प्रशंसा की स्वाभाविक अपेक्षा। साथी को इनकी गर्मजोशी की सराहना करनी आनी चाहिए, बिना ध्यान का केंद्र बनने की इनकी ज़रूरत से दबे।`,
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
    personality: `ऐसा विवरण जो दूसरे चूक जाएं, कन्या लग्न शायद ही चूकता है। बुध यहाँ भी शासक है, पर गति की बजाय सटीकता के रूप में प्रकट होता है — विश्लेषणात्मक, सेवा-भावी, स्वयं और दूसरों के लिए ऊंचे मानक रखने वाला। अनियंत्रित रहने पर सुधार की यही प्रवृत्ति अति-आलोचना में बदल जाती है।`,
    physical: `कन्या पाचन तंत्र पर शासन करती है, इसलिए शरीर अक्सर आहार के प्रति संवेदनशील रहता है — सुव्यवस्थित, मध्यम काया, कपड़े पहनने और चलने का सावधान तरीका, और एक सजग, मापी हुई अभिव्यक्ति।`,
    health: `अति-चिंतन और चिंता सबसे पहले पेट में प्रकट होती है — पाचन संवेदनशीलता और चिंता-प्रेरित तनाव इस लग्न की क्लासिक कमज़ोरियां हैं। एक शांत, संरचित दिनचर्या यहाँ अधिकांश उपायों से अधिक काम करती है। उच्च-दबाव के समय एसिडिटी, IBS-प्रकार के लक्षण, और तनाव सिरदर्द पर विशेष ध्यान दें।`,
    career: `विश्लेषण, स्वास्थ्य सेवा, संपादन, लेखांकन — सटीकता और विवरण को पुरस्कृत करने वाला कुछ भी। टीम का भरोसेमंद क्रियान्वयक यही लग्न होता है, हालांकि काम सौंपना या दूसरों का अपूर्ण काम स्वीकारना इसके लिए आसान नहीं।`,
    relationship: `देखभाल यहाँ सेवा के कार्यों से दिखती है, भव्य इशारों से नहीं — समर्पित और व्यावहारिक। आलोचना करने की आदत ठंडापन लग सकती है, पर पीछे अक्सर सहायता की सच्ची इच्छा ही होती है।`,
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
    personality: `निष्पक्षता और सामंजस्य इस लग्न के लिए मूल्य नहीं, स्वभाव है — शुक्र इसका स्वामी है, जो सौंदर्यशास्त्र और सामाजिक शिष्टाचार की परिष्कृत समझ देता है। इसकी कीमत: टकराव की नापसंदगी, जो असली फैसले की ज़रूरत पड़ने पर अनिर्णय बन जाती है।`,
    physical: `तुला गुर्दों और पीठ के निचले हिस्से पर शासन करता है, जो संवेदनशीलता के बिंदु बन जाते हैं। शरीर सुडौल, विशेषताएं सुखद-सममित, और कपड़े पहनने में स्पष्ट रुचि व देखभाल — यह इस लग्न की पहचान है।`,
    health: `दीर्घकालिक अनिर्णय या लोगों को प्रसन्न रखने का तनाव यहाँ सीधे शरीर पर असर डालता है — गुर्दे की कार्यक्षमता और पीठ के निचले हिस्से की समस्याएं क्लासिक कमज़ोरी हैं। आहार और दिनचर्या में संतुलन इस राशि के अपने प्रतीकवाद से मेल खाता है। गुर्दे/मूत्र संबंधी समस्याओं और खराब मुद्रा या तनाव से पीठ दर्द पर विशेष ध्यान दें।`,
    career: `कानून, कूटनीति, डिज़ाइन, कला — कोई भी साझेदारी-आधारित क्षेत्र जहां निष्पक्षता और सौंदर्यशास्त्र मायने रखें। सहयोगात्मक वातावरण में प्रदर्शन सर्वोत्तम रहता है, एकल या अत्यधिक प्रतिस्पर्धी में नहीं।`,
    relationship: `स्वयं की पहचान अक्सर संबंधों के माध्यम से बनती है — रोमांटिक और साझेदारी-उन्मुख लगभग एक दोष की हद तक। साथी के साथ संतुलन और सामंजस्य बेहद मायने रखता है, और अकेले रहना या एकतरफा निर्णय लेना आसान नहीं।`,
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
    personality: `जिस चुंबकीय उपस्थिति को दूसरे तुरंत नोटिस करते हैं, उसके पीछे एक रहस्य भी रहता है जो शायद ही कभी पूरी तरह खुलता है। मंगल इस लग्न का स्वामी है (परंपरागत रूप से परिवर्तन से भी जुड़ा), जो प्रबल इच्छाशक्ति और सतह से गहराई में जाने की प्रवृत्ति देता है।`,
    physical: `वृश्चिक प्रजनन और उत्सर्जन तंत्र पर शासन करता है। तीक्ष्ण-गहरी आंखें, आराम के समय भी एक मज़बूत उपस्थिति, और एक अभिव्यक्ति जो बहुत कम प्रकट करती है — यही रहस्य को और बढ़ाती है।`,
    health: `कठिनाई व्यक्त करने की बजाय भीतर समाहित कर ली जाती है, इसलिए प्रजनन-उत्सर्जन तंत्र का स्वास्थ्य और दबी भावना से तनाव क्लासिक चिंताएं हैं। भावनात्मक मुक्ति के साधन इस लग्न के लिए अधिकांश से अधिक मायने रखते हैं। बिना लक्षण के भी नियमित जांच कराएं — समस्याएं देर से नोटिस होती हैं — और तनाव यहाँ अक्सर दिखाई देने वाले लक्षणों की बजाय तनाव के रूप में ही रहता है।`,
    career: `अनुसंधान, जांच, मनोविज्ञान, शल्य चिकित्सा, वित्त — गहराई और वह सामना करने की इच्छा जिससे अन्य बचते हैं। विवेक और दबाव में लचीलापन जहां मूल्यवान हो, वहां यह लग्न उत्कृष्ट रहता है।`,
    relationship: `विश्वास की परीक्षा पहले, प्रतिबद्धता बाद में — गहराई से वफादार और जुनूनी, पर सतर्क भी। जो तीव्रता खुद देते हैं, वही साथी से अपेक्षा रखते हैं। विश्वासघात शायद ही कभी क्षमा होता है, पर सच्ची वफादारी कई गुना लौटाई जाती है।`,
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
    personality: `गुरु इस लग्न का स्वामी है, और दृष्टिकोण उसी अनुसार विस्तृत है — बड़ी तस्वीर देखने वाला, आशावादी, दार्शनिक। विकास और अन्वेषण की ओर खिंचाव लगातार बना रहता है, और स्वतंत्रता लगभग गैर-समझौता योग्य है; जो भी बांधने जैसा महसूस हो, उसका विरोध स्वाभाविक रूप से होता है।`,
    physical: `धनु कूल्हों और जांघों पर शासन करता है, जहां सक्रिय जीवनशैली से मामूली खिंचाव आम है। कद अक्सर लंबा या अंग लंबे, चाल ऊर्जावान-आगे झुकी हुई, और अभिव्यक्ति खुली-उत्साही।`,
    health: `गुरु की विस्तृत प्रवृत्ति भोजन-पेय तक भी फैल सकती है, इसलिए कूल्हे-जांघ की चोटों के साथ अति-भोग की समस्याएं क्लासिक कमज़ोरी हैं। एक सक्रिय, विविध दिनचर्या शरीर और बेचैन मन दोनों को संतुष्ट रखती है। अच्छे समय में अति-परिश्रम से कूल्हे/जोड़ों में खिंचाव और अति-भोग से वज़न बढ़ने पर विशेष ध्यान दें।`,
    career: `शिक्षण, यात्रा, प्रकाशन, कानून, दर्शनशास्त्र — जहां विचारों को खोजने और आगे बढ़ने की जगह हो, एक डेस्क तक सीमित रहने की बजाय। कठोर पदानुक्रम जल्दी निराश करते हैं।`,
    relationship: `उष्ण और उत्साही, पर स्वतंत्रता-प्रिय भी — साथी को इनकी आज़ादी से खतरा महसूस नहीं होना चाहिए। ईमानदारी, कभी-कभी बेहद स्पष्ट, और साझा साहसिक कार्य यहाँ स्नेह के नियमित प्रदर्शनों से अधिक मायने रखते हैं।`,
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
    personality: `शनि इस लग्न का स्वामी है, और स्वाभाविक गंभीरता इसी से आती है — अनुशासित, महत्वाकांक्षी, व्यावहारिक, त्वरित जीत की बजाय टिकाऊ चीज़ें बनाने में रुचि रखने वाला। अपनी उम्र से बड़ा या संयमित दिखना इस लग्न के लिए असामान्य नहीं।`,
    physical: `शनि का प्रभाव घुटनों, जोड़ों और त्वचा में दिखता है। दुबली-हड्डीदार संरचना, मज़बूत अस्थि घनत्व, और संयत-संकोची आचरण — उपस्थिति यहाँ दिखावटी नहीं, संयत होती है।`,
    health: `निरंतर आत्म-अनुशासन तनाव-संबंधी स्थितियां ले आता है, और जोड़ों, हड्डियों व घुटनों की समस्याएं इस लग्न की क्लासिक कमज़ोरी हैं। विश्राम स्वाभाविक रूप से नहीं आता, पर यही शनि-शासित शरीर को सबसे ज़्यादा चाहिए। जोड़ों के दर्द, त्वचा की समस्याओं, और अल्प-विश्राम से दीर्घकालिक थकान पर विशेष ध्यान दें।`,
    career: `प्रबंधन, सरकार, इंजीनियरिंग — दीर्घकालिक संरचना-निर्माण और धैर्य को पुरस्कृत करने वाला कुछ भी। उठान धीमी पर स्थिर रहती है, और जिम्मेदारी को गंभीरता से लेने के कारण ही भरोसा मिलता है।`,
    relationship: `खुलने में समय लगता है, पर एक बार खुल जाएं तो प्रतिबद्धता गहरी होती है — प्रेम यहाँ भव्य प्रदर्शन से नहीं, निरंतरता और विश्वसनीयता से दिखता है। जो साथी संरचना और स्वतंत्रता की ज़रूरत का सम्मान करे, वही सबसे उपयुक्त है।`,
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
    personality: `भीड़ से एक कदम आगे सोचना इस लग्न के लिए स्वाभाविक है। शनि यहाँ शासक है (आधुनिक संबंध यूरेनस से), और यह परंपरा से अधिक बौद्धिक स्वतंत्रता व सामाजिक उद्देश्यों की ओर झुकाव देता है — गहराई से परवाह करते हुए भी कभी-कभी अलग-थलग जैसा दिखना इसी का नतीजा है।`,
    physical: `कुंभ पिंडलियों और टखनों पर शासन करता है, खिंचाव का एक सामान्य मामूली बिंदु। रूप विशिष्ट-अपरंपरागत, शरीर दुबला, और आंखें शांत-सजग — समग्र उपस्थिति संयत पर यादगार होती है।`,
    health: `अति-चिंतन या भावनात्मक अलगाव यहाँ तनाव का मुख्य स्रोत बनता है, जिसके साथ परिसंचरण संबंधी समस्याएं और टखने या निचले पैर में खिंचाव क्लासिक कमज़ोरी हैं। सामाजिक रूप से जुड़े रहना किसी भी शारीरिक उपाय जितना ही कल्याण के लिए मायने रखता है। अलग-थलग रहने के समय परिसंचरण समस्याओं और अलगाव-प्रेरित उदासी पर विशेष ध्यान दें।`,
    career: `प्रौद्योगिकी, विज्ञान, सामाजिक सुधार — परंपरा से अधिक मौलिक सोच को पुरस्कृत करने वाला कुछ भी। कठोर पदानुक्रम पसंद नहीं; जहां विचारों को परिणाम आकार देने की वास्तविक जगह मिले, वहीं प्रदर्शन सर्वोत्तम रहता है।`,
    relationship: `वफादारी यहाँ अपने ही अपरंपरागत तरीके से चलती है — निरंतर भावनात्मक प्रदर्शन से अधिक बौद्धिक जुड़ाव और स्वतंत्रता चाहिए। जो साथी जगह की ज़रूरत का सम्मान करे, उसे इस लग्न की सबसे गहरी निष्ठा मिलती है।`,
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
    personality: `जितना यह लग्न महसूस और आत्मसात करता है, उतना अधिकांश राशियां नहीं कर पातीं। गुरु यहाँ शासक है (आधुनिक संबंध नेप्च्यून से), जो एक स्वप्निल, दयालु स्वभाव और कला, आध्यात्म या पलायनवाद की ओर प्रबल आकर्षण देता है — कल्पनाशील, सहानुभूतिपूर्ण, सहज-ज्ञानी।`,
    physical: `मीन पैरों पर शासन करता है, मामूली संवेदनशीलता का एक सामान्य क्षेत्र। विशेषताएं कोमल-अभिव्यंजक, आंखें मानो दूर की गहराई लिए हुए, और उपस्थिति आसपास के वातावरण से आसानी से प्रभावित होने वाली।`,
    health: `दूसरों का तनाव भावनात्मक रूप से आत्मसात कर लेना यहाँ लगभग स्वाभाविक है, जो पैरों से जुड़ी समस्याओं के साथ क्लासिक कमज़ोरी बनाता है — जितनी अकेली अवधि की ज़रूरत होती है, उतनी खुद महसूस नहीं होती। स्पष्ट सीमाएं शारीरिक देखभाल जितनी ही मायने रखती हैं। पैरों की समस्याओं और दूसरों की मनोदशा आत्मसात करने से भावनात्मक थकावट पर विशेष ध्यान दें।`,
    career: `कला, चिकित्सा व्यवसाय, आध्यात्म — कोई भी क्षेत्र जहां सहानुभूति और कल्पना देनदारी नहीं, संपत्ति हों। अत्यधिक कठोर, आंकड़ों से संचालित वातावरण जल्दी निचोड़ देते हैं।`,
    relationship: `प्रेम में गहराई से रोमांटिक और आत्म-त्यागी — साथी को आदर्श बना देना या सावधान न रहने पर संबंध में खुद को खो देना, दोनों संभव हैं। जो साथी देने वाली प्रकृति का लाभ उठाए बिना संवेदनशीलता का सम्मान करे, वही सबसे उपयुक्त है।`,
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
