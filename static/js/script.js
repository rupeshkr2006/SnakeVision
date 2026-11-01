(() => {
  'use strict';

  const form = document.getElementById('upload-form');
  const biteInput = document.getElementById('bite-image');
  const snakeInput = document.getElementById('snake-image');
  const button = document.getElementById('analyze-button');
  const progress = document.getElementById('progress');
  const resultsSection = document.getElementById('results-section');
  const biteResultCard = document.getElementById('bite-result-card');
  const speciesResultCard = document.getElementById('species-result-card');
  const previewUrls = new Map();

  const imageControls = [
    { input: biteInput, zone: document.getElementById('bite-drop-zone'), preview: document.getElementById('bite-preview'), placeholder: document.getElementById('bite-placeholder'), filename: document.getElementById('bite-file-name'), key: 'bite', emptyText: 'No bite-area photo selected' },
    { input: snakeInput, zone: document.getElementById('snake-drop-zone'), preview: document.getElementById('snake-preview'), placeholder: document.getElementById('snake-placeholder'), filename: document.getElementById('snake-file-name'), key: 'snake', emptyText: 'No snake photo selected' },
  ];

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'];
  const maxBytes = 8 * 1024 * 1024;
  const maxRequestBytes = Math.floor(3.6 * 1024 * 1024);
  const percent = value => `${(Number(value) * 100).toFixed(1)}%`;
  let currentLanguage = 'en';
  const UI_TEXT = {
    en:{analysis:'ANALYSIS',resultsTitle:'Results and precautions',languageLabel:'Language',symptomsHeading:'Emergency symptoms to watch for',dontHeading:'Do not do these things',firstAidHeading:'Immediate first aid while arranging transport',speciesPrecautionsHeading:'Precautions for the predicted species',biteUrgencyTitle:'TIME-CRITICAL: suspected bite — emergency care NOW',biteUrgencyText:'Leave for the nearest emergency-capable hospital immediately. Do not wait for swelling, pain, weakness, or this AI result.',speciesUrgencyTitle:'Snake photo is not a patient risk assessment',speciesUrgencyText:'If a person may have been bitten, seek emergency care now regardless of the predicted species or visible symptoms.',urgencyTitle:'TIME-CRITICAL: go to a hospital NOW',survivalWarning:'A photograph cannot predict survival time or show whether venom was injected. Do not wait for symptoms or an AI result. India’s national guideline calls for at least 24 hours of clinical observation at a health facility after suspected snakebite. This is an observation recommendation, not a survival estimate.',refs:'References',uncertainTitle:'Unable to identify confidently',uncertainPrecautions:'General safety guidance (species not identified)',predictedPrecautions:'Precautions for the predicted species',speciesUnknown:'Species/risk status not assigned',unknownSummary:'The image may be unrelated, blurred, low-detail, or difficult for this classifier. Do not infer that a snake is present or absent from this output.',unknownSpeciesList:['Do not approach, touch, corner, or attempt to identify a snake at close range.','Keep people and pets away; contact a trained local snake rescuer if a snake is present.','For any suspected bite, seek emergency medical care immediately.']},
    te:{analysis:'విశ్లేషణ',resultsTitle:'ఫలితాలు మరియు జాగ్రత్తలు',languageLabel:'భాష',symptomsHeading:'గమనించాల్సిన అత్యవసర లక్షణాలు',dontHeading:'చేయకూడని పనులు',firstAidHeading:'ఆసుపత్రికి తరలించేలోపు తక్షణ ప్రథమ చికిత్స',speciesPrecautionsHeading:'అంచనా వేసిన పాము జాతికి ప్రత్యేక జాగ్రత్తలు',biteUrgencyTitle:'అత్యవసరం: పాము కాటు అనుమానం — వెంటనే ఆసుపత్రికి వెళ్లండి',biteUrgencyText:'వెంటనే అత్యవసర వైద్యం అందించే సమీప ఆసుపత్రికి బయలుదేరండి. వాపు, నొప్పి, బలహీనత లేదా ఈ AI ఫలితం కోసం వేచి ఉండకండి.',speciesUrgencyTitle:'పాము ఫోటో రోగి ప్రమాద స్థాయిని నిర్ధారించదు',speciesUrgencyText:'ఎవరినైనా పాము కరిచి ఉండవచ్చని అనుమానం ఉంటే, అంచనా వేసిన జాతి లేదా కనిపించే లక్షణాలతో సంబంధం లేకుండా వెంటనే అత్యవసర వైద్యం పొందండి.',urgencyTitle:'అత్యవసరం: ఇప్పుడే ఆసుపత్రికి వెళ్లండి',survivalWarning:'ఫోటో ద్వారా రోగి ఎంతకాలం బతుకుతారో లేదా విషం శరీరంలోకి వెళ్లిందో చెప్పలేము. లక్షణాలు లేదా AI ఫలితం కోసం వేచి ఉండకండి. భారత జాతీయ మార్గదర్శకం ప్రకారం అనుమానిత పాము కాటు తర్వాత కనీసం 24 గంటలు వైద్య కేంద్రంలో పరిశీలన అవసరం. ఇది పరిశీలన సూచన మాత్రమే; బతికే సమయ అంచనా కాదు.',refs:'ఆధారాలు',uncertainTitle:'పామును నమ్మకంగా గుర్తించలేకపోయాం',uncertainPrecautions:'సాధారణ భద్రతా సూచనలు (జాతి గుర్తించబడలేదు)',predictedPrecautions:'అంచనా వేసిన పాము జాతికి జాగ్రత్తలు',speciesUnknown:'జాతి / ప్రమాద స్థాయి నిర్ధారించబడలేదు',unknownSummary:'చిత్రం సంబంధం లేనిదై ఉండవచ్చు, అస్పష్టంగా లేదా తక్కువ వివరాలతో ఉండవచ్చు. ఈ ఫలితం ఆధారంగా పాము ఉందని లేదా లేదని నిర్ణయించవద్దు.',unknownSpeciesList:['పాముకు దగ్గరగా వెళ్లవద్దు, తాకవద్దు, చుట్టుముట్టవద్దు లేదా దగ్గరగా గుర్తించడానికి ప్రయత్నించవద్దు.','ప్రజలు, పెంపుడు జంతువులను దూరంగా ఉంచండి; పాము ఉంటే శిక్షణ పొందిన స్థానిక స్నేక్ రెస్క్యూను సంప్రదించండి.','కాటు అనుమానం ఉన్నా వెంటనే అత్యవసర వైద్య సహాయం పొందండి.']},
    hi:{analysis:'विश्लेषण',resultsTitle:'परिणाम और सावधानियाँ',languageLabel:'भाषा',symptomsHeading:'ध्यान देने योग्य आपातकालीन लक्षण',dontHeading:'ये काम बिल्कुल न करें',firstAidHeading:'अस्पताल पहुँचने तक तुरंत प्राथमिक सहायता',speciesPrecautionsHeading:'अनुमानित साँप की प्रजाति के अनुसार सावधानियाँ',biteUrgencyTitle:'अत्यावश्यक: साँप के काटने का संदेह — अभी अस्पताल जाएँ',biteUrgencyText:'तुरंत निकटतम आपातकालीन सुविधा वाले अस्पताल के लिए निकलें। सूजन, दर्द, कमजोरी या इस AI परिणाम का इंतज़ार न करें।',speciesUrgencyTitle:'साँप की फोटो रोगी के जोखिम का आकलन नहीं है',speciesUrgencyText:'यदि किसी व्यक्ति को साँप ने काटा हो सकता है, तो अनुमानित प्रजाति या दिखने वाले लक्षणों की परवाह किए बिना तुरंत आपातकालीन चिकित्सा लें।',urgencyTitle:'अत्यावश्यक: अभी अस्पताल जाएँ',survivalWarning:'फोटो से यह अनुमान नहीं लगाया जा सकता कि मरीज कितने समय तक जीवित रहेगा या शरीर में विष गया है या नहीं। लक्षणों या AI परिणाम का इंतज़ार न करें। भारत के राष्ट्रीय दिशानिर्देश संदिग्ध साँप के काटने के बाद स्वास्थ्य केंद्र में कम-से-कम 24 घंटे चिकित्सकीय निगरानी की सलाह देते हैं। यह निगरानी की सलाह है, जीवित रहने का अनुमान नहीं।',refs:'संदर्भ',uncertainTitle:'प्रजाति की विश्वसनीय पहचान नहीं हो सकी',uncertainPrecautions:'सामान्य सुरक्षा निर्देश (प्रजाति की पहचान नहीं हुई)',predictedPrecautions:'अनुमानित प्रजाति के लिए सावधानियाँ',speciesUnknown:'प्रजाति / जोखिम की पुष्टि नहीं हुई',unknownSummary:'तस्वीर असंबंधित, धुंधली या कम विवरण वाली हो सकती है। इस परिणाम से यह निष्कर्ष न निकालें कि साँप मौजूद है या नहीं।',unknownSpeciesList:['साँप के पास न जाएँ, उसे न छुएँ, घेरें नहीं और पास जाकर पहचानने की कोशिश न करें।','लोगों और पालतू जानवरों को दूर रखें; साँप दिखे तो प्रशिक्षित स्थानीय रेस्क्यू टीम से संपर्क करें।','काटने का संदेह हो तो तुरंत आपातकालीन चिकित्सा लें।']}
  };
  const BITE_TRANSLATIONS = {
    te:{action:'కాటు గుర్తు చిన్నగా ఉన్నా లేదా మొదట్లో ఇబ్బంది లేకపోయినా, అనుమానిత పాము కాటుకు వెంటనే ఆసుపత్రి పరీక్ష అవసరం. లక్షణాలు లేదా AI ఫలితం కోసం వేచి ఉండకండి.',signs:['కాటు దగ్గర నొప్పి, వేగంగా పెరుగుతున్న వాపు, నీలి మచ్చలు, బొబ్బలు లేదా చర్మం రంగు మారడం.','కాటు దగ్గర, చిగుళ్లలో, ముక్కులో, మూత్రంలో లేదా ఇతర చోట్ల నుంచి రక్తం లేదా ద్రవం కారడం.','కనురెప్పలు వాలిపోవడం, రెండుగా కనిపించడం, మాట్లాడటం లేదా మింగడం కష్టమవడం, మెడ లేదా చేతులు/కాళ్లలో బలహీనత.','శ్వాస తీసుకోవడంలో ఇబ్బంది, మూర్ఛ భావన, గందరగోళం, కుప్పకూలడం, చల్లని చెమట లేదా షాక్ లక్షణాలు.','తీవ్రమైన కడుపు నొప్పి లేదా వాంతులు. క్రైట్ కాటులో బయట గాయం స్వల్పంగా ఉండి లక్షణాలు ఆలస్యంగా రావచ్చు.'],dont:['గాయాన్ని కోయవద్దు, విషాన్ని పీల్చవద్దు, పిసకవద్దు, మసాజ్ చేయవద్దు, మంచు పెట్టవద్దు; మూలికలు లేదా రసాయనాలు వేయవద్దు.','బిగుతైన టోర్నికెట్ కట్టవద్దు. ఒత్తిడి బ్యాండేజ్ ప్రతి పాము కాటుకు సరిపోదు; శిక్షణ పొందిన వైద్యుల సూచన లేకుండా వేయవద్దు.','రోగిని నడవనివ్వవద్దు; కదలిక తగ్గించి కరిచిన అవయవాన్ని స్ప్లింట్‌తో స్థిరపరచండి.'],note:'ఇది లక్షణాలపై అవగాహన కోసం మాత్రమే; వైద్య నిర్ధారణ లేదా చికిత్సా విధానం కాదు. విష ప్రభావాన్ని వైద్యులు మాత్రమే అంచనా వేసి యాంటీవెనమ్ అవసరాన్ని నిర్ణయించగలరు.',firstAid:['పాము నుంచి దూరంగా వెళ్లండి. దాన్ని పట్టుకోవడానికి లేదా చంపడానికి ప్రయత్నించవద్దు.','రోగిని ప్రశాంతంగా ఉంచి కదలిక తగ్గించండి; కరిచిన అవయవాన్ని స్థిరపరచండి.','వాపు వచ్చేలోపు కాటు దగ్గర ఉన్న ఉంగరాలు, గడియారాలు లేదా బిగుతైన వస్తువులను సులభంగా తొలగించగలిగితే తొలగించండి.','వెంటనే ఆసుపత్రికి తరలించండి. వెబ్‌సైట్ లేదా లక్షణాల కోసం వేచి ఉండకండి.','గాయాన్ని కోయడం, పీల్చడం, మసాజ్ చేయడం, మంచు పెట్టడం లేదా మూలికా మందులు వాడడం చేయవద్దు; బిగుతైన టోర్నికెట్ వేయవద్దు.']},
    hi:{action:'काटने का निशान छोटा हो या शुरुआत में कोई परेशानी न हो, फिर भी हर संदिग्ध साँप के काटने पर तुरंत अस्पताल में जाँच जरूरी है। लक्षणों या AI परिणाम का इंतज़ार न करें।',signs:['काटने की जगह दर्द, तेजी से बढ़ती सूजन, नीलापन, फफोले या त्वचा का रंग बदलना।','काटने की जगह, मसूड़ों, नाक, पेशाब या किसी अन्य जगह से खून या तरल निकलना।','पलकें झुकना, दोहरा दिखना, बोलने या निगलने में कठिनाई, गर्दन या हाथ-पैरों में कमजोरी।','साँस लेने में कठिनाई, बेहोशी जैसा लगना, भ्रम, गिर पड़ना, ठंडी-चिपचिपी त्वचा या शॉक के लक्षण।','तेज पेट दर्द या उल्टी। करैत के काटने में बाहरी घाव कम दिख सकता है और लक्षण देर से आ सकते हैं।'],dont:['घाव को न काटें, विष चूसने की कोशिश न करें, न दबाएँ, मालिश न करें, बर्फ न लगाएँ और जड़ी-बूटी या रसायन न लगाएँ।','कसकर tourniquet न बाँधें। Pressure-immobilization हर साँप के काटने के लिए सही नहीं है; प्रशिक्षित चिकित्सा सलाह के बिना न करें।','मरीज को चलने न दें; उसे स्थिर रखें और काटे गए अंग को स्प्लिंट से immobilize करें।'],note:'यह केवल लक्षणों की जानकारी है; निदान या उपचार योजना नहीं। विष के प्रभाव और एंटीवेनम की आवश्यकता का निर्णय केवल चिकित्सक कर सकते हैं।',firstAid:['साँप से दूर हटें। उसे पकड़ने या मारने की कोशिश न करें।','मरीज को शांत और यथासंभव स्थिर रखें; काटे गए अंग को immobilize करें।','सूजन बढ़ने से पहले काटे गए हिस्से के पास की अंगूठी, घड़ी या तंग वस्तु आसानी से निकल सके तो निकाल दें।','तुरंत अस्पताल ले जाने की व्यवस्था करें। वेबसाइट या लक्षणों का इंतज़ार न करें।','घाव न काटें, न चूसें, मालिश न करें, बर्फ या घरेलू/हर्बल उपचार न लगाएँ; कसकर tourniquet न बाँधें।']}
  };
  const SPECIES_TRANSLATIONS = {
    te:{
      'Common Krait':['దగ్గరకు వెళ్లవద్దు, తాకవద్దు లేదా పట్టుకోవద్దు; వెనక్కి వెళ్లి శిక్షణ పొందిన రక్షకుడిని పిలవండి.','పాము ఉండే ప్రాంతాల్లో రాత్రి నేలపై నేరుగా పడుకోకుండా ఉండండి; నడిచే ముందు లైట్ ఉపయోగించండి.','కాటు అనుమానం ఉంటే బయట గాయం చిన్నదైనా రోగిని కదలకుండా ఉంచి వెంటనే ఆసుపత్రికి తీసుకెళ్లండి.'],
      'King Cobra':['దగ్గరకు వెళ్లకుండా దూరంగా వెళ్లండి; దారి అడ్డుకోవద్దు లేదా దగ్గరగా ఫోటో తీయవద్దు.','ఇతరులను, పెంపుడు జంతువులను దూరంగా ఉంచండి; పాముకు వెళ్లే దారి ఇవ్వండి.','శిక్షణ పొందిన స్నేక్ రెస్క్యూ లేదా అటవీ అధికారులను సంప్రదించండి.'],
      'Monocled Cobra':['నాగుపాము దగ్గరకు వెళ్లవద్దు; దూరం పెంచి దారి ఇవ్వండి.','దాన్ని పట్టుకోవడానికి, కొట్టడానికి లేదా చంపడానికి ప్రయత్నించవద్దు.','ప్రాంతాన్ని ఖాళీగా ఉంచి శిక్షణ పొందిన రక్షకుడిని పిలవండి. కాటు అనుమానం ఉంటే వెంటనే ఆసుపత్రికి వెళ్లండి.'],
      "Russell's Viper":['పొలాలు, పొడవైన గడ్డి లేదా పొదల్లో మూసిన పాదరక్షలు ధరించండి; చీకట్లో టార్చ్ ఉపయోగించండి.','కనిపించని గడ్డి, ఎలుక బొరియలు, ఆకులు లేదా చెత్తలో చేతులు పెట్టవద్దు.','వైపర్‌ను తాకవద్దు లేదా తరలించవద్దు; కాటు అనుమానం ఉంటే వెంటనే వైద్య సహాయం పొందండి.'],
      'Saw-scaled Viper':['రాతి లేదా పొదల ప్రాంతాల్లో మూసిన పాదరక్షలు ధరించి రాత్రి లైట్ ఉపయోగించండి.','రాళ్ల కుప్పలు, పగుళ్లు లేదా ఆకుల కింద చేతులు పెట్టవద్దు.','పామును తాకవద్దు లేదా చంపవద్దు. కాటు అనుమానం ఉంటే వెంటనే ఆసుపత్రికి వెళ్లండి.'],
      'Spectacled Cobra':['దూరంగా ఉండండి; దగ్గరగా ఫోటో తీయడం, రెచ్చగొట్టడం లేదా పట్టుకోవడం చేయవద్దు.','ఇతరులను, పెంపుడు జంతువులను దూరంగా ఉంచి పాముకు బయటకు వెళ్లే దారి ఇవ్వండి.','ఇంటి దగ్గర కనిపిస్తే శిక్షణ పొందిన రక్షకుడిని పిలవండి. కాటు అనుమానం ఉంటే ఆసుపత్రికి వెళ్లండి.'],
      'Banded Racer':['వెంటాడవద్దు, మూలకు నెట్టవద్దు, పట్టుకోవద్దు; వెళ్లేందుకు దారి ఇవ్వండి.','పిల్లలు, పెంపుడు జంతువులను దూరంగా ఉంచి దూరం నుంచి మాత్రమే గమనించండి.','ఇంట్లో కనిపిస్తే ఆ ప్రాంతాన్ని ఖాళీ చేసి రక్షకుడిని పిలవండి.'],
      'Checkered Keelback':['చెరువు లేదా తడి తోట దగ్గర మొక్కలు, రాళ్లలో చేతులు పెట్టవద్దు.','వెనక్కి వెళ్లి పామును స్వయంగా వెళ్లనివ్వండి; పట్టుకోవద్దు.','ఇల్లు లేదా రద్దీ ప్రాంతంలో ఉంటే శిక్షణ పొందిన రక్షకుడిని పిలవండి.'],
      'Common Rat Snake':['హానికరం కాదని భావించినా వెంటాడవద్దు లేదా పట్టుకోవద్దు; కాటు గాయం కలిగించవచ్చు.','దాని దారి నుంచి దూరంగా ఉండండి; మూలకు నెట్టవద్దు.','ఇంట్లో ఉంటే ప్రజలు, పెంపుడు జంతువులను దూరంగా ఉంచి రక్షకుడిని పిలవండి.'],
      'Common Sand Boa':['తోటపని లేదా మట్టి/రాళ్లు కదిలించే ముందు చూడండి; రంధ్రాల్లో చేతులు పెట్టవద్దు.','పాము కనిపిస్తే పని ఆపి వెనక్కి వెళ్లండి; చేతితో పట్టుకోవద్దు.','తొలగించాల్సి వస్తే శిక్షణ పొందిన వన్యప్రాణి రక్షకుడిని పిలవండి.'],
      'Common Trinket':['పట్టుకోవద్దు లేదా నొక్కిపట్టవద్దు; భయపడితే కాటు వేయవచ్చు.','దానికి దూరంగా ఉండి బయటకు వెళ్లే దారి ఇవ్వండి.','ఇంట్లో కనిపిస్తే గదిని ఖాళీ చేసి రక్షకుడిని పిలవండి.'],
      'Green Tree Vine':['చెట్లు, పొదలు లేదా తీగల్లో చేతులు పెట్టే ముందు చూడండి.','చిన్నదిగా కనిపించినా పట్టుకోవద్దు లేదా ముఖానికి దగ్గరగా తీసుకురావద్దు.','ప్రజల దగ్గర ఉంటే దూరంగా ఉండి శిక్షణ పొందిన రక్షకుడిని పిలవండి.'],
      'Indian Rock Python':['దగ్గరకు వెళ్లవద్దు, చుట్టుముట్టవద్దు లేదా పట్టుకోవద్దు; పెద్ద కొండచిలువ తీవ్రమైన గాయం చేయగలదు.','పిల్లలు, పెంపుడు జంతువులను దూరంగా ఉంచి పాముకు వెళ్లే దారి ఇవ్వండి.','శిక్షణ పొందిన వన్యప్రాణి రక్షణ సేవ లేదా అటవీ శాఖను సంప్రదించండి.']
    },
    hi:{
      'Common Krait':['पास न जाएँ, छुएँ या पकड़ें नहीं; पीछे हटें और प्रशिक्षित रेस्क्यू टीम बुलाएँ।','साँप वाले क्षेत्रों में रात को फर्श पर सोने से बचें; रात में चलने से पहले रोशनी करें।','काटने का संदेह हो तो घाव छोटा दिखने पर भी मरीज को स्थिर रखकर तुरंत अस्पताल ले जाएँ।'],
      'King Cobra':['पास न जाएँ; दूर हटें और उसका रास्ता न रोकें या नज़दीक से फोटो न लें।','लोगों और पालतू जानवरों को दूर रखें और साँप को निकलने का रास्ता दें।','प्रशिक्षित साँप रेस्क्यू टीम या वन अधिकारियों से संपर्क करें।'],
      'Monocled Cobra':['कोबरा के पास न जाएँ; दूरी बढ़ाएँ और उसे निकलने का रास्ता दें।','उसे पकड़ने, मारने या छेड़ने की कोशिश न करें।','क्षेत्र खाली रखें और प्रशिक्षित रेस्क्यू टीम बुलाएँ। काटने का संदेह हो तो अस्पताल जाएँ।'],
      "Russell's Viper":['खेतों, ऊँची घास या झाड़ियों में बंद जूते पहनें और अँधेरे में टॉर्च इस्तेमाल करें।','घनी घास, बिलों, पत्तों या मलबे में बिना देखे हाथ न डालें।','वाइपर को न छुएँ; काटने का संदेह हो तो तुरंत चिकित्सा लें।'],
      'Saw-scaled Viper':['झाड़ियों और पथरीली जगहों पर बंद जूते पहनें और रात में रोशनी रखें।','पत्थरों के ढेर, दरारों या सूखे पत्तों में हाथ न डालें।','साँप को न छुएँ और न मारें। काटने का संदेह हो तो अस्पताल जाएँ।'],
      'Spectacled Cobra':['दूरी बनाए रखें; पास जाकर फोटो न लें, उकसाएँ नहीं और पकड़ें नहीं।','लोगों और पालतू जानवरों को दूर रखें और साँप को निकलने का रास्ता दें।','घर के पास दिखे तो प्रशिक्षित रेस्क्यू टीम बुलाएँ। काटने का संदेह हो तो अस्पताल जाएँ।'],
      'Banded Racer':['पीछा न करें, घेरें नहीं या पकड़ें नहीं; उसे निकलने का रास्ता दें।','बच्चों और पालतू जानवरों को दूर रखें और काफी दूरी से देखें।','घर के अंदर दिखे तो जगह खाली रखें और रेस्क्यू टीम बुलाएँ।'],
      'Checkered Keelback':['तालाब या गीले बगीचे के पास पौधों या पत्थरों में हाथ न डालें।','पीछे हटें और साँप को खुद जाने दें; पकड़ने की कोशिश न करें।','घर या भीड़ वाली जगह में दिखे तो प्रशिक्षित रेस्क्यू टीम बुलाएँ।'],
      'Common Rat Snake':['हानिरहित समझकर भी पीछा या पकड़ें नहीं; काटने से चोट लग सकती है।','उसके रास्ते से दूर रहें और उसे घेरें नहीं।','घर के अंदर हो तो लोगों और पालतू जानवरों को दूर रखें और रेस्क्यू टीम बुलाएँ।'],
      'Common Sand Boa':['बागवानी या मिट्टी/पत्थर हटाने से पहले देखें; बिलों में हाथ न डालें।','दिखे तो काम रोकें और पीछे हटें; हाथ से पकड़ें नहीं।','हटाने के लिए प्रशिक्षित वन्यजीव रेस्क्यू टीम बुलाएँ।'],
      'Common Trinket':['उसे पकड़ें या दबाएँ नहीं; डरने पर काट सकता है।','दूरी बनाए रखें और उसे निकलने का रास्ता दें।','घर में दिखे तो कमरा खाली करें और रेस्क्यू टीम बुलाएँ।'],
      'Green Tree Vine':['पेड़ों, झाड़ियों या बेलों में हाथ डालने से पहले देखें।','छोटा दिखने पर भी उसे न पकड़ें और चेहरे के पास न लाएँ।','लोगों के पास हो तो दूर रहें और प्रशिक्षित रेस्क्यू टीम बुलाएँ।'],
      'Indian Rock Python':['पास न जाएँ, घेरें या पकड़ें नहीं; बड़ा अजगर गंभीर चोट पहुँचा सकता है।','बच्चों और पालतू जानवरों को दूर रखें और उसे निकलने का रास्ता दें।','प्रशिक्षित वन्यजीव बचाव सेवा या वन विभाग से संपर्क करें।']
    }
  };
  const currentUi = () => UI_TEXT[currentLanguage] || UI_TEXT.en;

  const SPECIES_NAMES = {
    te:{'Common Krait':'కట్లపాము (క్రైట్)','King Cobra':'రాజ నాగుపాము','Monocled Cobra':'నాగుపాము','Russell\'s Viper':'రస్సెల్ వైపర్','Saw-scaled Viper':'సా-స్కేల్డ్ వైపర్','Spectacled Cobra':'భారతీయ నాగుపాము','Banded Racer':'బ్యాండెడ్ రేసర్','Checkered Keelback':'చెకర్డ్ కీల్బ్యాక్','Common Rat Snake':'ధామన్ (రాట్ స్నేక్)','Common Sand Boa':'సాండ్ బోవా','Common Trinket':'ట్రింకెట్ పాము','Green Tree Vine':'ఆకుపచ్చ తీగ పాము','Indian Rock Python':'భారతీయ కొండచిలువ'},
    hi:{'Common Krait':'कॉमन करैत','King Cobra':'किंग कोबरा','Monocled Cobra':'मोनोक्ल्ड कोबरा','Russell\'s Viper':'रसेल वाइपर','Saw-scaled Viper':'फुरसा वाइपर','Spectacled Cobra':'भारतीय नाग','Banded Racer':'बैंडेड रेसर','Checkered Keelback':'चेकर्ड कीलबैक','Common Rat Snake':'धामन (रैट स्नेक)','Common Sand Boa':'सैंड बोआ','Common Trinket':'कॉमन ट्रिंकेट','Green Tree Vine':'हरी बेल वाला साँप','Indian Rock Python':'भारतीय अजगर'}
  };
  const RISK_NAMES = {
    te:{'Highly venomous; medically important':'అత్యంత విషపూరితం; వైద్యపరంగా ప్రమాదకరం','Venomous; medically important':'విషపూరితమైనది; వైద్యపరంగా ప్రమాదకరం','Non-venomous':'విషరహితం అని సాధారణంగా వర్గీకరించబడింది','Non-venomous (commonly classified)':'సాధారణంగా విషరహితంగా వర్గీకరించబడింది','Generally classified as non-venomous':'సాధారణంగా విషరహితంగా వర్గీకరించబడింది','Non-venomous, but a large powerful constrictor':'విషరహితం, కానీ బలమైన పెద్ద కొండచిలువ','Unknown — treat as potentially dangerous':'తెలియదు — ప్రమాదకరమని భావించండి','Reported as mildly venomous / rear-fanged — do not treat as harmless':'స్వల్ప విషం ఉండవచ్చని నివేదికలు ఉన్నాయి — హానిలేనిదిగా భావించవద్దు'},
    hi:{'Highly venomous; medically important':'अत्यधिक विषैला; चिकित्सकीय रूप से खतरनाक','Venomous; medically important':'विषैला; चिकित्सकीय रूप से खतरनाक','Non-venomous':'आमतौर पर विषहीन माना जाता है','Non-venomous (commonly classified)':'आमतौर पर विषहीन वर्गीकृत','Generally classified as non-venomous':'आमतौर पर विषहीन माना जाता है','Non-venomous, but a large powerful constrictor':'विषहीन, लेकिन बड़ा और शक्तिशाली अजगर','Unknown — treat as potentially dangerous':'अज्ञात — संभावित रूप से खतरनाक मानें','Reported as mildly venomous / rear-fanged — do not treat as harmless':'हल्का विषैला बताया गया है — सुरक्षित न मानें'}
  };

  function applyLanguage() {
    const t=currentUi();
    document.documentElement.lang=currentLanguage;
    document.querySelectorAll('[data-i18n]').forEach(node=>{const key=node.dataset.i18n;if(t[key])node.textContent=t[key];});
    document.querySelectorAll('.language-button').forEach(btn=>{const active=btn.dataset.language===currentLanguage;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));});
    document.getElementById('bite-urgency-text').textContent=t.biteUrgencyText;
    document.getElementById('species-survival-warning').textContent=t.survivalWarning;
    if(window.latestBiteResult){
      renderBiteLanguage(window.latestBiteResult);
      fillSources(document.getElementById('bite-sources'),window.latestBiteResult.sources);
    }
    if(window.latestSpeciesResult){
      renderSpeciesLanguage(window.latestSpeciesResult);
      const info=window.latestSpeciesResult.species_info||{};
      fillSources(document.getElementById('species-sources'),info.sources||[]);
    }
  }
  function renderBiteLanguage(result) {
    const biteHeading = !result.class_mapping_verified
      ? ('Unverified mapping — output class '+result.class_index+' (proposed label: '+result.proposed_label+')')
      : (currentLanguage==='te' ? 'మోడల్ ఫలితం: '+(result.proposed_label==='Venomous'?'విషపూరితమైనది':(result.proposed_label==='Non-Venomous'?'విషరహితం':result.proposed_label))
        : (currentLanguage==='hi' ? 'मॉडल परिणाम: '+(result.proposed_label==='Venomous'?'विषैला':(result.proposed_label==='Non-Venomous'?'विषहीन':result.proposed_label))
          : 'Model output: '+(result.proposed_label||result.label)));
    document.getElementById('bite-label').textContent=biteHeading;
    const tr=BITE_TRANSLATIONS[currentLanguage];
    if(!tr){
      const g=result.bite_specific_guidance||{};
      document.getElementById('bite-guidance-title').textContent=g.title||'Bite-specific warning signs';
      document.getElementById('bite-guidance-action').textContent=g.action||'';
      fillList(document.getElementById('bite-urgent-signs'),g.urgent_signs||[]);
      fillList(document.getElementById('bite-do-not'),g.do_not||[]);
      document.getElementById('bite-clinical-note').textContent=g.clinical_note||'';
      fillList(document.getElementById('first-aid-list'),result.first_aid||[]);
      return;
    }
    document.getElementById('bite-guidance-title').textContent=currentLanguage==='te'?'కాటు-సంబంధిత అత్యవసర హెచ్చరికలు':'काटने से जुड़े आपातकालीन चेतावनी संकेत';
    document.getElementById('bite-guidance-action').textContent=tr.action;
    fillList(document.getElementById('bite-urgent-signs'),tr.signs);
    fillList(document.getElementById('bite-do-not'),tr.dont);
    document.getElementById('bite-clinical-note').textContent=tr.note;
    fillList(document.getElementById('first-aid-list'),tr.firstAid);
  }
  function renderSpeciesLanguage(result) {
    const t=currentUi(),info=result.species_info||{},label=result.label;
    const translated=SPECIES_TRANSLATIONS[currentLanguage]?.[label];
    if(result.uncertain){
      document.getElementById('species-uncertain-reason').textContent=currentLanguage==='te'?'మోడల్ స్కోరు '+percent(result.confidence)+', మొదటి రెండు అంచనాల మధ్య తేడా '+percent(result.top_two_margin)+'. నమ్మకమైన గుర్తింపుగా ఈ ఫలితాన్ని చూపడం లేదు.':(currentLanguage==='hi'?'शीर्ष स्कोर '+percent(result.confidence)+' और पहले दो अनुमानों का अंतर '+percent(result.top_two_margin)+' है। इसे पक्की पहचान नहीं माना जा रहा है.':'The top score is '+percent(result.confidence)+' and the top-two score margin is '+percent(result.top_two_margin)+'. This is not a confident identification.');
      document.getElementById('species-candidate').textContent=currentLanguage==='te'?'అంచనా మాత్రమే (ధృవీకరించబడలేదు): '+(result.candidate_label||'తెలియదు'):(currentLanguage==='hi'?'संभावित नाम (पुष्टि नहीं): '+(result.candidate_label||'अज्ञात'):'Top candidate (not confirmed): '+(result.candidate_label||'unknown'));
      document.getElementById('species-uncertain-banner').querySelector('strong').textContent=t.uncertainTitle;
      document.getElementById('species-label').textContent=t.uncertainTitle;
      document.getElementById('species-status').textContent=t.speciesUnknown;
      document.getElementById('species-summary').textContent=t.unknownSummary;
      document.getElementById('species-precautions-wrap').querySelector('h4').textContent=t.uncertainPrecautions;
      fillList(document.getElementById('species-precautions'),t.unknownSpeciesList);
      return;
    }
    const speciesDisplayName=SPECIES_NAMES[currentLanguage]?.[label]||label;
    document.getElementById('species-label').textContent=speciesDisplayName;
    const riskStatus=info.venom_status||'Unknown — treat as potentially dangerous';
    document.getElementById('species-status').textContent=(currentLanguage==='en'?'Risk information: ': (currentLanguage==='te'?'ప్రమాద సమాచారం: ':'जोखिम जानकारी: '))+(RISK_NAMES[currentLanguage]?.[riskStatus]||riskStatus);
    if(translated){
      document.getElementById('species-summary').textContent=currentLanguage==='te'?'ఈ జాతి అంచనా మాత్రమే; ఫోటో ఆధారంగా ఖచ్చితమైన గుర్తింపు కాదు. పామును సమీపించవద్దు.':'यह केवल अनुमान है, फोटो से पुष्टि नहीं। साँप के पास न जाएँ।';
      document.getElementById('species-precautions-wrap').querySelector('h4').textContent=t.predictedPrecautions;
      fillList(document.getElementById('species-precautions'),translated);
    } else {
      document.getElementById('species-summary').textContent=info.summary||'';
      document.getElementById('species-precautions-wrap').querySelector('h4').textContent=t.predictedPrecautions;
      fillList(document.getElementById('species-precautions'),info.precautions||[]);
    }
  }


  function setImage(control, file) {
    if (!file) {
      control.input.value = '';
      control.preview.classList.add('hidden');
      control.placeholder.classList.remove('hidden');
      control.filename.textContent = control.emptyText;
      const prior = previewUrls.get(control.key);
      if (prior) URL.revokeObjectURL(prior);
      previewUrls.delete(control.key);
      return;
    }
    if (!allowed.includes(file.type)) {
      progress.textContent = 'Please select a JPG, PNG, WEBP, or BMP image.';
      control.input.value = '';
      return;
    }
    if (file.size <= 0 || file.size > maxBytes) {
      progress.textContent = `${file.name} is empty or exceeds the 8 MB per-image limit.`;
      control.input.value = '';
      return;
    }
    const prior = previewUrls.get(control.key);
    if (prior) URL.revokeObjectURL(prior);
    const url = URL.createObjectURL(file);
    previewUrls.set(control.key, url);
    control.preview.src = url;
    control.preview.classList.remove('hidden');
    control.placeholder.classList.add('hidden');
    control.filename.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
    progress.textContent = '';
  }

  imageControls.forEach(control => {
    control.input.addEventListener('change', () => setImage(control, control.input.files[0]));
    ['dragenter', 'dragover'].forEach(name => control.zone.addEventListener(name, event => {
      event.preventDefault();
      control.zone.classList.add('dragging');
    }));
    ['dragleave', 'drop'].forEach(name => control.zone.addEventListener(name, event => {
      event.preventDefault();
      control.zone.classList.remove('dragging');
    }));
    control.zone.addEventListener('drop', event => {
      const file = event.dataTransfer.files[0];
      if (!file || control.input.disabled) return;
      try {
        const transfer = new DataTransfer();
        transfer.items.add(file);
        control.input.files = transfer.files;
      } catch (_) { /* Standard file picker remains available. */ }
      setImage(control, file);
    });
  });

  function canvasToJpeg(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('The browser could not prepare this image for upload. Try another photo.'));
      }, 'image/jpeg', quality);
    });
  }

  async function compressImageForUpload(file, targetBytes) {
    if (typeof createImageBitmap !== 'function') {
      throw new Error('This browser cannot safely optimize images for upload. Please use an updated Chrome, Edge, or Firefox browser.');
    }
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch (_) {
      throw new Error(`Could not read "${file.name}". Please choose a valid JPG, PNG, WEBP, or BMP image.`);
    }

    try {
      const originalMaxSide = Math.max(bitmap.width, bitmap.height);
      const baseScale = Math.min(1, 1800 / originalMaxSide);
      const attempts = [
        { scale: baseScale, quality: 0.86 },
        { scale: baseScale, quality: 0.78 },
        { scale: baseScale, quality: 0.70 },
        { scale: baseScale * 0.85, quality: 0.68 },
        { scale: baseScale * 0.70, quality: 0.64 },
        { scale: baseScale * 0.55, quality: 0.60 },
      ];
      let blob = null;

      for (const attempt of attempts) {
        const width = Math.max(1, Math.round(bitmap.width * attempt.scale));
        const height = Math.max(1, Math.round(bitmap.height * attempt.scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) throw new Error('Your browser could not prepare this image. Please try another browser.');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        context.drawImage(bitmap, 0, 0, width, height);
        blob = await canvasToJpeg(canvas, attempt.quality);
        if (blob.size <= targetBytes) break;
      }

      if (!blob || blob.size > targetBytes) {
        throw new Error(`"${file.name}" is still too large after compression. Please choose a smaller image.`);
      }
      const safeBaseName = file.name.replace(/\.[^.]+$/, '') || 'image';
      return new File([blob], `${safeBaseName}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
    } finally {
      if (bitmap && typeof bitmap.close === 'function') bitmap.close();
    }
  }

  async function readApiResponse(response) {
    const responseText = await response.text();
    let data = {};

    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch (_) {
        const details = responseText.replace(/\s+/g, ' ').trim().slice(0, 160);
        if (response.status === 413) {
          throw new Error('The hosting service rejected this upload as too large. The images were optimized; try uploading one image at a time or choose smaller photos.');
        }
        if ([502, 503, 504].includes(response.status)) {
          throw new Error('SnakeVision is temporarily unable to start the AI service. Wait about 30 seconds and retry. You can also try one image at a time.');
        }
        if (response.status >= 500 && /INTERNAL_FUNCTION_INVOCATION_FAILED|FUNCTION_INVOCATION_TIMEOUT|internal server error|application error/i.test(responseText)) {
          throw new Error('The AI server stopped while processing this request. Please retry once. If it happens again, try the images separately and share the time of the error.');
        }
        if (!response.ok) {
          throw new Error(`Upload failed (HTTP ${response.status}). ${details}`);
        }
        throw new Error('The server returned an unreadable response. Please try again in a moment.');
      }
    }

    if (!response.ok) {
      if (response.status === 413) {
        throw new Error(data.error || 'The upload is too large. Please choose smaller images or upload one image at a time.');
      }
      throw new Error(data.error || data.details || data.message || `Request failed (HTTP ${response.status}).`);
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('The server returned an unexpected response. Please try again.');
    }
    return data;
  }

  function fillScoreList(element, items, colorClass = '') {
    element.replaceChildren();
    (items || []).forEach(item => {
      const row = document.createElement('div'); row.className = 'score-row';
      const name = document.createElement('span'); name.className = 'score-name'; name.textContent = item.label;
      const track = document.createElement('span'); track.className = 'score-track';
      const fill = document.createElement('span'); fill.className = `score-fill ${colorClass}`;
      fill.style.width = `${Math.max(0, Math.min(100, Number(item.score) * 100))}%`;
      track.appendChild(fill);
      const pct = document.createElement('span'); pct.className = 'score-pct'; pct.textContent = percent(item.score);
      row.append(name, track, pct); element.appendChild(row);
    });
  }

  function fillList(element, items) {
    element.replaceChildren();
    (items || []).forEach(item => {
      const li = document.createElement('li');
      li.textContent = String(item);
      element.appendChild(li);
    });
  }

  function fillSources(element, sources) {
    element.replaceChildren();
    if (!sources || !sources.length) return;
    const heading = document.createElement('strong');
    heading.textContent = currentUi().refs;
    element.appendChild(heading);
    const list = document.createElement('ul');
    sources.forEach(source => {
      if (!source || typeof source.url !== 'string' || !/^https?:\/\//i.test(source.url)) return;
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = source.url;
      link.textContent = source.label || source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      li.appendChild(link);
      list.appendChild(li);
    });
    element.appendChild(list);
  }

  function displayWarnings(containerId, listId, items) {
    const container = document.getElementById(containerId);
    const list = document.getElementById(listId);
    if (!items || !items.length) {
      container.classList.add('hidden');
      list.replaceChildren();
      return;
    }
    container.classList.remove('hidden');
    fillList(list, items);
  }

  function clearResults() {
    biteResultCard.classList.add('hidden');
    speciesResultCard.classList.add('hidden');
    resultsSection.classList.add('hidden');
    document.getElementById('species-uncertain-banner').classList.add('hidden');
    document.getElementById('species-candidate').classList.add('hidden');
  }

  function displayBite(result) {
    if (!result) return;
    window.latestBiteResult = result;
    biteResultCard.classList.remove('hidden');
    let heading = `Model output: ${result.label}`;
    if (!result.class_mapping_verified) {
      heading = `Unverified mapping — output class ${result.class_index} (proposed label: ${result.proposed_label})`;
    }
    const biteDisplayLabel = currentLanguage==='te' ? (result.proposed_label==='Venomous'?'విషపూరితమైనది':(result.proposed_label==='Non-Venomous'?'విషరహితం':result.proposed_label)) : (currentLanguage==='hi' ? (result.proposed_label==='Venomous'?'विषैला':(result.proposed_label==='Non-Venomous'?'विषहीन':result.proposed_label)) : (result.proposed_label||result.label));
    document.getElementById('bite-label').textContent = !result.class_mapping_verified ? heading : ((currentLanguage==='en'?'Model output: ':currentLanguage==='te'?'మోడల్ ఫలితం: ':'मॉडल परिणाम: ')+biteDisplayLabel);
    document.getElementById('bite-confidence').textContent = percent(result.confidence);
    fillScoreList(document.getElementById('bite-scores'), result.probabilities);
    document.getElementById('bite-medical-warning').textContent = result.medical_warning;
    fillList(document.getElementById('first-aid-list'), result.first_aid);
    const biteGuidance = result.bite_specific_guidance || {};
    document.getElementById('bite-guidance-title').textContent = biteGuidance.title || 'Bite-specific warning signs';
    document.getElementById('bite-guidance-action').textContent = biteGuidance.action || 'Any suspected snakebite needs immediate emergency medical care. Do not wait for this AI result.';
    fillList(document.getElementById('bite-urgent-signs'), biteGuidance.urgent_signs || []);
    fillList(document.getElementById('bite-do-not'), biteGuidance.do_not || []);
    document.getElementById('bite-clinical-note').textContent = biteGuidance.clinical_note || 'This is not a diagnosis or treatment plan.';
    displayWarnings('bite-warnings', 'bite-warning-list', result.warnings);
    fillSources(document.getElementById('bite-sources'), result.sources);
    renderBiteLanguage(result);
  }

  function displaySpecies(result) {
    if (!result) return;
    window.latestSpeciesResult = result;
    speciesResultCard.classList.remove('hidden');
    const info = result.species_info || {};
    document.getElementById('species-label').textContent = result.label;
    document.getElementById('species-confidence').textContent = percent(result.confidence);
    fillScoreList(document.getElementById('species-scores'), result.top_predictions, 'purple');
    document.getElementById('species-notice').textContent = result.notice || '';
    document.getElementById('species-survival-warning').textContent = result.survival_warning ||
      'Survival time cannot be predicted from a photo or model score. Any suspected bite needs immediate emergency medical care.';
    displayWarnings('species-warnings', 'species-warning-list', result.warnings);

    const uncertaintyBanner = document.getElementById('species-uncertain-banner');
    const candidate = document.getElementById('species-candidate');
    const status = document.getElementById('species-status');
    const precautionsWrap = document.getElementById('species-precautions-wrap');
    if (result.uncertain) {
      uncertaintyBanner.classList.remove('hidden');
      document.getElementById('species-uncertain-reason').textContent =
        `The top score is ${percent(result.confidence)} and the top-two score margin is ${percent(result.top_two_margin)}. This result is being withheld as a confident identification.`;
      candidate.textContent = `Top candidate (not a confirmed species): ${result.candidate_label || 'unknown'}`;
      candidate.classList.remove('hidden');
      document.getElementById('species-scientific-name').textContent = 'No scientific name assigned for an uncertain result.';
      status.textContent = 'Species/risk status not assigned';
      status.className = 'status-badge caution';
      document.getElementById('species-summary').textContent =
        'The image may be unrelated, blurred, low-detail, or difficult for this classifier. Do not infer that a snake is present or absent from this output.';
      fillList(document.getElementById('species-precautions'), [
        'Do not approach, touch, corner, or attempt to identify a snake at close range.',
        'Keep people and pets away; contact a trained local snake rescuer if a snake is present.',
        'For any suspected bite, seek emergency medical care immediately.'
      ]);
      fillSources(document.getElementById('species-sources'), []);
      precautionsWrap.querySelector('h4').textContent = 'General safety guidance (species not identified)';
    } else {
      uncertaintyBanner.classList.add('hidden');
      candidate.classList.add('hidden');
      document.getElementById('species-scientific-name').textContent = info.scientific_name || 'Scientific name not verified';
      status.textContent = `Risk information: ${info.venom_status || 'Unknown — treat as potentially dangerous'}`;
      status.className = `status-badge ${info.status_class || 'caution'}`;
      document.getElementById('species-summary').textContent = info.summary || '';
      fillList(document.getElementById('species-precautions'), info.precautions || []);
      fillSources(document.getElementById('species-sources'), info.sources || []);
      // Show the species-specific precautions already returned for this exact predicted class.
      // The prediction remains uncertain unless the model's confidence gate is passed.
      precautionsWrap.querySelector('h4').textContent = 'Precautions for the predicted species';
    }
    renderSpeciesLanguage(result);
  }

  async function loadDiagnostics() {
    const mapping = document.getElementById('diag-bite-order');
    const preprocessing = document.getElementById('diag-bite-preprocess');
    const threshold = document.getElementById('diag-species-threshold');
    try {
      const response = await fetch('/api/diagnostics', { cache: 'no-store' });
      const data = await response.json();
      const bite = data.bite_model || {};
      const species = data.species_model || {};
      mapping.textContent = bite.class_order_verified ? 'Verified' : 'Needs MATLAB verification';
      mapping.className = `diagnostic-status ${bite.class_order_verified ? 'good' : 'needs-review'}`;
      preprocessing.textContent = bite.input_preprocessing_verified ? 'Verified' : 'Needs MATLAB verification';
      preprocessing.className = `diagnostic-status ${bite.input_preprocessing_verified ? 'good' : 'needs-review'}`;
      threshold.textContent = species.thresholds_validated ? 'Validation calibrated' : 'Preliminary only';
      threshold.className = `diagnostic-status ${species.thresholds_validated ? 'good' : 'needs-review'}`;
    } catch (_) {
      [mapping, preprocessing, threshold].forEach(node => {
        node.textContent = 'Diagnostics unavailable';
        node.className = 'diagnostic-status needs-review';
      });
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const biteFile = biteInput.files[0];
    const snakeFile = snakeInput.files[0];
    if (!biteFile && !snakeFile) {
      progress.textContent = 'Upload a bite-area photo, a snake photo, or both in their separate boxes.';
      return;
    }
    if ((biteFile && !allowed.includes(biteFile.type)) || (snakeFile && !allowed.includes(snakeFile.type))) {
      progress.textContent = 'One of the selected files is not a supported image type.';
      return;
    }
    if ((biteFile && biteFile.size > maxBytes) || (snakeFile && snakeFile.size > maxBytes)) {
      progress.textContent = 'Each image must be 8 MB or smaller.';
      return;
    }

    button.disabled = true;
    button.querySelector('span:first-child').textContent = 'Analyzing…';
    progress.textContent = 'Running each selected image through its matching model. The upload is processed in memory.';
    clearResults();

    try {
      const selectedFiles = [];
      if (biteFile) selectedFiles.push({ field: 'bite_image', file: biteFile });
      if (snakeFile) selectedFiles.push({ field: 'snake_image', file: snakeFile });

      progress.textContent = 'Optimizing selected images for upload…';
      const perImageBudget = selectedFiles.length === 1
        ? maxRequestBytes
        : Math.floor(maxRequestBytes / selectedFiles.length);
      const preparedFiles = [];
      // Compress one image at a time to avoid large simultaneous browser canvases.
      for (const item of selectedFiles) {
        const prepared = await compressImageForUpload(item.file, perImageBudget);
        preparedFiles.push({
          field: item.field,
          originalSize: item.file.size,
          file: prepared,
        });
      }
      const preparedTotal = preparedFiles.reduce((total, item) => total + item.file.size, 0);
      if (preparedTotal > maxRequestBytes) {
        throw new Error('The optimized images are still too large to send together. Please upload one image at a time.');
      }

      const body = new FormData();
      preparedFiles.forEach(item => body.append(item.field, item.file, item.file.name));
      const originalTotal = preparedFiles.reduce((total, item) => total + item.originalSize, 0);
      const mb = value => (value / 1024 / 1024).toFixed(2);
      progress.textContent = `Images prepared (${mb(originalTotal)} MB → ${mb(preparedTotal)} MB). Running analysis…`;

      const response = await fetch('/api/predict', { method: 'POST', body, cache: 'no-store' });
      const data = await readApiResponse(response);
      displayBite(data.bite_result);
      displaySpecies(data.species_result);
      resultsSection.classList.remove('hidden');
      progress.textContent = data.safety_notice || 'Analysis complete. Predictions are estimates.';
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      progress.textContent = error.name === 'TypeError'
        ? 'Could not reach the SnakeVision server. Check your internet connection and try again.'
        : (error.message || 'Analysis failed. Please retry once.');
    } finally {
      button.disabled = false;
      button.querySelector('span:first-child').textContent = 'Analyze selected image(s)';
    }
  });

  document.querySelectorAll('.language-button').forEach(btn => btn.addEventListener('click', () => { currentLanguage=btn.dataset.language||'en'; applyLanguage(); }));
  applyLanguage();
  loadDiagnostics();
  window.addEventListener('beforeunload', () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
  });
})();
