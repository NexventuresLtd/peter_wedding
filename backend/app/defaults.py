"""Default theme, copy and agenda.

These seed the database on first run. Everything here is editable from the
admin console afterwards — this module is only the starting point.
"""

# Champagne gold + ivory + deep emerald.
DEFAULT_THEME: dict = {
    "name": "Champagne & Emerald",
    "colors": {
        "primary": "#0F4C3A",  # deep emerald — headings, primary buttons
        "primaryDark": "#0A3428",
        "accent": "#C9A227",  # champagne gold — highlights, dividers
        "accentSoft": "#E8D9A8",
        "background": "#FDFBF7",  # ivory page
        "surface": "#FFFFFF",  # cards
        "surfaceAlt": "#F6F1E7",  # alternating bands
        "ink": "#1A1A1A",  # body text
        "inkMuted": "#6B6459",  # secondary text
        "border": "#E7DFD1",
        "success": "#2E7D5B",
        "danger": "#B3261E",
        "onPrimary": "#FDFBF7",
        "onAccent": "#1A1A1A",
        # Hero text is themed separately: it sits on a photo, not on the page
        # background, so it needs to stay legible independently of the palette.
        "heroTitle": "#FFFFFF",
        "heroKicker": "#C9A227",
        "heroText": "#F4F1EA",
    },
    "fonts": {
        "heading": "'Cormorant Garamond', 'Times New Roman', serif",
        "body": "'Inter', system-ui, -apple-system, sans-serif",
        "script": "'Great Vibes', cursive",
    },
    "radius": {"sm": "8px", "md": "14px", "lg": "24px", "pill": "999px"},
    "heroOverlay": 0.45,
}

DEFAULT_CONTENT: dict = {
    "brideName": "Yvette",
    "groomName": "Peter",
    "hashtag": "#PeterAndYvette",
    # Wordmark in the navigation bar. Blank falls back to the couple's
    # initials; an uploaded "logo" image wins over both.
    "logoText": "",
    "weddingDate": "",  # e.g. "2026-09-12" — set this in the admin console
    "en": {
        "heroKicker": "We are getting married",
        "heroTagline": "Join us as we celebrate the beginning of our forever.",
        "churchName": "Remera Church",
        "receptionVenue": "Reception Venue",
        "invitation": (
            "With hearts full of joy, we invite you to share in our wedding day. "
            "Your presence, your prayers and your photographs are the gifts we "
            "will treasure most."
        ),
        "galleryTitle": "Moments from our day",
        "gallerySubtitle": (
            "Photos, videos and messages shared by our guests. Every memory here "
            "was captured by someone who came to celebrate with us."
        ),
        "uploadTitle": "Share what you captured",
        "uploadSubtitle": (
            "Scan the code with your phone, or upload right here. Photos and "
            "videos are reviewed before they appear in the gallery."
        ),
        "thankYou": "Thank you for celebrating with us.",
    },
    "rw": {
        "heroKicker": "Turashyingiranwa",
        "heroTagline": "Muze twizihizanye intangiriro y'ubuzima bwacu bushya.",
        "churchName": "Urusengero rwa Remera",
        "receptionVenue": "Aho ibirori bibera",
        "invitation": (
            "Tubatumiye n'umunezero mwinshi ngo mwifatanye natwe kuri uyu munsi "
            "w'ubukwe bwacu. Kuboneka kwanyu, amasengesho yanyu n'amafoto yanyu "
            "ni yo mpano y'agaciro kuri twe."
        ),
        "galleryTitle": "Ibyiza by'umunsi wacu",
        "gallerySubtitle": (
            "Amafoto, amashusho n'ubutumwa byatanzwe n'abatumirwa. Buri "
            "kibutso kiri hano cyafatiwe n'uwaje kwishimana natwe."
        ),
        "uploadTitle": "Sangiza ibyo wafashe",
        "uploadSubtitle": (
            "Sikana kode ukoresheje telefoni yawe, cyangwa wohereze uhereye hano. "
            "Amafoto n'amashusho birasuzumwa mbere yo kugaragara."
        ),
        "thankYou": "Murakoze kwizihiza natwe.",
    },
    # Where the upload QR code appears: "hero" | "section" | "footer" | "hidden".
    "qrPlacement": "section",
    "flags": {
        "uploadsOpen": True,
        "galleryPublic": True,
        "showGuestNames": True,
    },
}

