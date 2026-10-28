"""Species safety notes reviewed from linked India/WHO snake resources.

Precautions are conservative public-safety guidance, not handling advice or
medical treatment. A classifier prediction is not a confirmed identification.
"""

SPECIES_INFO = {
    "Banded Racer": {
        "scientific_name": "Argyrogena fasciolata",
        "venom_status": "Generally classified as non-venomous",
        "risk_level": "lower-risk, but do not handle",
        "status_class": "nonvenomous",
        "summary": "A fast-moving racer; individuals can be mistaken for other snakes. Image identification is not confirmation.",
        "precautions": [
            "Do not chase, corner, catch, or try to pick it up; give it a clear escape route.",
            "Keep children and pets away and observe only from a substantial distance.",
            "If it is inside a building, keep people out of the area and contact a trained local snake rescuer."
        ],
        "sources": [
            {"label": "Banded Racer — iNaturalist guide", "url": "https://www.inaturalist.org/guide_taxa/1331755"},
            {"label": "WHO snakebite first-aid guidance", "url": "https://www.who.int/health-topics/snakebite/snakebite"}
        ],
    },
    "Checkered Keelback": {
        "scientific_name": "Fowlea piscator",
        "venom_status": "Non-venomous (commonly classified)",
        "risk_level": "do not handle",
        "status_class": "nonvenomous",
        "summary": "A water-associated snake. The predicted name alone cannot verify the species.",
        "precautions": [
            "If seen near a pond, drain, stream, or wet garden, do not reach through nearby vegetation or stones.",
            "Move back and let the snake move away; do not attempt to catch or relocate it.",
            "Ask a trained rescuer for help if it is in a home or busy area."
        ],
        "sources": [
            {"label": "Indian Snakes — species reference", "url": "https://indiansnakes.org/"},
            {"label": "WHO snakebite first-aid guidance", "url": "https://www.who.int/health-topics/snakebite/snakebite"}
        ],
    },
    "Common Krait": {
        "scientific_name": "Bungarus caeruleus",
        "venom_status": "Highly venomous; medically important",
        "risk_level": "high caution",
        "status_class": "venomous",
        "summary": "A medically important venomous snake. Krait bites may occur at night and may initially show little local injury.",
        "precautions": [
            "Never approach, touch, trap, or try to kill it; back away and call a trained rescuer.",
            "In snake-prone areas, avoid sleeping directly on the floor where possible; keep bedding and floor clutter clear and use a light before walking at night.",
            "After any suspected bite, keep the person still, immobilize the bitten limb, and go to a hospital immediately even if the wound looks minor."
        ],
        "sources": [
            {"label": "Government of India — National Action Plan for Snakebite Envenoming", "url": "https://www.ncdc.mohfw.gov.in/wp-content/uploads/2024/07/NATIONAL-ACTION-PLAN-FOR-PREVENTION-AND-CONTROL-OF-SNAKEBITE-ENVENOMING-NAPSE.pdf"},
            {"label": "Government of India — Snakebite standard treatment guidelines", "url": "https://nhm.gov.in/images/pdf/guidelines/nrhm-guidelines/stg/Snakebite_Full.pdf"},
            {"label": "WHO — snakebite treatment", "url": "https://www.who.int/teams/control-of-neglected-tropical-diseases/snakebite-envenoming/treatment"}
        ],
    },
    "Common Rat Snake": {
        "scientific_name": "Ptyas mucosa",
        "venom_status": "Non-venomous",
        "risk_level": "do not handle",
        "status_class": "nonvenomous",
        "summary": "A large, fast-moving non-venomous snake that is sometimes mistaken for a cobra. Do not rely on appearance for identification.",
        "precautions": [
            "Do not chase or handle it, even if someone believes it is harmless; bites can still injure.",
            "Keep away from its path and allow it to retreat instead of cornering it.",
            "If it is indoors, keep people and pets away and contact a trained rescuer."
        ],
        "sources": [
            {"label": "Indian Snakes — Rat Snake (*Ptyas mucosa*)", "url": "https://www.indiansnakes.org/snakedetails/rat%20snake"},
            {"label": "Telangana Forest Department — snake information booklet", "url": "https://tgfa.telangana.gov.in/Sharepath/TSFA/Whispers%20of%20the%20Wild-25.06.2025.pdf"}
        ],
    },
    "Common Sand Boa": {
        "scientific_name": "Eryx conicus",
        "venom_status": "Non-venomous",
        "risk_level": "do not handle",
        "status_class": "nonvenomous",
        "summary": "A stout-bodied, ground-associated boa. Its appearance should not be used to identify other snakes by comparison.",
        "precautions": [
            "When gardening or moving soil, wood, or stones, look first and do not put bare hands into holes or hidden spaces.",
            "If one is uncovered, stop work, step back, and leave it alone rather than grabbing it.",
            "Use a trained wildlife rescuer if removal from a building is necessary."
        ],
        "sources": [
            {"label": "Indian Snakes — Common Sand Boa (*Eryx conicus*)", "url": "https://www.indiansnakes.org/snakedetails/common%20sand%20boa"},
            {"label": "WHO snakebite first-aid guidance", "url": "https://www.who.int/health-topics/snakebite/snakebite"}
        ],
    },
    "Common Trinket": {
        "scientific_name": "Coelognathus helena",
        "venom_status": "Non-venomous (commonly classified)",
        "risk_level": "do not handle",
        "status_class": "nonvenomous",
        "summary": "A non-venomous snake that may act defensively if caught or handled.",
        "precautions": [
            "Do not pick it up or pin it down; a defensive snake may bite.",
            "Give it space and an unobstructed route away from people.",
            "If encountered inside a building, keep the room clear and contact a trained rescuer."
        ],
        "sources": [
            {"label": "SARRP India — non-venomous snakes", "url": "https://sarrpindia.org/sarrp-india/our-work/lectures/non-venomous-snakes/"},
            {"label": "Telangana Forest Department — snake information booklet", "url": "https://tgfa.telangana.gov.in/Sharepath/TSFA/Whispers%20of%20the%20Wild-25.06.2025.pdf"}
        ],
    },
    "Green Tree Vine": {
        "scientific_name": "Ahaetulla nasuta",
        "venom_status": "Reported as mildly venomous / rear-fanged — do not treat as harmless",
        "risk_level": "caution; avoid all contact",
        "status_class": "caution",
        "summary": "Important dataset note: your folder places this species under Non-Venomous, but an Indian snake education resource describes the green vine snake as mildly venomous. This label conflict should be reviewed; the model's folder label is not biological proof.",
        "precautions": [
            "Do not reach into branches, hedges, or vines where a slender green snake may be resting.",
            "Do not handle it or bring it close to the face, even if it appears small or calm.",
            "Keep a distance and contact a trained rescuer if it is close to people."
        ],
        "sources": [
            {"label": "Universal Snakebite Education & Research Organisation — mildly venomous species", "url": "https://user.org.in/venomous_mild.php"},
            {"label": "Indian Snakes — species reference", "url": "https://indiansnakes.org/"}
        ],
    },
    "Indian Rock Python": {
        "scientific_name": "Python molurus",
        "venom_status": "Non-venomous, but a large powerful constrictor",
        "risk_level": "high physical-hazard caution",
        "status_class": "caution",
        "summary": "A large-bodied python. Non-venomous does not mean safe to approach or handle.",
        "precautions": [
            "Do not approach, surround, touch, or attempt to move/capture it; a large python can seriously injure a person.",
            "Keep children and pets well away and give the animal a clear route away.",
            "Contact a trained wildlife rescue service or forest department for help."
        ],
        "sources": [
            {"label": "Indian Snakes — Indian Rock Python (*Python molurus*)", "url": "https://www.indiansnakes.org/snakedetails/indian%20rock%20python"},
            {"label": "WHO snakebite first-aid guidance", "url": "https://www.who.int/health-topics/snakebite/snakebite"}
        ],
    },
    "King Cobra": {
        "scientific_name": "Ophiophagus hannah",
        "venom_status": "Highly venomous; medically important",
        "risk_level": "high caution",
        "status_class": "venomous",
        "summary": "A large venomous snake. The classifier may confuse similar-looking species; do not approach to obtain a better photograph.",
        "precautions": [
            "Move away without approaching, cornering, or blocking its path; do not attempt close-up photography.",
            "Warn others from a safe distance and keep children and pets away.",
            "Call trained wildlife rescue or forest authorities rather than trying to capture it."
        ],
        "sources": [
            {"label": "Government of India — National Programme for Snakebite Envenoming", "url": "https://ihip.mohfw.gov.in/npse/"},
            {"label": "Indian Snakes — King Cobra", "url": "https://www.indiansnakes.org/snakedetails/king%20cobra"}
        ],
    },
    "Monocled Cobra": {
        "scientific_name": "Naja kaouthia",
        "venom_status": "Venomous; medically important",
        "risk_level": "high caution",
        "status_class": "venomous",
        "summary": "A venomous cobra. Hood display or body posture is not a safe way for an untrained person to judge distance or risk.",
        "precautions": [
            "Do not approach a cobra, including one displaying a hood; calmly increase distance and leave its escape route open.",
            "Do not try to trap it under a container, strike it, or kill it.",
            "Keep the area clear and call a trained snake rescuer. Any suspected bite needs immediate hospital assessment."
        ],
        "sources": [
            {"label": "Government of India — National Programme for Snakebite Envenoming", "url": "https://ihip.mohfw.gov.in/npse/"},
            {"label": "WHO snakebite treatment guidance", "url": "https://www.who.int/teams/control-of-neglected-tropical-diseases/snakebite-envenoming/treatment"}
        ],
    },
    "Russell's Viper": {
        "scientific_name": "Daboia russelii",
        "venom_status": "Highly venomous; medically important",
        "risk_level": "high caution",
        "status_class": "venomous",
        "summary": "One of India's medically important 'Big Four' snakes. The species label from a photograph is not definitive.",
        "precautions": [
            "In fields, long grass, or overgrown areas, wear closed footwear and use a torch after dark.",
            "Look where you step and never put hands into vegetation, rodent holes, leaf litter, or debris you cannot see into.",
            "Do not touch or attempt to move a suspected viper; after a suspected bite, keep the person still and seek emergency care immediately."
        ],
        "sources": [
            {"label": "NCDC India — Big Four venomous snakes", "url": "https://www.ncdc.mohfw.gov.in/wp-content/uploads/2025/05/NCDC-Quarterly-Journal-with-QR-Code-34-41.pdf"},
            {"label": "WHO snakebite treatment guidance", "url": "https://www.who.int/teams/control-of-neglected-tropical-diseases/snakebite-envenoming/treatment"}
        ],
    },
    "Saw-scaled Viper": {
        "scientific_name": "Echis carinatus",
        "venom_status": "Highly venomous; medically important",
        "risk_level": "high caution",
        "status_class": "venomous",
        "summary": "One of India's medically important 'Big Four' snakes. Never rely on a visual model prediction to decide whether a snake is safe.",
        "precautions": [
            "In scrub or rocky ground, wear closed shoes and use a light after dark.",
            "Do not reach into rock piles, cracks, stored materials, or leaf litter; move away if you see a snake.",
            "Do not handle or try to kill it. A suspected bite requires urgent professional medical care."
        ],
        "sources": [
            {"label": "NCDC India — Big Four venomous snakes", "url": "https://www.ncdc.mohfw.gov.in/wp-content/uploads/2025/05/NCDC-Quarterly-Journal-with-QR-Code-34-41.pdf"},
            {"label": "WHO snakebite treatment guidance", "url": "https://www.who.int/teams/control-of-neglected-tropical-diseases/snakebite-envenoming/treatment"}
        ],
    },
    "Spectacled Cobra": {
        "scientific_name": "Naja naja",
        "venom_status": "Venomous; medically important",
        "risk_level": "high caution",
        "status_class": "venomous",
        "summary": "One of India's medically important 'Big Four' snakes. Do not approach it to confirm the species visually.",
        "precautions": [
            "Keep a wide distance and avoid cornering, provoking, photographing closely, or attempting to catch it.",
            "Keep other people and pets away; leave a clear path for it to retreat.",
            "Call a trained snake rescuer if it is near a home. Any suspected bite requires immediate medical assessment."
        ],
        "sources": [
            {"label": "Government of India — National Programme for Snakebite Envenoming", "url": "https://ihip.mohfw.gov.in/npse/"},
            {"label": "NCDC India — Big Four venomous snakes", "url": "https://www.ncdc.mohfw.gov.in/wp-content/uploads/2025/05/NCDC-Quarterly-Journal-with-QR-Code-34-41.pdf"}
        ],
    },
}

