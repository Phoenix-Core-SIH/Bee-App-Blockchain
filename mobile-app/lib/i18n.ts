import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_KEY = 'hivetrack_language';

// Translations
const resources = {
  en: {
    translation: {
      "language_selector": "Select Language",
      "continue": "Continue",
      "welcome_back": "Welcome back,",
      "join_network": "Join the apiary network",
      "sign_in": "Sign In",
      "register": "Register",
      "phone_number": "PHONE NUMBER",
      "otp_code": "OTP CODE",
      "send_otp": "Send OTP",
      "sign_in_button": "Sign In to HiveTrack",
      "create_account": "Create My Account",
      "change_number": "← Change number",
      
      // Tabs
      "tab_home": "Home",
      "tab_apiary": "Apiary",
      "tab_alerts": "Alerts",
      "tab_profile": "Profile",

      // Dashboard
      "active_hives": "Active Hives",
      "yield_season": "Yield this season",
      "recent_activity": "Recent Activity",

      // Apiary
      "apiary_dashboard": "APIARY DASHBOARD",
      "my_apiaries": "My Apiaries",
      "hives_lowercase": "hives",
      "healthy": "healthy",
      "yield": "yield",
      "add_hive": "+ Add Hive",

      // Profile
      "member_since": "Member since",
      "years_farming": "YEARS FARMING",
      "total_hives": "TOTAL HIVES",
      "season_yield": "SEASON YIELD",
      "apiaries": "APIARIES",
      "light_mode": "Light Mode",
      "natural_daylight": "Natural daylight view",
      "account": "ACCOUNT",
      "edit_profile": "Edit Profile",
      "edit_profile_desc": "Name, photo, bio",
      "notifications": "Notifications",
      "notifications_desc": "Alerts and reminders",
      "privacy_security": "Privacy & Security",
      "privacy_desc": "Password, 2FA",
      "farm": "FARM",
      "farm_details": "Farm Details",
      "farm_details_desc": "Location, certifications",
      "export_data": "Export Data",
      "export_data_desc": "CSV, PDF reports",
      "integrations": "Integrations",
      "integrations_desc": "Weather APIs, sensors",
      "support": "SUPPORT",
      "beekeeper_guide": "Beekeeper Guide",
      "beekeeper_guide_desc": "Tips and best practices",
      "help_feedback": "Help & Feedback",
      "help_feedback_desc": "Contact support",
      "rate_hivetrack": "Rate HiveTrack",
      "rate_desc": "Share your review",
      "sign_out": "Sign Out",
      
      // Dynamic ML Disease Codes
      "disease_healthy": "Healthy",
      "disease_ant_problems": "Ant Problems",
      "disease_varroa_mites": "Varroa Mites",
      "disease_unknown": "Unknown Status",
    }
  },
  hi: {
    translation: {
      "language_selector": "भाषा चुनें",
      "continue": "जारी रखें",
      "welcome_back": "वापसी पर स्वागत है,",
      "join_network": "मधुमक्खी पालन नेटवर्क से जुड़ें",
      "sign_in": "साइन इन करें",
      "register": "पंजीकरण करें",
      "phone_number": "फ़ोन नंबर",
      "otp_code": "ओटीपी कोड",
      "send_otp": "ओटीपी भेजें",
      "sign_in_button": "HiveTrack में साइन इन करें",
      "create_account": "मेरा खाता बनाएँ",
      "change_number": "← नंबर बदलें",

      // Tabs
      "tab_home": "होम",
      "tab_apiary": "मधुमक्खी पालन",
      "tab_alerts": "अलर्ट",
      "tab_profile": "प्रोफ़ाइल",

      // Dashboard
      "active_hives": "सक्रिय छत्ते",
      "yield_season": "इस सीज़न की उपज",
      "recent_activity": "हाल की गतिविधि",

      // Apiary
      "apiary_dashboard": "मधुमक्खी पालन डैशबोर्ड",
      "my_apiaries": "मेरी मधुवाटिका",
      "hives_lowercase": "छत्ते",
      "healthy": "स्वस्थ",
      "yield": "उपज",
      "add_hive": "+ छत्ता जोड़ें",

      // Profile
      "member_since": "सदस्य",
      "years_farming": "खेती के वर्ष",
      "total_hives": "कुल छत्ते",
      "season_yield": "सीज़न की उपज",
      "apiaries": "मधुवाटिका",
      "light_mode": "लाइट मोड",
      "natural_daylight": "प्राकृतिक दिन का दृश्य",
      "account": "खाता",
      "edit_profile": "प्रोफ़ाइल संपादित करें",
      "edit_profile_desc": "नाम, फोटो, बायो",
      "notifications": "सूचनाएं",
      "notifications_desc": "अलर्ट और रिमाइंडर",
      "privacy_security": "गोपनीयता और सुरक्षा",
      "privacy_desc": "पासवर्ड, 2FA",
      "farm": "खेत",
      "farm_details": "खेत का विवरण",
      "farm_details_desc": "स्थान, प्रमाणपत्र",
      "export_data": "डेटा निर्यात करें",
      "export_data_desc": "CSV, PDF रिपोर्ट",
      "integrations": "एकीकरण",
      "integrations_desc": "मौसम एपीआई, सेंसर",
      "support": "सहायता",
      "beekeeper_guide": "मधुमक्खी पालक गाइड",
      "beekeeper_guide_desc": "सुझाव और सर्वोत्तम प्रथाएं",
      "help_feedback": "मदद और प्रतिक्रिया",
      "help_feedback_desc": "सहायता से संपर्क करें",
      "rate_hivetrack": "HiveTrack को रेट करें",
      "rate_desc": "अपनी समीक्षा साझा करें",
      "sign_out": "साइन आउट",
      
      // Dynamic ML Disease Codes
      "disease_healthy": "स्वस्थ",
      "disease_ant_problems": "चींटियों की समस्या",
      "disease_varroa_mites": "वरोआ घुन (Varroa Mites)",
      "disease_unknown": "अज्ञात स्थिति",
    }
  },
  kn: {
    translation: {
      "language_selector": "ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ",
      "continue": "ಮುಂದುವರಿಸಿ",
      "welcome_back": "ಮತ್ತೆ ಸ್ವಾಗತ,",
      "join_network": "ಜೇನುನೊಣ ಜಾಲಕ್ಕೆ ಸೇರಿ",
      "sign_in": "ಸೈನ್ ಇನ್ ಮಾಡಿ",
      "register": "ನೋಂದಾಯಿಸಿ",
      "phone_number": "ಫೋನ್ ಸಂಖ್ಯೆ",
      "otp_code": "OTP ಕೋಡ್",
      "send_otp": "OTP ಕಳುಹಿಸಿ",
      "sign_in_button": "HiveTrack ಗೆ ಸೈನ್ ಇನ್ ಮಾಡಿ",
      "create_account": "ನನ್ನ ಖಾತೆಯನ್ನು ರಚಿಸಿ",
      "change_number": "← ಸಂಖ್ಯೆ ಬದಲಾಯಿಸಿ",

      // Tabs
      "tab_home": "ಮುಖಪುಟ",
      "tab_apiary": "ಜೇನುಸಾಕಣೆ",
      "tab_alerts": "ಎಚ್ಚರಿಕೆಗಳು",
      "tab_profile": "ಪ್ರೊಫೈಲ್",

      // Dashboard
      "active_hives": "ಸಕ್ರಿಯ ಜೇನುಗೂಡುಗಳು",
      "yield_season": "ಈ ಋತುವಿನ ಇಳುವರಿ",
      "recent_activity": "ಇತ್ತೀಚಿನ ಚಟುವಟಿಕೆ",

      // Apiary
      "apiary_dashboard": "ಜೇನುಸಾಕಣೆ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
      "my_apiaries": "ನನ್ನ ಜೇನುಸಾಕಣೆ",
      "hives_lowercase": "ಗೂಡುಗಳು",
      "healthy": "ಆರೋಗ್ಯಕರ",
      "yield": "ಇಳುವರಿ",
      "add_hive": "+ ಜೇನುಗೂಡು ಸೇರಿಸಿ",

      // Profile
      "member_since": "ಸದಸ್ಯರು",
      "years_farming": "ಕೃಷಿಯ ವರ್ಷಗಳು",
      "total_hives": "ಒಟ್ಟು ಜೇನುಗೂಡುಗಳು",
      "season_yield": "ಋತುವಿನ ಇಳುವರಿ",
      "apiaries": "ಜೇನುಸಾಕಣೆ",
      "light_mode": "ಲೈಟ್ ಮೋಡ್",
      "natural_daylight": "ನೈಸರ್ಗಿಕ ಹಗಲು ನೋಟ",
      "account": "ಖಾತೆ",
      "edit_profile": "ಪ್ರೊಫೈಲ್ ಸಂಪಾದಿಸಿ",
      "edit_profile_desc": "ಹೆಸರು, ಫೋಟೋ, ಬಯೋ",
      "notifications": "ಅಧಿಸೂಚನೆಗಳು",
      "notifications_desc": "ಎಚ್ಚರಿಕೆಗಳು ಮತ್ತು ಜ್ಞಾಪನೆಗಳು",
      "privacy_security": "ಗೌಪ್ಯತೆ ಮತ್ತು ಭದ್ರತೆ",
      "privacy_desc": "ಪಾಸ್ವರ್ಡ್, 2FA",
      "farm": "ಫಾರ್ಮ್",
      "farm_details": "ಫಾರ್ಮ್ ವಿವರಗಳು",
      "farm_details_desc": "ಸ್ಥಳ, ಪ್ರಮಾಣೀಕರಣಗಳು",
      "export_data": "ಡೇಟಾವನ್ನು ರಫ್ತು ಮಾಡಿ",
      "export_data_desc": "CSV, PDF ವರದಿಗಳು",
      "integrations": "ಏಕೀಕರಣಗಳು",
      "integrations_desc": "ಹವಾಮಾನ APIs, ಸಂವೇದಕಗಳು",
      "support": "ಬೆಂಬಲ",
      "beekeeper_guide": "ಜೇನುಸಾಕಣೆದಾರರ ಮಾರ್ಗದರ್ಶಿ",
      "beekeeper_guide_desc": "ಸಲಹೆಗಳು ಮತ್ತು ಉತ್ತಮ ಅಭ್ಯಾಸಗಳು",
      "help_feedback": "ಸಹಾಯ ಮತ್ತು ಪ್ರತಿಕ್ರಿಯೆ",
      "help_feedback_desc": "ಬೆಂಬಲವನ್ನು ಸಂಪರ್ಕಿಸಿ",
      "rate_hivetrack": "HiveTrack ರೇಟ್ ಮಾಡಿ",
      "rate_desc": "ನಿಮ್ಮ ವಿಮರ್ಶೆಯನ್ನು ಹಂಚಿಕೊಳ್ಳಿ",
      "sign_out": "ಸೈನ್ ಔಟ್",
      
      // Dynamic ML Disease Codes
      "disease_healthy": "ಆರೋಗ್ಯಕರ",
      "disease_ant_problems": "ಇರುವೆ ಸಮಸ್ಯೆಗಳು",
      "disease_varroa_mites": "ವರೋವಾ ಹುಳಗಳು",
      "disease_unknown": "ಅಜ್ಞಾತ ಸ್ಥಿತಿ",
    }
  },
  bn: {
    translation: {
      "language_selector": "ভাষা নির্বাচন করুন",
      "continue": "চালিয়ে যান",
      "welcome_back": "ফিরে আসার জন্য স্বাগতম,",
      "join_network": "এপিয়ারি নেটওয়ার্কে যোগ দিন",
      "sign_in": "সাইন ইন করুন",
      "register": "নিবন্ধন করুন",
      "phone_number": "ফোন নম্বর",
      "otp_code": "ওটিপি কোড",
      "send_otp": "ওটিপি পাঠান",
      "sign_in_button": "HiveTrack-এ সাইন ইন করুন",
      "create_account": "আমার অ্যাকাউন্ট তৈরি করুন",
      "change_number": "← নম্বর পরিবর্তন করুন",

      // Tabs
      "tab_home": "হোম",
      "tab_apiary": "এপিয়ারি",
      "tab_alerts": "সতর্কতা",
      "tab_profile": "প্রোফাইল",
      "tab_diagnosis": "রোগ নির্ণয়",

      // Dashboard
      "active_hives": "সক্রিয় মৌচাক",
      "yield_season": "এই মৌসুমের ফলন",
      "recent_activity": "সাম্প্রতিক কার্যকলাপ",

      // Apiary
      "apiary_dashboard": "এপিয়ারি ড্যাশবোর্ড",
      "my_apiaries": "আমার এপিয়ারি",
      "hives_lowercase": "মৌচাক",
      "healthy": "সুস্থ",
      "yield": "ফলন",
      "add_hive": "+ মৌচাক যোগ করুন",

      // Profile
      "member_since": "সদস্য",
      "years_farming": "চাষের বছর",
      "total_hives": "মোট মৌচাক",
      "season_yield": "মৌসুমের ফলন",
      "apiaries": "এপিয়ারি",
      "light_mode": "লাইট মোড",
      "natural_daylight": "প্রাকৃতিক দিনের আলো",
      "account": "অ্যাকাউন্ট",
      "edit_profile": "প্রোফাইল সম্পাদনা করুন",
      "edit_profile_desc": "নাম, ছবি, বায়ো",
      "notifications": "বিজ্ঞপ্তি",
      "notifications_desc": "সতর্কতা এবং অনুস্মারক",
      "privacy_security": "গোপনীয়তা ও নিরাপত্তা",
      "privacy_desc": "পাসওয়ার্ড, 2FA",
      "farm": "খামার",
      "farm_details": "খামারের বিবরণ",
      "farm_details_desc": "অবস্থান, শংসাপত্র",
      "export_data": "ডেটা রপ্তানি করুন",
      "export_data_desc": "CSV, PDF রিপোর্ট",
      "integrations": "ইন্টিগ্রেশন",
      "integrations_desc": "আবহাওয়া API, সেন্সর",
      "support": "সমর্থন",
      "beekeeper_guide": "মৌমাছি পালক গাইড",
      "beekeeper_guide_desc": "পরামর্শ এবং সেরা অনুশীলন",
      "help_feedback": "সাহায্য ও প্রতিক্রিয়া",
      "help_feedback_desc": "সমর্থন যোগাযোগ করুন",
      "rate_hivetrack": "HiveTrack রেট করুন",
      "rate_desc": "আপনার পর্যালোচনা শেয়ার করুন",
      "sign_out": "সাইন আউট",
      
      // Dynamic ML Disease Codes
      "disease_healthy": "সুস্থ",
      "disease_ant_problems": "পিঁপড়ার সমস্যা",
      "disease_varroa_mites": "ভারোয়া মাইটস",
      "disease_unknown": "অজানা স্থিতি",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default synchronously
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export const loadSavedLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    }
  } catch (e) {
    console.warn("Failed to load language", e);
  }
};

export const changeLanguage = async (lng: string) => {
  await AsyncStorage.setItem(LANGUAGE_KEY, lng);
  i18n.changeLanguage(lng);
};

export const getSavedLanguage = async () => {
  return await AsyncStorage.getItem(LANGUAGE_KEY);
};

export default i18n;