# The programme, transcribed from the English and Kinyarwanda documents.
# Bullets are either a plain string, or {"text": ..., "children": [...]}.
DEFAULT_AGENDA: list[dict] = [
    {
        "section": "ceremony",
        "time_label": "01:00 PM",
        "summary_en": "The groom leaves to pick up the bride.",
        "summary_rw": "Umukwe ajya gufata umugeni.",
        "sort_order": 10,
    },
    {
        "section": "ceremony",
        "time_label": "01:50 PM",
        "summary_en": "Arrival at Remera Church.",
        "summary_rw": "Kugera mu rusengero rwa Remera.",
        "sort_order": 20,
    },
    {
        "section": "ceremony",
        "time_label": "02:00 PM – 04:00 PM",
        "summary_en": "Wedding ceremony.",
        "summary_rw": "Ibirori by'ubukwe.",
        "sort_order": 30,
    },
    {
        "section": "ceremony",
        "time_label": "04:00 PM – 04:30 PM",
        "summary_en": "Departure from the church and travel to the reception venue.",
        "summary_rw": (
            "Guhaguruka mu rusengero berekeza aho ibirori byo kwakira "
            "abatumiwe bibera."
        ),
        "sort_order": 40,
    },
    {
        "section": "reception",
        "time_label": "04:30 PM – 06:00 PM",
        "bullets_en": [
            "Welcoming the guests.",
            "Taking photos of the bride and groom with their families, friends, and guests.",
            "Taking photos and capturing other memorable moments outside the reception venue.",
        ],
        "bullets_rw": [
            "Kwakira abatumiwe.",
            "Gufata amafoto y'umugeni n'umukwe hamwe n'imiryango, inshuti n'abatumirwa.",
            "Gufata amafoto no gukora ibindi bikorwa byo hanze.",
        ],
        "sort_order": 50,
    },
    {
        "section": "reception",
        "time_label": "06:00 PM – 06:20 PM",
        "bullets_en": [
            "The Bright Family group opens the reception with a Modern Dance performance.",
            "As the bride and groom enter, they are welcomed with a live Saxophone performance.",
        ],
        "bullets_rw": [
            "Itsinda Bright Family ritangira ibirori ribyina Modern Dance.",
            "Mu gihe umugeni n'umukwe binjira, bacurangirwa na Saxophone mu kubakira.",
        ],
        "sort_order": 60,
    },
    {
        "section": "reception",
        "time_label": "06:20 PM – 06:40 PM",
        "bullets_en": [
            "The Master of Ceremonies (MC) welcomes all guests and attendees.",
            "Peter's family introduces themselves.",
            "Peter's family officially welcomes Yvette's family.",
        ],
        "bullets_rw": [
            "Umusangiza w'amagambo (MC) yakira abitabiriye ibirori.",
            "Umuryango wa Peter wimenyekanisha.",
            "Umuryango wa Peter wakira ku mugaragaro umuryango wa Yvette.",
        ],
        "sort_order": 70,
    },
    {
        "section": "reception",
        "time_label": "06:40 PM – 07:00 PM",
        "bullets_en": [
            "Dance performance by the Bright Family group.",
            "The bride and groom join the group for the dance.",
        ],
        "bullets_rw": [
            "Imbyino z'itsinda Bright Family.",
            "Umugeni n'umukwe bifatanya n'iryo tsinda mu mbyino.",
        ],
        "sort_order": 80,
    },
    {
        "section": "reception",
        "time_label": "07:00 PM – 07:30 PM",
        "bullets_en": [
            "Cutting of the wedding cake.",
            "The bride and groom present gifts to their parents.",
        ],
        "bullets_rw": [
            "Gukata umutsima w'ubukwe (Cake).",
            "Umugeni n'umukwe bashyikiriza impano ababyeyi babo.",
        ],
        "sort_order": 90,
    },
    {
        "section": "reception",
        "time_label": "07:30 PM – 08:30 PM",
        "bullets_en": [
            "Dinner and refreshments.",
            "The live band performs while guests enjoy their meals.",
        ],
        "bullets_rw": [
            "Gusangira amafunguro.",
            "Itsinda ry'abaririmbyi (Band) riririmba mu gihe abatumirwa bari gufungura.",
        ],
        "sort_order": 100,
    },
    {
        "section": "reception",
        "time_label": "08:30 PM – 09:30 PM",
        "bullets_en": [
            "The bride and groom receive gifts and messages of congratulations "
            "from their families, friends, and guests.",
        ],
        "bullets_rw": [
            "Umugeni n'umukwe bakira impano n'ubutumwa bw'ishimwe biturutse "
            "ku miryango, inshuti n'abatumirwa.",
        ],
        "sort_order": 110,
    },
    {
        "section": "reception",
        "time_label": "09:30 PM – 09:45 PM",
        "bullets_en": [
            "A word of appreciation and thanks to all attendees.",
            {
                "text": "Traditional ceremony:",
                "children": [
                    "The parents are symbolically visited at the place where the "
                    "newlyweds will live.",
                    "Gutwikurura ceremony.",
                ],
            },
            "Prayer and official closing of the wedding reception programme.",
        ],
        "bullets_rw": [
            "Ijambo ryo gushimira abitabiriye ibirori.",
            {
                "text": "Umuhango gakondo:",
                "children": [
                    "Ababyeyi basurwa mu buryo bw'ikimenyetso aho abageni bazatura.",
                    "Umuhango wo Gutwikurura.",
                ],
            },
            "Gusenga no gusoza ku mugaragaro gahunda y'ibirori.",
        ],
        "sort_order": 120,
    },
    {
        "section": "afterparty",
        "time_label": "From 09:45 PM",
        "bullets_en": [
            "Live band music.",
            "Dancing and celebrating with the guests until the event comes to an end.",
        ],
        "bullets_rw": [
            "Umuziki wa Live Band.",
            "Kubyina no kwishimana n'abatumirwa kugeza ibirori birangiye.",
        ],
        "sort_order": 130,
    },
]

SECTION_TITLES = {
    "ceremony": {
        "en": "Wedding Ceremony — At the Church",
        "rw": "Gahunda y'Ubukwe — Mu Rusengero",
    },
    "reception": {
        "en": "Wedding Reception",
        "rw": "Gahunda y'Ikirori cyo Kwakira Abatumiwe",
    },
    "afterparty": {
        "en": "After Party — Closing Celebration",
        "rw": "After Party — Ibirori byo Gusoza",
    },
}
