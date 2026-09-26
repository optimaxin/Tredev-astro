// Educational content behind the "Where does your question begin?" cards
// (see SeekGuidance.tsx) — one page per life area explaining, in classical
// Vedic terms, which planets/houses govern it, why it can feel stuck, and
// what the usual remedies are. Generic and the same for every visitor (not
// computed from anyone's actual chart) — a personalized version would need
// planet-dignity-per-house logic that doesn't exist in the backend yet.
export interface GuidanceInfoSection {
  en: string;
  hi: string;
}

export interface GuidanceInfoContent {
  id: string;
  sanskrit: string;
  nameEn: string;
  nameHi: string;
  intro: GuidanceInfoSection;
  planets: GuidanceInfoSection;
  whyWeak: GuidanceInfoSection;
  remedies: GuidanceInfoSection;
}

export const GUIDANCE_INFO: Record<string, GuidanceInfoContent> = {
  marriage: {
    id: 'marriage',
    sanskrit: 'विवाह',
    nameEn: 'Marriage & Relationships',
    nameHi: 'विवाह और रिश्ते',
    intro: {
      en: 'In Vedic astrology, marriage is read from the 7th house of your birth chart — the house of the "other," of partnership and commitment. How that house is placed, and which planet owns it, sets the tone for how relationships tend to unfold in your life.',
      hi: 'ज्योतिष में विवाह का विचार जन्म कुंडली के सप्तम भाव से किया जाता है — यह "दूसरे व्यक्ति" यानी साझेदारी और प्रतिबद्धता का भाव है। यह भाव किस स्थिति में है और इसका स्वामी कौन सा ग्रह है, इसी से तय होता है कि आपके रिश्ते सामान्यतः किस दिशा में आगे बढ़ते हैं।',
    },
    planets: {
      en: 'Venus is the primary significator of love, attraction and marital happiness for most charts, while Jupiter plays that role for a woman\'s chart as the husband significator. Mars is checked separately for Mangal Dosha — an affliction believed to bring friction early in a marriage unless matched or pacified. A well-placed 7th lord usually points to a supportive, stable partner.',
      hi: 'अधिकांश कुंडलियों में शुक्र प्रेम, आकर्षण और वैवाहिक सुख का मुख्य कारक ग्रह है, जबकि स्त्री की कुंडली में यह भूमिका गुरु (बृहस्पति) निभाते हैं जो पति के कारक माने जाते हैं। मंगल की स्थिति अलग से देखी जाती है — मंगल दोष माना जाता है कि यह विवाह के आरंभिक वर्षों में तनाव ला सकता है, जब तक इसका मिलान या शमन न हो। सप्तमेश यदि अच्छी स्थिति में हो तो सामान्यतः एक सहयोगी और स्थिर साथी की ओर संकेत करता है।',
    },
    whyWeak: {
      en: 'Delays or friction around marriage are usually traced to the 7th lord sitting with a malefic, being debilitated, or running through a difficult dasha period. Sometimes it isn\'t the chart at all — Saturn\'s influence here often just means things take their own time rather than not happening.',
      hi: 'विवाह में देरी या तनाव का कारण प्रायः सप्तमेश का किसी पाप ग्रह के साथ बैठना, नीच राशि में होना, या किसी कठिन दशा से गुजरना माना जाता है। कभी-कभी इसका कारण कुंडली में दोष नहीं होता — यहाँ शनि का प्रभाव अक्सर सिर्फ इतना दर्शाता है कि चीज़ें अपने समय पर होंगी, न कि होंगी ही नहीं।',
    },
    remedies: {
      en: 'Common remedies include wearing a Venus gemstone (Diamond or White Sapphire) after proper consultation, chanting the Shukra or Guru mantra on the relevant weekday, and simple practices like keeping the southwest corner of the home calm and clutter-free. A personalized reading can tell you exactly which of these actually applies to your own chart.',
      hi: 'सामान्य उपायों में उचित परामर्श के बाद शुक्र रत्न (हीरा या सफेद पुखराज) धारण करना, संबंधित वार पर शुक्र या गुरु मंत्र का जाप करना, और घर के नैऋत्य कोण को शांत व व्यवस्थित रखना जैसे सरल उपाय शामिल हैं। आपकी अपनी कुंडली के अनुसार इनमें से क्या वास्तव में लागू होता है, यह एक व्यक्तिगत परामर्श से ही स्पष्ट होगा।',
    },
  },

  career: {
    id: 'career',
    sanskrit: 'जीविका',
    nameEn: 'Career & Business',
    nameHi: 'करियर और व्यवसाय',
    intro: {
      en: 'Your professional life is read primarily from the 10th house — the house of karma, status and public standing — along with its lord and whichever planets cast their gaze on it. This is one of the most consulted areas in Jyotish, because career touches almost every other part of life.',
      hi: 'आपके करियर का विचार मुख्यतः दशम भाव से किया जाता है — यह कर्म, पद और सामाजिक प्रतिष्ठा का भाव है — साथ ही इसके स्वामी और इस पर दृष्टि डालने वाले ग्रहों से भी। ज्योतिष में यह सबसे अधिक पूछे जाने वाले विषयों में से एक है, क्योंकि करियर जीवन के लगभग हर हिस्से को छूता है।',
    },
    planets: {
      en: 'Saturn governs discipline, service and long-term structure — a strong Saturn often shows up as a career built slowly but built to last. The Sun points to authority, government work and leadership; Mercury to trade, communication and business acumen; and a well-placed Jupiter tends to bring recognition and ethical growth rather than shortcuts.',
      hi: 'शनि अनुशासन, सेवा और दीर्घकालिक संरचना के कारक हैं — शनि की मजबूत स्थिति प्रायः ऐसे करियर के रूप में दिखती है जो धीरे-धीरे लेकिन मज़बूती से बनता है। सूर्य अधिकार, सरकारी कार्य और नेतृत्व के संकेतक हैं; बुध व्यापार, संचार और व्यावसायिक कुशलता के; और यदि गुरु अच्छी स्थिति में हों तो प्रायः शॉर्टकट की बजाय मान्यता और नैतिक उन्नति मिलती है।',
    },
    whyWeak: {
      en: 'A career that feels stuck or directionless often traces back to the 10th lord being weak, combust, or afflicted by malefics — or to a dasha period that simply isn\'t the 10th house\'s own time yet. Frequent job changes or unclear direction can also point to Rahu\'s influence, which tends to create ambition without a settled path until it matures.',
      hi: 'करियर में ठहराव या दिशाहीनता का कारण प्रायः दशमेश का कमज़ोर, अस्त, या पाप ग्रहों से पीड़ित होना माना जाता है — या फिर ऐसी दशा चल रही हो जो अभी दशम भाव की अपनी नहीं है। बार-बार नौकरी बदलना या स्पष्ट दिशा न मिलना राहु के प्रभाव की ओर भी इशारा कर सकता है, जो परिपक्व होने तक महत्वाकांक्षा तो देता है पर स्थिर मार्ग नहीं।',
    },
    remedies: {
      en: 'Strengthening Saturn through disciplined routine, Saturday fasting or charity to laborers is a classical approach, alongside a Blue Sapphire only after careful testing (it can backfire if unsuited). For Sun-related career blocks, offering water to the Sun at sunrise and respecting authority figures is often suggested. A one-on-one reading maps this to your actual dasha timeline.',
      hi: 'शनि को मज़बूत करने के लिए अनुशासित दिनचर्या, शनिवार का व्रत या श्रमिकों को दान देना एक पारंपरिक तरीका है, साथ ही सावधानीपूर्वक परीक्षण के बाद ही नीलम धारण करना (अनुपयुक्त होने पर यह विपरीत असर भी दे सकता है)। सूर्य से जुड़ी करियर बाधाओं के लिए सूर्योदय के समय जल अर्पित करना और वरिष्ठों का सम्मान करना अक्सर सुझाया जाता है। आपकी वास्तविक दशा-अवधि के अनुसार यह किस तरह लागू होता है, यह व्यक्तिगत परामर्श से पता चलेगा।',
    },
  },

  money: {
    id: 'money',
    sanskrit: 'लक्ष्मी',
    nameEn: 'Money & Finance',
    nameHi: 'धन और वित्त',
    intro: {
      en: 'Wealth in a birth chart is split across two houses: the 2nd, which shows accumulated wealth and family resources, and the 11th, which shows income, gains and the fulfilment of desires. A chart is usually read across both, not just one.',
      hi: 'कुंडली में धन का विचार दो भावों में बंटा होता है: द्वितीय भाव, जो संचित धन और पारिवारिक संसाधन दिखाता है, और एकादश भाव, जो आय, लाभ और इच्छाओं की पूर्ति दिखाता है। धन का आकलन प्रायः इन दोनों भावों को मिलाकर किया जाता है, अकेले किसी एक से नहीं।',
    },
    planets: {
      en: 'Jupiter is the classical significator of wealth and expansion — its blessing tends to bring steady prosperity rather than sudden windfalls. Venus adds comfort, luxury and the finer things money can buy. The 11th lord\'s strength speaks to how easily income actually flows in, regardless of how much is earned on paper.',
      hi: 'गुरु धन और विस्तार के पारंपरिक कारक ग्रह हैं — इनका आशीर्वाद प्रायः अचानक की बजाय स्थिर समृद्धि लाता है। शुक्र आराम, विलासिता और धन से मिलने वाली बेहतर चीज़ों को जोड़ते हैं। एकादशेश की मज़बूती यह दर्शाती है कि आय वास्तव में कितनी सहजता से आती है, चाहे कागज़ पर कमाई कितनी भी क्यों न हो।',
    },
    whyWeak: {
      en: 'Money that "comes and goes" without settling is often linked to a weak or afflicted 2nd/11th lord, or to Rahu-Ketu sitting in these houses — which tends to bring unpredictable swings rather than a steady stream. Heavy Saturn influence here can also mean wealth builds, but very slowly, testing patience more than ability.',
      hi: 'धन का "आना और चला जाना" पर टिक न पाना प्रायः द्वितीय या एकादश भाव के कमज़ोर या पीड़ित स्वामी से, या इन भावों में राहु-केतु की स्थिति से जुड़ा माना जाता है — जो स्थिर प्रवाह की बजाय अप्रत्याशित उतार-चढ़ाव लाता है। यहाँ शनि का भारी प्रभाव भी यह दर्शा सकता है कि धन बनता तो है, पर बहुत धीरे-धीरे, जो क्षमता से अधिक धैर्य की परीक्षा लेता है।',
    },
    remedies: {
      en: 'Feeding cows or donating yellow items (turmeric, chana dal) on Thursdays is a common way to support Jupiter, while keeping the home\'s northeast corner clean and well-lit is a simple Vastu-linked practice for wealth flow. As with any remedy, what actually fits depends on which planet is genuinely weak in your own chart — not every remedy applies to every person.',
      hi: 'गुरुवार को गाय को चारा खिलाना या पीली वस्तुएं (हल्दी, चना दाल) दान करना गुरु को सहयोग देने का सामान्य तरीका है, जबकि घर के ईशान कोण को स्वच्छ और प्रकाशमान रखना धन-प्रवाह के लिए एक सरल वास्तु-संबंधी अभ्यास है। किसी भी उपाय की तरह, वास्तव में क्या उपयुक्त है यह इस पर निर्भर करता है कि आपकी अपनी कुंडली में वास्तव में कौन सा ग्रह कमज़ोर है — हर उपाय हर व्यक्ति पर लागू नहीं होता।',
    },
  },

  family: {
    id: 'family',
    sanskrit: 'कुटुंब',
    nameEn: 'Family & Home',
    nameHi: 'परिवार और घर',
    intro: {
      en: 'Family life draws mainly from the 4th house — home, mother and inner peace — with the 2nd house adding the family lineage and shared resources. Together they describe the emotional foundation a person operates from.',
      hi: 'पारिवारिक जीवन का विचार मुख्यतः चतुर्थ भाव से किया जाता है — घर, माता और आंतरिक शांति — साथ ही द्वितीय भाव पारिवारिक वंश और साझा संसाधन जोड़ता है। ये दोनों मिलकर उस भावनात्मक आधार को दर्शाते हैं जिस पर व्यक्ति खड़ा होता है।',
    },
    planets: {
      en: 'The Moon governs the mind, the mother, and domestic emotional weather — a strong Moon usually means a calmer home even during difficulty. Venus supports harmony and comfort at home, while a well-placed 4th lord points to a stable, secure base to return to.',
      hi: 'चंद्रमा मन, माता और घरेलू भावनात्मक वातावरण के कारक हैं — मज़बूत चंद्रमा प्रायः कठिनाई के समय भी शांत घर का संकेत देता है। शुक्र घर में सामंजस्य और आराम को सहयोग देते हैं, जबकि चतुर्थेश की अच्छी स्थिति एक स्थिर और सुरक्षित आधार की ओर इशारा करती है जहाँ लौटा जा सके।',
    },
    whyWeak: {
      en: 'Tension at home or distance from family is often traced to an afflicted Moon or 4th lord — sometimes simply a Moon that\'s waning or sitting with Saturn, which can make emotional expression feel heavier than it needs to. It rarely means the bond itself is broken, more that it takes conscious effort to keep it warm.',
      hi: 'घर में तनाव या परिवार से दूरी का कारण प्रायः पीड़ित चंद्रमा या चतुर्थेश माना जाता है — कभी-कभी यह केवल क्षीण चंद्रमा या शनि के साथ स्थित चंद्रमा होता है, जो भावनात्मक अभिव्यक्ति को आवश्यकता से अधिक भारी बना देता है। इसका अर्थ शायद ही कभी यह होता है कि रिश्ता टूट गया है, बल्कि यह कि उसे गर्मजोशी से बनाए रखने के लिए सचेत प्रयास चाहिए।',
    },
    remedies: {
      en: 'Strengthening the Moon through offering milk or white items on Mondays, and keeping regular contact with the mother or maternal figures, is a traditional approach. Keeping the home\'s northeast and centre areas open and uncluttered is a simple step many astrologers recommend alongside any personal remedy.',
      hi: 'सोमवार को दूध या सफेद वस्तुएं अर्पित करके चंद्रमा को मज़बूत करना, और माता या मातृ-पक्ष से नियमित संपर्क बनाए रखना एक पारंपरिक तरीका है। घर के ईशान और मध्य क्षेत्र को खुला व व्यवस्थित रखना एक सरल कदम है जिसे कई ज्योतिषी किसी भी व्यक्तिगत उपाय के साथ सुझाते हैं।',
    },
  },

  growth: {
    id: 'growth',
    sanskrit: 'विकास',
    nameEn: 'Personal Growth',
    nameHi: 'व्यक्तिगत विकास',
    intro: {
      en: 'Personal growth is read from the Lagna (1st house) itself — your sense of self, vitality and how you show up in the world — along with Jupiter, the planet of wisdom and expansion wherever it sits.',
      hi: 'व्यक्तिगत विकास का विचार लग्न (प्रथम भाव) से ही किया जाता है — यह आपकी आत्म-भावना, जीवनी शक्ति और आप संसार में स्वयं को कैसे प्रस्तुत करते हैं इसे दर्शाता है — साथ ही गुरु, जो ज्ञान और विस्तार के ग्रह हैं, जहाँ भी स्थित हों।',
    },
    planets: {
      en: 'A strong Lagna lord generally means resilience — the ability to keep showing up as yourself through change. The Sun adds confidence and clarity of purpose, and Jupiter\'s placement often decides whether growth comes through study and reflection, or through direct experience and course-correction.',
      hi: 'मज़बूत लग्नेश सामान्यतः लचीलापन दर्शाते हैं — बदलाव के बीच भी स्वयं बने रहने की क्षमता। सूर्य आत्मविश्वास और उद्देश्य की स्पष्टता जोड़ते हैं, और गुरु की स्थिति प्रायः यह तय करती है कि विकास अध्ययन और चिंतन से आएगा, या प्रत्यक्ष अनुभव और सुधार से।',
    },
    whyWeak: {
      en: 'A phase that feels stagnant is often less about a "weak" chart and more about a dasha period that\'s testing patience before the next expansion — Saturn periods especially ask for consistency before they reward it. A cluttered or afflicted Lagna can also show up as self-doubt that isn\'t really about your actual ability.',
      hi: 'ठहराव जैसा महसूस होने वाला दौर प्रायः "कमज़ोर" कुंडली से कम और अगले विस्तार से पहले धैर्य की परीक्षा लेने वाली दशा से अधिक जुड़ा होता है — विशेषकर शनि की दशाएं फल देने से पहले निरंतरता मांगती हैं। पीड़ित लग्न आत्म-संदेह के रूप में भी दिख सकता है, जो वास्तव में आपकी क्षमता से जुड़ा नहीं होता।',
    },
    remedies: {
      en: 'Simple daily discipline — a fixed sleep and wake time, a short mantra practice at sunrise — is the most commonly suggested support for the Lagna. For a sluggish Jupiter, Thursday fasting or study of a subject that genuinely interests you tends to be recommended over any object-based remedy.',
      hi: 'सरल दैनिक अनुशासन — नियत सोने-जागने का समय, सूर्योदय पर एक छोटा मंत्र अभ्यास — लग्न को सहयोग देने का सबसे सामान्य सुझाव है। सुस्त गुरु के लिए, गुरुवार का व्रत या किसी ऐसे विषय का अध्ययन जिसमें वास्तव में रुचि हो, किसी वस्तु-आधारित उपाय से अधिक सुझाया जाता है।',
    },
  },

  spirituality: {
    id: 'spirituality',
    sanskrit: 'मोक्ष',
    nameEn: 'Spirituality',
    nameHi: 'आध्यात्मिकता',
    intro: {
      en: 'Spiritual inclination is read from the 9th house of dharma and higher wisdom, and the 12th house of detachment and moksha. Together, classical Jyotish calls these the "moksha trikona" — the triangle of houses tied to liberation.',
      hi: 'आध्यात्मिक रुझान का विचार धर्म व उच्च ज्ञान के नवम भाव, और वैराग्य व मोक्ष के द्वादश भाव से किया जाता है। पारंपरिक ज्योतिष में इन्हें मिलाकर "मोक्ष त्रिकोण" कहा जाता है — मुक्ति से जुड़े भावों का त्रिकोण।',
    },
    planets: {
      en: 'Jupiter, as the guru and significator of wisdom, is central here — its placement often shows the path a person is naturally drawn to, whether that\'s scripture, meditation or service. Ketu adds detachment and an instinct for what doesn\'t matter, which classical texts treat as its own kind of gift rather than a loss.',
      hi: 'गुरु, ज्ञान के कारक और गुरु-तत्व के रूप में, यहाँ केंद्रीय भूमिका निभाते हैं — इनकी स्थिति प्रायः यह दर्शाती है कि व्यक्ति स्वाभाविक रूप से किस मार्ग की ओर आकर्षित है, चाहे वह शास्त्र हो, ध्यान हो या सेवा। केतु वैराग्य और यह समझने की सहज बुद्धि जोड़ते हैं कि क्या महत्वहीन है — जिसे पारंपरिक ग्रंथ हानि नहीं बल्कि एक विशेष उपहार मानते हैं।',
    },
    whyWeak: {
      en: 'A pull toward the spiritual that feels vague or unfulfilled is often linked to an afflicted 9th lord, or a Ketu period that hasn\'t yet settled into clarity — Ketu\'s effects are known to feel unmoored before they feel like insight. This isn\'t a flaw in the chart; classical texts describe it as part of the process itself.',
      hi: 'आध्यात्मिकता की ओर खिंचाव जो अस्पष्ट या अधूरा महसूस हो, प्रायः पीड़ित नवमेश से, या ऐसी केतु दशा से जुड़ा होता है जो अभी स्पष्टता में स्थिर नहीं हुई है — केतु का प्रभाव अंतर्दृष्टि बनने से पहले प्रायः दिशाहीन महसूस होता है। यह कुंडली की कोई कमी नहीं है; पारंपरिक ग्रंथ इसे स्वयं इस प्रक्रिया का हिस्सा मानते हैं।',
    },
    remedies: {
      en: 'A simple, consistent practice — daily japa, a weekly temple visit, or quiet reflection at the same time each day — is generally considered more effective here than any object-based remedy. Guidance from a teacher (guru) is traditionally seen as the actual remedy for a struggling 9th house, more than any ritual on its own.',
      hi: 'एक सरल, नियमित अभ्यास — दैनिक जप, साप्ताहिक मंदिर दर्शन, या प्रतिदिन एक ही समय पर शांत चिंतन — यहाँ किसी भी वस्तु-आधारित उपाय से अधिक प्रभावी माना जाता है। किसी गुरु का मार्गदर्शन पारंपरिक रूप से पीड़ित नवम भाव के लिए वास्तविक उपाय माना जाता है, अकेले किसी अनुष्ठान से कहीं अधिक।',
    },
  },
};
