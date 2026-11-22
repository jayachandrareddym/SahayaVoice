"""
Missing-information detection module.

Inspects an ExtractedIntent and returns a list of MissingField objects, each
carrying the field name and ready-made clarification prompts in Kannada,
Hindi, and English.
"""
from __future__ import annotations

from .schema import ExtractedIntent, MissingField, REQUIRED_FIELDS

# ── Static clarification prompt catalog ──────────────────────────────────────
# Maps field name → (Kannada prompt, Hindi prompt, English prompt)

_PROMPTS: dict[str, tuple[str, str, str]] = {
    "category": (
        "ನಿಮ್ಮ ದೂರಿನ ವಿಷಯ ಯಾವುದು? "
        "(ಉದಾ: ನೀರು ಸರಬರಾಜು, ರಸ್ತೆ ಹಾನಿ, ವಿದ್ಯುತ್, ನೈರ್ಮಲ್ಯ, ಬೀದಿ ದೀಪ, ತ್ಯಾಜ್ಯ ಸಂಗ್ರಹ, ಒಳಚರಂಡಿ, ಶಬ್ದ ಮಾಲಿನ್ಯ)",
        "आपकी शिकायत किस विषय में है? "
        "(जैसे: पानी आपूर्ति, सड़क क्षति, बिजली, सफाई, स्ट्रीट लाइट, कचरा संग्रहण, नाली, शोर प्रदूषण)",
        "What is the subject of your complaint? "
        "(e.g. water supply, road damage, electricity, sanitation, street light, garbage, drainage, noise)",
    ),
    "location": (
        "ಸಮಸ್ಯೆ ಎಲ್ಲಿ ಇದೆ? ದಯವಿಟ್ಟು ಬೀದಿ ಹೆಸರು, ವಾರ್ಡ್ ಸಂಖ್ಯೆ ಅಥವಾ ಪ್ರಮುಖ ತಾಣ ಹೇಳಿ.",
        "समस्या कहाँ है? कृपया सड़क का नाम, वार्ड नंबर या कोई प्रमुख स्थान बताएं।",
        "Where is the problem located? Please provide the street name, ward number, or a landmark.",
    ),
    "description": (
        "ಸಮಸ್ಯೆಯನ್ನು ಸ್ವಲ್ಪ ವಿವರವಾಗಿ ಹೇಳಿ. ಎಷ್ಟು ದಿನಗಳಿಂದ ಈ ಸಮಸ್ಯೆ ಇದೆ?",
        "कृपया समस्या का विवरण दें। यह समस्या कितने दिनों से है?",
        "Please describe the problem in detail. How long has this issue been present?",
    ),
    "complainant_name": (
        "ನಿಮ್ಮ ಹೆಸರು ಏನು?",
        "आपका नाम क्या है?",
        "What is your name?",
    ),
    "contact_number": (
        "ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ತಿಳಿಸಿ.",
        "कृपया अपना मोबाइल नंबर बताएं।",
        "Please provide your mobile phone number.",
    ),
    "date_of_incident": (
        "ಈ ಸಮಸ್ಯೆ ಯಾವಾಗ ಪ್ರಾರಂಭವಾಯಿತು?",
        "यह समस्या कब से शुरू हुई?",
        "When did this problem start?",
    ),
}


def detect_missing(intent: ExtractedIntent) -> list[MissingField]:
    """
    Return a list of MissingField for every required field that is None/empty.
    Fields are checked in the order defined in REQUIRED_FIELDS so the
    clarification loop asks questions in a logical sequence.
    """
    missing: list[MissingField] = []
    intent_data = intent.model_dump()

    for field in REQUIRED_FIELDS:
        value = intent_data.get(field)
        if value is None or (isinstance(value, str) and not value.strip()):
            kn, hi, en = _PROMPTS.get(
                field,
                (
                    f"'{field}' ಮಾಹಿತಿ ನೀಡಿ.",
                    f"'{field}' की जानकारी दें।",
                    f"Please provide '{field}'.",
                ),
            )
            missing.append(
                MissingField(
                    field=field,
                    prompt_kannada=kn,
                    prompt_hindi=hi,
                    prompt_english=en,
                )
            )

    return missing


def is_complete(intent: ExtractedIntent) -> bool:
    """Return True if all required fields have been filled."""
    return len(detect_missing(intent)) == 0