GENERAL_BITE_FIRST_AID = [
    "Move away from the snake. Do not try to catch or kill it.",
    "Keep the person calm and as still as possible; immobilize the bitten limb.",
    "Remove rings, watches, or tight items near the affected area before swelling develops, if this can be done easily.",
    "Arrange urgent transport to a hospital immediately. Do not wait for the website or for symptoms to appear.",
    "Do not cut, suck, massage, ice, or apply traditional/herbal remedies to the wound; do not use a tight tourniquet.",
]

FIRST_AID_SOURCES = [
    {"label": "WHO — Snakebite", "url": "https://www.who.int/health-topics/snakebite/snakebite"},
    {"label": "WHO — Treatment of snakebite envenoming", "url": "https://www.who.int/teams/control-of-neglected-tropical-diseases/snakebite-envenoming/treatment"},
    {"label": "Government of India — National Action Plan for Snakebite Envenoming", "url": "https://www.ncdc.mohfw.gov.in/wp-content/uploads/2024/07/NATIONAL-ACTION-PLAN-FOR-PREVENTION-AND-CONTROL-OF-SNAKEBITE-ENVENOMING-NAPSE.pdf"},
]


def normalize_species_name(name: str) -> str:
    return " ".join(str(name).replace("’", "'").strip().lower().split())


_SPECIES_LOOKUP = {normalize_species_name(name): info for name, info in SPECIES_INFO.items()}


def get_species_info(name: str) -> dict:
    """Return the information for the model label; safe fallback for unknown labels."""
    matched = _SPECIES_LOOKUP.get(normalize_species_name(name))
    if matched:
        return matched
    return {
        "scientific_name": "Not verified",
        "venom_status": "Unknown — treat as potentially dangerous",
        "risk_level": "unknown",
        "status_class": "caution",
        "summary": "This model label is not in the verified species-information table.",
        "precautions": [
            "Do not approach or handle the snake.",
            "Keep people and pets away and contact a trained local snake rescuer.",
            "If anyone may have been bitten, seek emergency medical care immediately."
        ],
        "sources": [
            {"label": "WHO snakebite guidance", "url": "https://www.who.int/health-topics/snakebite/snakebite"}
        ],
    }
