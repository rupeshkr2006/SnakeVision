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
  let currentLanguage = (() => { try { return ['en','te','hi'].includes(localStorage.getItem('snakevision-language')) ? localStorage.getItem('snakevision-language') : 'en'; } catch (_) { return 'en'; } })();

  const emergencyPopup = document.getElementById("emergency-popup");
  const popupLocationStatus = document.getElementById("popup-location-status");
  const popupHospitalLink = document.getElementById("popup-hospital-link");
  function showEmergencyPopup(reason) {
    const title = document.getElementById("emergency-popup-title");
    const message = document.getElementById("emergency-popup-message");
    if (reason === "bite") {
      title.textContent = currentLanguage === "te" ? "పాము కాటు అనుమానం — అత్యవసర వైద్యం అవసరం" : currentLanguage === "hi" ? "साँप के काटने का संदेह — तुरंत चिकित्सा लें" : "Possible snakebite — emergency care now";
      message.textContent = currentLanguage === "te" ? "కాటు ప్రాంతం చిత్రం విశ్లేషించబడింది. ఈ AI ఫలితం విషం శరీరంలోకి వెళ్లిందో లేదో నిర్ధారించదు. వెంటనే 112కు కాల్ చేయండి లేదా అత్యవసర ఆసుపత్రికి వెళ్లండి." : currentLanguage === "hi" ? "काटे गए क्षेत्र की छवि का विश्लेषण हुआ है। AI यह नहीं बता सकता कि शरीर में विष गया है या नहीं। 112 पर कॉल करें या तुरंत अस्पताल जाएँ।" : "A bite-area image was analyzed. This AI result cannot tell whether venom entered the body. Call 112 or go to an emergency-capable hospital now.";
    } else {
      title.textContent = currentLanguage === "te" ? "విషపూరిత పాము గుర్తింపు — జాగ్రత్త" : currentLanguage === "hi" ? "विषैले साँप की पहचान — सावधानी" : "Potentially venomous snake detected";
      message.textContent = currentLanguage === "te" ? "ఇది ఫోటో ఆధారిత అంచనా మాత్రమే. ఎవరినైనా కరిచి ఉండవచ్చని అనుమానం ఉంటే వెంటనే 112కు కాల్ చేయండి లేదా ఆసుపత్రికి వెళ్లండి." : currentLanguage === "hi" ? "यह केवल फोटो-आधारित अनुमान है। किसी को काटे जाने का संदेह हो तो तुरंत 112 पर कॉल करें या अस्पताल जाएँ।" : "This is only a photo-based prediction, not confirmation. If anyone may have been bitten, call 112 or seek emergency hospital care immediately.";
    }
    emergencyPopup.classList.remove("hidden");
  }
  document.getElementById("emergency-popup-close").addEventListener("click", () => emergencyPopup.classList.add("hidden"));
  document.getElementById("popup-hospital-button").addEventListener("click", () => {
    popupHospitalLink.classList.add("hidden");
    popupLocationStatus.textContent = "Requesting your location…";
    if (!navigator.geolocation) { popupLocationStatus.textContent = "Location is unavailable in this browser. Call 112 for emergency assistance."; return; }
    navigator.geolocation.getCurrentPosition(position => {
      const lat = position.coords.latitude, lon = position.coords.longitude;
      popupHospitalLink.href = "https://www.google.com/maps/search/hospitals/@" + lat + "," + lon + ",14z";
      popupHospitalLink.textContent = "View nearby hospitals on Google Maps ↗";
      popupHospitalLink.classList.remove("hidden");
      popupLocationStatus.textContent = "Location received. Open the link to view nearby hospitals.";
    }, error => { popupLocationStatus.textContent = error && error.code === 1 ? "Location permission denied. You can still call 112." : "Could not get location. Check device settings or call 112."; }, {enableHighAccuracy:true,timeout:12000,maximumAge:60000});
  });

  const UI_TEXT = {
    en:{analysis:'ANALYSIS',resultsTitle:'Results and precautions',languageLabel:'Language',biteResultLabel:'ONNX · BITE-AREA IMAGE SCORE',speciesResultLabel:'DINOV2 · CLOSED-SET SPECIES CLASSIFIER',modelScore:'Model score',topModelScore:'Top model score',notCalibrated:'(not a calibrated medical probability)',notCalibratedShort:'(not a calibrated probability)',verificationWarnings:'Verification / quality warnings',notDiagnosis:'Not a medical diagnosis',imageModelWarnings:'Image and model warnings',symptomsHeading:'Emergency symptoms to watch for',dontHeading:'Do not do these things',firstAidHeading:'Immediate first aid while arranging transport',speciesPrecautionsHeading:'Precautions for the predicted species',biteUrgencyTitle:'TIME-CRITICAL: suspected bite — emergency care NOW',biteUrgencyText:'Leave for the nearest emergency-capable hospital immediately. Do not wait for swelling, pain, weakness, or this AI result.',speciesUrgencyTitle:'Snake photo is not a patient risk assessment',speciesUrgencyText:'If a person may have been bitten, seek emergency care now regardless of the predicted species or visible symptoms.',urgencyTitle:'TIME-CRITICAL: go to a hospital NOW',survivalWarning:'A photograph cannot predict survival time or show whether venom was injected. Do not wait for symptoms or an AI result. India’s national guideline calls for at least 24 hours of clinical observation at a health facility after suspected snakebite. This is an observation recommendation, not a survival estimate.',refs:'References',uncertainTitle:'Unable to identify confidently',uncertainPrecautions:'General safety guidance (species not identified)',predictedPrecautions:'Precautions for the predicted species',speciesUnknown:'Species/risk status not assigned',unknownSummary:'The image may be unrelated, blurred, low-detail, or difficult for this classifier. Do not infer that a snake is present or absent from this output.',unknownSpeciesList:['Do not approach, touch, corner, or attempt to identify a snake at close range.','Keep people and pets away; contact a trained local snake rescuer if a snake is present.','For any suspected bite, seek emergency medical care immediately.']},
    te:{analysis:'విశ్లేషణ',resultsTitle:'ఫలితాలు మరియు జాగ్రత్తలు',languageLabel:'భాష',biteResultLabel:'ONNX · కాటు ప్రాంత చిత్ర స్కోరు',speciesResultLabel:'DINOV2 · 13 జాతుల పాము వర్గీకరణ',modelScore:'మోడల్ స్కోరు',topModelScore:'అత్యధిక మోడల్ స్కోరు',notCalibrated:'(వైద్య సంభావ్యతగా ధృవీకరించబడలేదు)',notCalibratedShort:'(ధృవీకరించిన సంభావ్యత కాదు)',verificationWarnings:'ధృవీకరణ / చిత్ర నాణ్యత హెచ్చరికలు',notDiagnosis:'ఇది వైద్య నిర్ధారణ కాదు',imageModelWarnings:'చిత్రం మరియు మోడల్ హెచ్చరికలు',symptomsHeading:'గమనించాల్సిన అత్యవసర లక్షణాలు',dontHeading:'చేయకూడని పనులు',firstAidHeading:'ఆసుపత్రికి తరలించేలోపు తక్షణ ప్రథమ చికిత్స',speciesPrecautionsHeading:'అంచనా వేసిన పాము జాతికి ప్రత్యేక జాగ్రత్తలు',biteUrgencyTitle:'అత్యవసరం: పాము కాటు అనుమానం — వెంటనే ఆసుపత్రికి వెళ్లండి',biteUrgencyText:'వెంటనే అత్యవసర వైద్యం అందించే సమీప ఆసుపత్రికి బయలుదేరండి. వాపు, నొప్పి, బలహీనత లేదా ఈ AI ఫలితం కోసం వేచి ఉండకండి.',speciesUrgencyTitle:'పాము ఫోటో రోగి ప్రమాద స్థాయిని నిర్ధారించదు',speciesUrgencyText:'ఎవరినైనా పాము కరిచి ఉండవచ్చని అనుమానం ఉంటే, అంచనా వేసిన జాతి లేదా కనిపించే లక్షణాలతో సంబంధం లేకుండా వెంటనే అత్యవసర వైద్యం పొందండి.',urgencyTitle:'అత్యవసరం: ఇప్పుడే ఆసుపత్రికి వెళ్లండి',survivalWarning:'ఫోటో ద్వారా రోగి ఎంతకాలం బతుకుతారో లేదా విషం శరీరంలోకి వెళ్లిందో చెప్పలేము. లక్షణాలు లేదా AI ఫలితం కోసం వేచి ఉండకండి. భారత జాతీయ మార్గదర్శకం ప్రకారం అనుమానిత పాము కాటు తర్వాత కనీసం 24 గంటలు వైద్య కేంద్రంలో పరిశీలన అవసరం. ఇది పరిశీలన సూచన మాత్రమే; బతికే సమయ అంచనా కాదు.',refs:'ఆధారాలు',uncertainTitle:'పామును నమ్మకంగా గుర్తించలేకపోయాం',uncertainPrecautions:'సాధారణ భద్రతా సూచనలు (జాతి గుర్తించబడలేదు)',predictedPrecautions:'అంచనా వేసిన పాము జాతికి జాగ్రత్తలు',speciesUnknown:'జాతి / ప్రమాద స్థాయి నిర్ధారించబడలేదు',unknownSummary:'చిత్రం సంబంధం లేనిదై ఉండవచ్చు, అస్పష్టంగా లేదా తక్కువ వివరాలతో ఉండవచ్చు. ఈ ఫలితం ఆధారంగా పాము ఉందని లేదా లేదని నిర్ణయించవద్దు.',unknownSpeciesList:['పాముకు దగ్గరగా వెళ్లవద్దు, తాకవద్దు, చుట్టుముట్టవద్దు లేదా దగ్గరగా గుర్తించడానికి ప్రయత్నించవద్దు.','ప్రజలు, పెంపుడు జంతువులను దూరంగా ఉంచండి; పాము ఉంటే శిక్షణ పొందిన స్థానిక స్నేక్ రెస్క్యూను సంప్రదించండి.','కాటు అనుమానం ఉన్నా వెంటనే అత్యవసర వైద్య సహాయం పొందండి.']},
    hi:{analysis:'विश्लेषण',resultsTitle:'परिणाम और सावधानियाँ',languageLabel:'भाषा',biteResultLabel:'ONNX · काटे गए क्षेत्र की छवि स्कोर',speciesResultLabel:'DINOV2 · 13 प्रजातियों का साँप वर्गीकरण',modelScore:'मॉडल स्कोर',topModelScore:'सबसे अधिक मॉडल स्कोर',notCalibrated:'(चिकित्सकीय संभावना के रूप में प्रमाणित नहीं)',notCalibratedShort:'(प्रमाणित संभावना नहीं)',verificationWarnings:'सत्यापन / छवि गुणवत्ता चेतावनियाँ',notDiagnosis:'यह चिकित्सा निदान नहीं है',imageModelWarnings:'छवि और मॉडल चेतावनियाँ',symptomsHeading:'ध्यान देने योग्य आपातकालीन लक्षण',dontHeading:'ये काम बिल्कुल न करें',firstAidHeading:'अस्पताल पहुँचने तक तुरंत प्राथमिक सहायता',speciesPrecautionsHeading:'अनुमानित साँप की प्रजाति के अनुसार सावधानियाँ',biteUrgencyTitle:'अत्यावश्यक: साँप के काटने का संदेह — अभी अस्पताल जाएँ',biteUrgencyText:'तुरंत निकटतम आपातकालीन सुविधा वाले अस्पताल के लिए निकलें। सूजन, दर्द, कमजोरी या इस AI परिणाम का इंतज़ार न करें।',speciesUrgencyTitle:'साँप की फोटो रोगी के जोखिम का आकलन नहीं है',speciesUrgencyText:'यदि किसी व्यक्ति को साँप ने काटा हो सकता है, तो अनुमानित प्रजाति या दिखने वाले लक्षणों की परवाह किए बिना तुरंत आपातकालीन चिकित्सा लें।',urgencyTitle:'अत्यावश्यक: अभी अस्पताल जाएँ',survivalWarning:'फोटो से यह अनुमान नहीं लगाया जा सकता कि मरीज कितने समय तक जीवित रहेगा या शरीर में विष गया है या नहीं। लक्षणों या AI परिणाम का इंतज़ार न करें। भारत के राष्ट्रीय दिशानिर्देश संदिग्ध साँप के काटने के बाद स्वास्थ्य केंद्र में कम-से-कम 24 घंटे चिकित्सकीय निगरानी की सलाह देते हैं। यह निगरानी की सलाह है, जीवित रहने का अनुमान नहीं।',refs:'संदर्भ',uncertainTitle:'प्रजाति की विश्वसनीय पहचान नहीं हो सकी',uncertainPrecautions:'सामान्य सुरक्षा निर्देश (प्रजाति की पहचान नहीं हुई)',predictedPrecautions:'अनुमानित प्रजाति के लिए सावधानियाँ',speciesUnknown:'प्रजाति / जोखिम की पुष्टि नहीं हुई',unknownSummary:'तस्वीर असंबंधित, धुंधली या कम विवरण वाली हो सकती है। इस परिणाम से यह निष्कर्ष न निकालें कि साँप मौजूद है या नहीं।',unknownSpeciesList:['साँप के पास न जाएँ, उसे न छुएँ, घेरें नहीं और पास जाकर पहचानने की कोशिश न करें।','लोगों और पालतू जानवरों को दूर रखें; साँप दिखे तो प्रशिक्षित स्थानीय रेस्क्यू टीम से संपर्क करें।','काटने का संदेह हो तो तुरंत आपातकालीन चिकित्सा लें।']}
  };

  const PAGE_TEXT = {"en":{"pageLocalPrototype":"Local prototype","modelChipBite":"01 · ONNX ResNet18 · bite-area photo","modelChipSnake":"02 · DINOv2 · snake photo · 13 species","heroEyebrow":"TWO MODELS · TWO DIFFERENT IMAGE TYPES","heroTitle":"Choose the right photo.","heroTitle2":"Get cautious, useful guidance.","heroDescription":"The bite-area image model and snake-species model were trained for different tasks. Upload each photo in its own box; either model can be run independently.","emergencyTitle":"Suspected snakebite? Get emergency medical help now.","emergencyText":"Do not wait for this website or for symptoms. Move away from the snake, keep the person still, immobilize the bitten limb with a splint if possible, remove rings or tight items near the area if easy to do, and arrange urgent transport to a hospital.","emergencyDont":"Do not cut or suck the wound, apply a tight tourniquet, use ice, or try traditional/herbal remedies. Do not try to catch or kill the snake.","emergencyLink":"WHO snakebite treatment guidance ↗","privacy":"Privacy:","privacyText":"This application processes uploads in memory and does not intentionally save the uploaded images. Avoid uploading identifiable or sensitive images unless necessary. The browser preview is kept in your current page only.","bitePhoto":"Bite-area photo","bitePhotoPurpose":"For the MATLAB ONNX image classifier","biteUse":"Use for:","biteUseText":"photo of the affected body area, if available. The model scores image patterns; it cannot determine whether venom entered the body or diagnose a bite.","chooseBite":"Choose bite-area image","fileTypes":"JPG, PNG, WEBP, BMP · max 8 MB","noBite":"No bite-area photo selected","snakePhoto":"Snake photo","snakePhotoPurpose":"For the DINOv2 13-species classifier","snakeUse":"Use for:","snakeUseText":"clear photo of the snake from a safe distance. Never move closer or handle it to obtain an image.","chooseSnake":"Choose snake image","noSnake":"No snake photo selected","analyze":"Analyze selected image(s)","uploadHint":"Upload either image or both in their separate boxes. The selected image is not stored by this app.","analysis":"ANALYSIS","resultsTitle":"Results and precautions","languageLabel":"Language","modelChecks":"Model checks before public use","modelChecksText":"These checks show what is verified and what still needs human review.","diagOrder":"ONNX class order","diagPreprocess":"ONNX preprocessing","diagThreshold":"Species thresholds","diagUploads":"Uploads & privacy","checking":"Checking…","diagOrderText":"Confirm output index 0 and 1 against the original MATLAB class list.","diagPreprocessText":"Confirm RGB/BGR, pixel scale, resize and normalization in MATLAB.","diagThresholdText":"Calibrate on labeled validation snakes plus unrelated negative controls—not test images.","diagMemory":"Memory only","diagPrivacyText":"Uploads are size/type checked and not deliberately written to disk by this app.","diagNote":"A score threshold can flag some uncertain images, but it cannot replace a separately trained and tested snake-versus-non-snake detector. Even a high score can be wrong.","safetyTitle":"Important safety notice","safetyText":"Both models are experimental. A species label cannot confirm the snake, and a bite-area model cannot establish whether venom entered the body. For any suspected snakebite, keep the person still, immobilize the affected limb if possible, remove constricting items if easy, and seek emergency medical care immediately. Do not wait for an AI result.","safetyLink":"WHO snakebite information ↗","footerLeft":"SnakeVision AI · Experimental local prototype","footerRight":"Predictions are estimates. Never approach or handle any snake.","survivalHeading":"Can this snake's photo predict how long someone would survive?","survivalText":"No. The species classifier predicts a possible snake species; it does not assess an individual bite, venom dose, or the patient's condition. Survival time cannot be reliably estimated from this photo. If anyone may have been bitten, seek emergency medical care immediately.","biteSurvivalHeading":"Can the bite-area model estimate survival time?","biteSurvivalText":"No. It scores the uploaded image only. It cannot confirm a bite, venom injection, venom dose or patient condition. It cannot estimate survival time. If a bite is suspected, go to a hospital immediately.","clinicalProfileHeading":"Typical medical effects if envenoming occurs","clinicalProfileNote":"No reliable survival-time estimate","clinicalProfileNoteText":"A species label cannot predict how long a person would survive. The 2025 Government of India snakebite guideline recommends at least 24 hours of clinical observation for suspected bites, even if symptoms are absent. This is a hospital observation period, not a survival estimate. Seek emergency care immediately."},"te":{"pageLocalPrototype":"స్థానిక నమూనా","modelChipBite":"01 · ONNX ResNet18 · కాటు ప్రాంత ఫోటో","modelChipSnake":"02 · DINOv2 · పాము ఫోటో · 13 జాతులు","heroEyebrow":"రెండు మోడళ్లు · రెండు వేర్వేరు చిత్ర రకాలు","heroTitle":"సరైన ఫోటోను ఎంచుకోండి.","heroTitle2":"జాగ్రత్తతో కూడిన ఉపయోగకరమైన సూచనలు పొందండి.","heroDescription":"కాటు ప్రాంత చిత్రం మోడల్ మరియు పాము జాతి మోడల్ వేర్వేరు పనుల కోసం రూపొందించబడ్డాయి. ప్రతి ఫోటోను దానికి సంబంధించిన బాక్స్‌లో అప్‌లోడ్ చేయండి.","emergencyTitle":"పాము కాటు అనుమానమా? వెంటనే అత్యవసర వైద్య సహాయం పొందండి.","emergencyText":"ఈ వెబ్‌సైట్ లేదా లక్షణాల కోసం వేచి ఉండకండి. పాముకు దూరంగా వెళ్లండి, బాధితుడిని కదలకుండా ఉంచండి, వీలైతే కరిచిన అవయవాన్ని స్ప్లింట్‌తో స్థిరపరచండి, సులభమైతే ఉంగరాలు లేదా బిగుతైన వస్తువులను తొలగించి వెంటనే ఆసుపత్రికి తరలించండి.","emergencyDont":"గాయాన్ని కోయవద్దు లేదా విషాన్ని పీల్చవద్దు; బిగుతైన టోర్నికెట్, మంచు, సంప్రదాయ/మూలికా మందులు వాడవద్దు. పామును పట్టుకోవడానికి లేదా చంపడానికి ప్రయత్నించవద్దు.","emergencyLink":"WHO పాము కాటు చికిత్స మార్గదర్శకం ↗","privacy":"గోప్యత:","privacyText":"ఈ అప్లికేషన్ అప్‌లోడ్ చేసిన చిత్రాలను మెమరీలోనే ప్రాసెస్ చేస్తుంది; ఉద్దేశపూర్వకంగా సేవ్ చేయదు. అవసరం లేకపోతే వ్యక్తిగత వివరాలున్న చిత్రాలను అప్‌లోడ్ చేయవద్దు.","bitePhoto":"కాటు ప్రాంత ఫోటో","bitePhotoPurpose":"MATLAB ONNX చిత్ర వర్గీకరణ మోడల్ కోసం","biteUse":"దీని కోసం:","biteUseText":"సాధ్యమైతే ప్రభావితమైన శరీర భాగం ఫోటో. ఈ మోడల్ చిత్ర నమూనాలను మాత్రమే స్కోర్ చేస్తుంది; విషం శరీరంలోకి వెళ్లిందో లేదా కాటు జరిగిందో నిర్ధారించదు.","chooseBite":"కాటు ప్రాంత చిత్రాన్ని ఎంచుకోండి","fileTypes":"JPG, PNG, WEBP, BMP · గరిష్ఠం 8 MB","noBite":"కాటు ప్రాంత ఫోటో ఎంచుకోలేదు","snakePhoto":"పాము ఫోటో","snakePhotoPurpose":"DINOv2 13-జాతుల వర్గీకరణ మోడల్ కోసం","snakeUse":"దీని కోసం:","snakeUseText":"సురక్షిత దూరం నుంచి పాము స్పష్టమైన ఫోటో. ఫోటో కోసం దగ్గరకు వెళ్లవద్దు లేదా పామును తాకవద్దు.","chooseSnake":"పాము చిత్రాన్ని ఎంచుకోండి","noSnake":"పాము ఫోటో ఎంచుకోలేదు","analyze":"ఎంచుకున్న చిత్రాలను విశ్లేషించండి","uploadHint":"ఏదైనా ఒక చిత్రాన్ని లేదా రెండు చిత్రాలను వాటి బాక్స్‌లలో అప్‌లోడ్ చేయండి. చిత్రాలు సేవ్ చేయబడవు.","analysis":"విశ్లేషణ","resultsTitle":"ఫలితాలు మరియు జాగ్రత్తలు","languageLabel":"భాష","modelChecks":"ప్రజలకు విడుదలకు ముందు మోడల్ తనిఖీలు","modelChecksText":"ఏవి ధృవీకరించబడ్డాయో, ఇంకా ఏవి మానవ సమీక్షకు అవసరమో ఈ తనిఖీలు చూపిస్తాయి.","diagOrder":"ONNX తరగతి క్రమం","diagPreprocess":"ONNX ప్రీప్రాసెసింగ్","diagThreshold":"జాతి పరిమితులు","diagUploads":"అప్‌లోడ్‌లు మరియు గోప్యత","checking":"తనిఖీ చేస్తోంది…","diagOrderText":"MATLAB అసలు తరగతి జాబితాతో అవుట్‌పుట్ సూచికలు 0 మరియు 1 సరిపోల్చండి.","diagPreprocessText":"MATLABలో RGB/BGR, పిక్సెల్ స్కేల్, రీసైజ్ మరియు నార్మలైజేషన్‌ను నిర్ధారించండి.","diagThresholdText":"పరీక్షా చిత్రాలు కాకుండా లేబుల్ చేసిన ధృవీకరణ పాము చిత్రాలు మరియు సంబంధంలేని ప్రతికూల చిత్రాలతో కాలిబ్రేట్ చేయండి.","diagMemory":"మెమరీలో మాత్రమే","diagPrivacyText":"అప్‌లోడ్‌ల రకం, పరిమాణం తనిఖీ చేసి డిస్క్‌లో ఉద్దేశపూర్వకంగా సేవ్ చేయము.","diagNote":"స్కోరు పరిమితి కొన్ని అనిశ్చిత చిత్రాలను గుర్తించగలదు; కానీ ప్రత్యేకంగా శిక్షణ ఇచ్చి పరీక్షించిన పాము-గుర్తింపు మోడల్‌కు ఇది ప్రత్యామ్నాయం కాదు. అధిక స్కోరు కూడా తప్పు కావచ్చు.","safetyTitle":"ముఖ్యమైన భద్రతా సూచన","safetyText":"రెండు మోడళ్లు ప్రయోగాత్మకమైనవి. జాతి పేరు పామును ఖచ్చితంగా నిర్ధారించదు; కాటు ప్రాంత మోడల్ విషం శరీరంలోకి వెళ్లిందో చెప్పదు. కాటు అనుమానం ఉంటే బాధితుడిని కదలకుండా ఉంచి, సాధ్యమైతే కరిచిన అవయవాన్ని స్థిరపరచి, వెంటనే అత్యవసర వైద్యం పొందండి.","safetyLink":"WHO పాము కాటు సమాచారం ↗","footerLeft":"SnakeVision AI · ప్రయోగాత్మక నమూనా","footerRight":"అంచనాలు తప్పు కావచ్చు. ఏ పామునూ సమీపించవద్దు లేదా తాకవద్దు.","survivalHeading":"ఈ పాము ఫోటో ద్వారా మనిషి ఎంతసేపు బతుకుతారో చెప్పగలమా?","survivalText":"లేదు. జాతి వర్గీకరణ మోడల్ పాము జాతిని మాత్రమే అంచనా వేస్తుంది; వ్యక్తి కాటు, విషం పరిమాణం లేదా రోగి ఆరోగ్య పరిస్థితిని అంచనా వేయదు. ఈ ఫోటో ఆధారంగా బతికే సమయాన్ని నమ్మకంగా చెప్పలేము. ఎవరినైనా కరిచి ఉండవచ్చని అనుమానం ఉంటే వెంటనే అత్యవసర వైద్యం పొందండి.","biteSurvivalHeading":"కాటు ప్రాంత మోడల్ బతికే సమయాన్ని అంచనా వేయగలదా?","biteSurvivalText":"లేదు. ఇది అప్‌లోడ్ చేసిన చిత్రాన్ని మాత్రమే స్కోర్ చేస్తుంది. పాము కరిచిందా, విషం చేరిందా, ఎంత విషం చేరింది లేదా రోగి పరిస్థితి ఏమిటో నిర్ధారించదు. బతికే సమయాన్ని అంచనా వేయలేదు. కాటు అనుమానం ఉంటే వెంటనే ఆసుపత్రికి వెళ్లండి.","clinicalProfileHeading":"విషప్రభావం ఉంటే సాధారణ వైద్య ప్రభావాలు","clinicalProfileNote":"బతికే సమయాన్ని నమ్మకంగా అంచనా వేయలేము","clinicalProfileNoteText":"జాతి పేరు ఆధారంగా ఒక వ్యక్తి ఎంతసేపు బతుకుతారో చెప్పలేము. 2025 భారత ప్రభుత్వ పాము కాటు మార్గదర్శకం ప్రకారం, లక్షణాలు లేకపోయినా అనుమానిత కాటు బాధితులను కనీసం 24 గంటలు వైద్య పర్యవేక్షణలో ఉంచాలి. ఇది ఆసుపత్రి పరిశీలన సమయం మాత్రమే; బతికే సమయ అంచనా కాదు. వెంటనే అత్యవసర వైద్యం పొందండి."},"hi":{"pageLocalPrototype":"स्थानीय प्रोटोटाइप","modelChipBite":"01 · ONNX ResNet18 · काटे गए हिस्से की तस्वीर","modelChipSnake":"02 · DINOv2 · साँप की तस्वीर · 13 प्रजातियाँ","heroEyebrow":"दो मॉडल · दो अलग-अलग प्रकार की तस्वीरें","heroTitle":"सही तस्वीर चुनें।","heroTitle2":"सावधानीपूर्ण और उपयोगी मार्गदर्शन पाएँ।","heroDescription":"काटे गए हिस्से की तस्वीर वाला मॉडल और साँप की प्रजाति वाला मॉडल अलग-अलग कामों के लिए बनाए गए हैं। हर तस्वीर को उसके अलग बॉक्स में अपलोड करें।","emergencyTitle":"साँप के काटने का संदेह है? तुरंत आपातकालीन चिकित्सा सहायता लें।","emergencyText":"इस वेबसाइट या लक्षणों का इंतज़ार न करें। साँप से दूर जाएँ, व्यक्ति को स्थिर रखें, संभव हो तो काटे गए अंग को स्प्लिंट से स्थिर करें, आसानी से हट सकें तो अंगूठी या कसी चीज़ें हटाएँ और तुरंत अस्पताल ले जाएँ।","emergencyDont":"घाव को न काटें, विष न चूसें, कसकर tourniquet न बाँधें, बर्फ या पारंपरिक/हर्बल उपचार न लगाएँ। साँप को पकड़ने या मारने की कोशिश न करें।","emergencyLink":"WHO साँप काटने के उपचार की जानकारी ↗","privacy":"गोपनीयता:","privacyText":"यह ऐप अपलोड की गई तस्वीरों को मेमोरी में प्रोसेस करता है और जानबूझकर सेव नहीं करता। आवश्यकता न हो तो पहचान योग्य या संवेदनशील तस्वीरें अपलोड न करें।","bitePhoto":"काटे गए हिस्से की तस्वीर","bitePhotoPurpose":"MATLAB ONNX इमेज क्लासिफायर के लिए","biteUse":"इसका उपयोग:","biteUseText":"यदि उपलब्ध हो तो प्रभावित शरीर के हिस्से की तस्वीर। मॉडल केवल तस्वीर के पैटर्न को स्कोर करता है; यह नहीं बता सकता कि विष शरीर में गया या काटा गया है।","chooseBite":"काटे गए हिस्से की तस्वीर चुनें","fileTypes":"JPG, PNG, WEBP, BMP · अधिकतम 8 MB","noBite":"काटे गए हिस्से की तस्वीर नहीं चुनी गई","snakePhoto":"साँप की तस्वीर","snakePhotoPurpose":"DINOv2 13-प्रजाति क्लासिफायर के लिए","snakeUse":"इसका उपयोग:","snakeUseText":"सुरक्षित दूरी से साँप की स्पष्ट तस्वीर। तस्वीर लेने के लिए पास न जाएँ और उसे न छुएँ।","chooseSnake":"साँप की तस्वीर चुनें","noSnake":"साँप की तस्वीर नहीं चुनी गई","analyze":"चुनी गई तस्वीरों का विश्लेषण करें","uploadHint":"किसी एक या दोनों तस्वीरों को उनके अलग बॉक्स में अपलोड करें। तस्वीर ऐप में सेव नहीं होती।","analysis":"विश्लेषण","resultsTitle":"परिणाम और सावधानियाँ","languageLabel":"भाषा","modelChecks":"सार्वजनिक उपयोग से पहले मॉडल जाँच","modelChecksText":"ये जाँच दिखाती हैं कि क्या सत्यापित है और किसकी मानवीय समीक्षा बाकी है।","diagOrder":"ONNX क्लास क्रम","diagPreprocess":"ONNX प्रीप्रोसेसिंग","diagThreshold":"प्रजाति थ्रेशोल्ड","diagUploads":"अपलोड और गोपनीयता","checking":"जाँच हो रही है…","diagOrderText":"आउटपुट इंडेक्स 0 और 1 को मूल MATLAB क्लास सूची से मिलाएँ।","diagPreprocessText":"MATLAB में RGB/BGR, पिक्सेल स्केल, resize और normalization की पुष्टि करें।","diagThresholdText":"टेस्ट तस्वीरों के बजाय लेबल की गई सत्यापन तस्वीरों और असंबंधित नकारात्मक नमूनों से कैलिब्रेट करें।","diagMemory":"केवल मेमोरी","diagPrivacyText":"अपलोड के प्रकार और आकार की जाँच होती है; ऐप उन्हें जानबूझकर डिस्क पर सेव नहीं करता।","diagNote":"स्कोर थ्रेशोल्ड कुछ अनिश्चित तस्वीरों को चिह्नित कर सकता है, लेकिन यह अलग से प्रशिक्षित और परीक्षण किए गए साँप-पहचान मॉडल का विकल्प नहीं है। ऊँचा स्कोर भी गलत हो सकता है।","safetyTitle":"महत्वपूर्ण सुरक्षा सूचना","safetyText":"दोनों मॉडल प्रयोगात्मक हैं। प्रजाति का नाम साँप की पुष्टि नहीं करता और काटे गए हिस्से का मॉडल यह नहीं बता सकता कि विष शरीर में गया या नहीं। काटने का संदेह हो तो व्यक्ति को स्थिर रखें और तुरंत आपातकालीन चिकित्सा लें।","safetyLink":"WHO साँप काटने की जानकारी ↗","footerLeft":"SnakeVision AI · प्रयोगात्मक प्रोटोटाइप","footerRight":"अनुमान गलत हो सकते हैं। किसी साँप के पास न जाएँ या उसे न छुएँ।","survivalHeading":"क्या साँप की तस्वीर से पता चल सकता है कि व्यक्ति कितनी देर जीवित रहेगा?","survivalText":"नहीं। प्रजाति क्लासिफायर केवल संभावित साँप की प्रजाति बताता है; यह किसी व्यक्ति के काटने, विष की मात्रा या मरीज की हालत का आकलन नहीं करता। इस तस्वीर से जीवित रहने का समय विश्वसनीय रूप से नहीं बताया जा सकता। काटने का संदेह हो तो तुरंत आपातकालीन चिकित्सा लें।","biteSurvivalHeading":"क्या काटे गए हिस्से वाला मॉडल जीवित रहने का समय बता सकता है?","biteSurvivalText":"नहीं। यह केवल अपलोड की गई तस्वीर को स्कोर करता है। यह साँप के काटने, शरीर में विष जाने, विष की मात्रा या मरीज की हालत की पुष्टि नहीं कर सकता। यह जीवित रहने का समय नहीं बता सकता। काटने का संदेह हो तो तुरंत अस्पताल जाएँ।","clinicalProfileHeading":"यदि विष का असर हुआ तो संभावित चिकित्सीय प्रभाव","clinicalProfileNote":"जीवित रहने का समय विश्वसनीय रूप से नहीं बताया जा सकता","clinicalProfileNoteText":"प्रजाति का नाम यह नहीं बता सकता कि कोई व्यक्ति कितनी देर जीवित रहेगा। भारत सरकार के 2025 साँप काटने के दिशानिर्देश के अनुसार, लक्षण न होने पर भी संदिग्ध काटने के मामलों में कम-से-कम 24 घंटे चिकित्सकीय निगरानी की सलाह है। यह अस्पताल में निगरानी की अवधि है, जीवित रहने का अनुमान नहीं। तुरंत आपातकालीन चिकित्सा लें।"}}
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

  const CLINICAL_PROFILE_TRANSLATIONS = {"Banded Racer":["సాధారణంగా విషరహితం; విషప్రభావం ఆశించబడదు. అయినా కాటు గాయం మరియు ఇన్ఫెక్షన్ కలిగించవచ్చు.","आमतौर पर विषहीन; विष का असर अपेक्षित नहीं। फिर भी काटने से घाव और संक्रमण हो सकता है।"],"Checkered Keelback":["సాధారణంగా విషరహితం; విషప్రభావం ఆశించబడదు. అయినా కాటు గాయం మరియు ఇన్ఫెక్షన్ కలిగించవచ్చు.","आमतौर पर विषहीन; विष का असर अपेक्षित नहीं। फिर भी काटने से घाव और संक्रमण हो सकता है।"],"Common Krait":["నాడీవిష ప్రభావం సంభవించవచ్చు. స్థానిక నొప్పి లేదా వాపు తక్కువగా లేదా లేకపోవచ్చు; కనురెప్పలు వాలడం, రెండుగా కనిపించడం, కడుపునొప్పి, మింగడం/మాట్లాడటం కష్టం, బలహీనత, శ్వాస వైఫల్యం రావచ్చు. లక్షణాలు ఆలస్యంగా రావచ్చు.","न्यूरोटॉक्सिक असर हो सकता है। स्थानीय दर्द या सूजन बहुत कम या न के बराबर हो सकती है; पलकें झुकना, दोहरा दिखना, पेट दर्द, निगलने/बोलने में कठिनाई, कमजोरी और साँस की विफलता हो सकती है। लक्षण देर से आ सकते हैं।"],"Common Rat Snake":["విషరహితం; విష సంబంధిత అనారోగ్యం ఆశించబడదు. అయినా కాటు గాయం మరియు ఇన్ఫెక్షన్ కలిగించవచ్చు.","विषहीन; विष से जुड़ी बीमारी अपेक्षित नहीं। फिर भी काटने से घाव और संक्रमण हो सकता है।"],"Common Sand Boa":["విషరహితం; విష సంబంధిత అనారోగ్యం ఆశించబడదు. అయినా కాటు గాయం మరియు ఇన్ఫెక్షన్ కలిగించవచ్చు.","विषहीन; विष से जुड़ी बीमारी अपेक्षित नहीं। फिर भी काटने से घाव और संक्रमण हो सकता है।"],"Common Trinket":["సాధారణంగా విషరహితం; విష సంబంధిత అనారోగ్యం ఆశించబడదు. అయినా కాటు గాయం మరియు ఇన్ఫెక్షన్ కలిగించవచ్చు.","आमतौर पर विषहीन; विष से जुड़ी बीमारी अपेक्षित नहीं। फिर भी काटने से घाव और संक्रमण हो सकता है।"],"Green Tree Vine":["వెనుక దంతాల ద్వారా స్వల్ప విషం కలిగించగలదని వర్ణిస్తారు. కాటు వల్ల స్థానిక నొప్పి లేదా వాపు రావచ్చు; మనుషులపై వైద్య ఆధారాలు పరిమితం. హానిలేదని భావించవద్దు.","इसे पीछे के दाँतों वाला हल्का विषैला साँप बताया जाता है। काटने से स्थानीय दर्द या सूजन हो सकती है; मनुष्यों में चिकित्सीय प्रमाण सीमित हैं। इसे harmless न मानें।"],"Indian Rock Python":["విషరహితమైన బిగించి చంపే పాము. ప్రధాన ప్రమాదం కాటు లేదా బిగించి పట్టుకోవడం వల్ల శారీరక గాయం; విషం కాదు.","विषहीन अजगर है। मुख्य खतरा काटने या जकड़ने से शारीरिक चोट है, विष नहीं।"],"King Cobra":["నాడీ-కండర సంకేతాలను దెబ్బతీసే నాడీవిష ప్రభావం సంభవించవచ్చు; శ్వాస కూడా ప్రభావితం కావచ్చు. బలహీనత, కనురెప్పలు వాలడం, మింగడం/మాట్లాడటం కష్టం, శ్వాస పక్షవాతం అత్యవసర సూచనలు.","न्यूरोटॉक्सिक असर नसों से मांसपेशियों तक संकेतों को बाधित कर सकता है और साँस को प्रभावित कर सकता है। कमजोरी, पलकें झुकना, निगलने/बोलने में कठिनाई और श्वसन पक्षाघात आपात संकेत हैं।"],"Monocled Cobra":["నాడీవిష ప్రభావంతో పాటు స్థానిక కణజాల నష్టం సంభవించవచ్చు. కనురెప్పలు వాలడం, బలహీనత, మింగడం/శ్వాసలో ఇబ్బంది, పెరుగుతున్న వాపు, బొబ్బలు లేదా కణజాల నష్టం ఉంటే అత్యవసర చికిత్స అవసరం.","न्यूरोटॉक्सिक असर के साथ स्थानीय ऊतक क्षति हो सकती है। पलकें झुकना, कमजोरी, निगलने/साँस लेने में कठिनाई, बढ़ती सूजन, छाले या ऊतक क्षति आपात संकेत हैं।"],"Russell's Viper":["రక్తం గడ్డకట్టడంలో లోపం, స్వయంచాలక రక్తస్రావం, షాక్ మరియు తీవ్రమైన మూత్రపిండ గాయం కలిగించే రక్తవిష ప్రభావం సంభవించవచ్చు. కొన్ని ప్రాంతాల్లో నాడీ లక్షణాలు కూడా ఉండవచ్చు.","रक्त के थक्के बनने में गड़बड़ी, अपने-आप रक्तस्राव, शॉक और तीव्र गुर्दा क्षति वाला रक्त-विषाक्त असर हो सकता है। कुछ क्षेत्रों में तंत्रिका संबंधी लक्षण भी हो सकते हैं।"],"Saw-scaled Viper":["రక్తం గడ్డకట్టడంలో లోపం, రక్తస్రావం, నొప్పితో కూడిన వాపు, బొబ్బలు మరియు స్థానిక కణజాల నష్టం సంభవించవచ్చు. కనిపించే లక్షణాల కోసం వేచి ఉండవద్దు.","रक्त का थक्का बनने में गड़बड़ी, रक्तस्राव, दर्दनाक सूजन, छाले और स्थानीय ऊतक क्षति हो सकती है। दिखाई देने वाले लक्षणों का इंतज़ार न करें।"],"Spectacled Cobra":["నాడీవిష ప్రభావంతో పాటు స్థానిక కణజాల నష్టం సంభవించవచ్చు. బలహీనత, కనురెప్పలు వాలడం, మింగడం లేదా శ్వాసలో ఇబ్బంది, పెరుగుతున్న వాపు, బొబ్బలు అత్యవసర సూచనలు.","न्यूरोटॉक्सिक असर के साथ स्थानीय ऊतक क्षति हो सकती है। कमजोरी, पलकें झुकना, निगलने या साँस लेने में कठिनाई, बढ़ती सूजन और छाले आपात संकेत हैं।"]};

  function applyLanguage() {
    const t=currentUi();
    const page=PAGE_TEXT[currentLanguage]||PAGE_TEXT.en;
    document.documentElement.lang=currentLanguage;
    document.querySelectorAll('[data-page-i18n]').forEach(node=>{const key=node.dataset.pageI18n;if(page[key])node.textContent=page[key];});
    document.querySelectorAll('[data-i18n]').forEach(node=>{const key=node.dataset.i18n;if(t[key])node.textContent=t[key];});
    document.querySelectorAll('.language-button').forEach(btn=>{const active=btn.dataset.language===currentLanguage;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));});
    document.getElementById('bite-urgency-text').textContent=t.biteUrgencyText;
    const biteSurvival=document.getElementById('bite-survival-text'); if(biteSurvival) biteSurvival.textContent=page.biteSurvivalText;
    const biteSurvivalHeading=document.getElementById('bite-survival-heading'); if(biteSurvivalHeading) biteSurvivalHeading.textContent=page.biteSurvivalHeading;
    const survival=document.getElementById('species-survival-text'); if(survival) survival.textContent=page.clinicalProfileNoteText;
    const survivalHeading=document.getElementById('species-survival-heading'); if(survivalHeading) survivalHeading.textContent=page.clinicalProfileNote;
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
    document.getElementById('species-notice').textContent=currentLanguage==='te'
      ? 'AI జాతి గుర్తింపు ఒక అంచనా మాత్రమే; ధృవీకరించిన గుర్తింపు కాదు. పామును సమీపించవద్దు, తాకవద్దు లేదా చుట్టుముట్టవద్దు.'
      : (currentLanguage==='hi' ? 'AI द्वारा प्रजाति की पहचान केवल अनुमान है, पुष्टि नहीं। साँप के पास न जाएँ, उसे छुएँ या घेरें नहीं।' : (result.notice||''));
    const localizedScores=(result.top_predictions||[]).map(item=>({label:SPECIES_NAMES[currentLanguage]?.[item.label]||item.label,score:item.score}));
    fillScoreList(document.getElementById('species-scores'),localizedScores,'purple');
    if(result.uncertain){
      document.getElementById('species-clinical-wrap').classList.add('hidden');
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
    document.getElementById('species-clinical-wrap').classList.remove('hidden');
    const clinicalText=CLINICAL_PROFILE_TRANSLATIONS[label];
    document.getElementById('species-clinical-text').textContent=currentLanguage==='en'?(info.clinical_profile||'Clinical effects vary; any suspected bite requires urgent hospital assessment.'):(clinicalText?clinicalText[currentLanguage==='te'?0:1]:(info.clinical_profile||''));
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
    showEmergencyPopup("bite");
    biteResultCard.classList.remove('hidden');
    let heading = `Model output: ${result.label}`;
    if (!result.class_mapping_verified) {
      heading = `Unverified mapping — output class ${result.class_index} (proposed label: ${result.proposed_label})`;
    }
    const biteDisplayLabel = currentLanguage==='te' ? (result.proposed_label==='Venomous'?'విషపూరితమైనది':(result.proposed_label==='Non-Venomous'?'విషరహితం':result.proposed_label)) : (currentLanguage==='hi' ? (result.proposed_label==='Venomous'?'विषैला':(result.proposed_label==='Non-Venomous'?'विषहीन':result.proposed_label)) : (result.proposed_label||result.label));
    document.getElementById('bite-label').textContent = !result.class_mapping_verified ? heading : ((currentLanguage==='en'?'Model output: ':currentLanguage==='te'?'మోడల్ ఫలితం: ':'मॉडल परिणाम: ')+biteDisplayLabel);
    document.getElementById('bite-confidence').textContent = percent(result.confidence);
    fillScoreList(document.getElementById('bite-scores'), result.probabilities);
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
    const riskClass = String(info.status_class || "").toLowerCase();
    const riskText = String(info.venom_status || "").toLowerCase();
    const predictedVenomous = !result.uncertain && (riskClass === "venomous" || (riskText.includes("venomous") && !riskText.includes("non-venomous") && !riskText.includes("mildly")));
    if (predictedVenomous) showEmergencyPopup("species");
    document.getElementById('species-label').textContent = result.label;
    document.getElementById('species-confidence').textContent = percent(result.confidence);
    fillScoreList(document.getElementById('species-scores'), result.top_predictions, 'purple');
    document.getElementById('species-notice').textContent = result.notice || '';
    const survivalText=document.getElementById('species-survival-text');
    if(survivalText) survivalText.textContent=(PAGE_TEXT[currentLanguage]||PAGE_TEXT.en).survivalText;
    // The species classifier's generic closed-set warnings are intentionally not shown in the result card.

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

  document.querySelectorAll('.language-button').forEach(btn => btn.addEventListener('click', () => { currentLanguage=btn.dataset.language||'en'; try { localStorage.setItem('snakevision-language',currentLanguage); } catch (_) {} applyLanguage(); }));
  applyLanguage();
  window.addEventListener('beforeunload', () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
  });
})();
