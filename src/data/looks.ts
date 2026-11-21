import type { MoodId, RolePaletteTuple } from "@/types/momo";

export const ROLE_PALETTES: Record<string, RolePaletteTuple> = {
  "persimmon": [
    "#FBC2A2",
    "#EF8C66",
    "#DA6C4D",
    "#B5523C"
  ],
  "honey": [
    "#FCE0A2",
    "#F3BD58",
    "#DE9E3C",
    "#B67B2C"
  ],
  "cornflower": [
    "#C2D3FB",
    "#86A3F0",
    "#6784DC",
    "#4D66BA"
  ],
  "matcha": [
    "#D3E7B0",
    "#A3C977",
    "#83AC5B",
    "#648A45"
  ],
  "wisteria": [
    "#D8CCF7",
    "#AA95E9",
    "#8C76D5",
    "#6E58B2"
  ],
  "rose": [
    "#F9C8D3",
    "#EE93A9",
    "#D8738D",
    "#B45A71"
  ],
  "ash": [
    "#E6E7EC",
    "#C6C8D0",
    "#A7AAB5",
    "#878A97"
  ],
  "teal": [
    "#C4EEE8",
    "#74CFC2",
    "#52B3A6",
    "#3B8F85"
  ],
  "sand": [
    "#F8E6CC",
    "#EBC99B",
    "#D6AC76",
    "#B58B58"
  ],
  "orchid": [
    "#EECDF6",
    "#CE93E4",
    "#B274CC",
    "#8E58A8"
  ],
  "slate": [
    "#D5DDF0",
    "#93A6CF",
    "#7487B6",
    "#586A96"
  ],
  "cherry": [
    "#FAC4C4",
    "#EC8686",
    "#D66666",
    "#B04B4F"
  ],
  "sky": [
    "#C9EAF8",
    "#87CCEE",
    "#63AFDA",
    "#4A8DB8"
  ],
  "lemon": [
    "#FBEFAA",
    "#F0D95E",
    "#DBBE3E",
    "#B3992E"
  ],
  "mint": [
    "#CDF2D6",
    "#8FD9A2",
    "#6CBF82",
    "#519C66"
  ],
  "piggy": [
    "#FFE0E6",
    "#FBB9C6",
    "#F095AA",
    "#D2728A"
  ],
  "lime": [
    "#E9F5B5",
    "#C9E26C",
    "#ABC64C",
    "#88A038"
  ],
  "indigo": [
    "#D6D8FA",
    "#A0A5F0",
    "#8086DC",
    "#6268BA"
  ],
  "ladybug": [
    "#FFC4BC",
    "#F57A6C",
    "#E05A4E",
    "#B8423B"
  ]
};

export const OUTFIT_INDICES: Record<string, number> = {
  "rest": 0,
  "cook": 1,
  "investigate": 2,
  "write": 3,
  "dead": 4,
  "builder": 5,
  "music": 6,
  "tutor": 7,
  "garden": 8,
  "designer": 9,
  "director": 10,
  "coach": 11,
  "traveller": 12,
  "money": 13,
  "planner": 14,
  "captain": 15,
  "tester": 16,
  "guard": 17,
  "bug": 18
};

export const DEFAULT_FACE_BY_LOOK: Record<string, number> = {
  "rest": 13,
  "cook": 1,
  "investigate": 2,
  "write": 0,
  "dead": 4,
  "builder": 0,
  "music": 1,
  "tutor": 12,
  "garden": 0,
  "designer": 8,
  "director": 0,
  "coach": 0,
  "traveller": 0,
  "money": 0,
  "planner": 0,
  "captain": 11,
  "tester": 0,
  "guard": 0,
  "bug": 0
};

export const LOOK_DEFAULT_PALETTE: Record<string, string> = {
  "cook": "honey",
  "investigate": "cornflower",
  "write": "matcha",
  "dead": "ash",
  "builder": "wisteria",
  "music": "rose",
  "tutor": "teal",
  "garden": "sand",
  "designer": "orchid",
  "director": "slate",
  "coach": "cherry",
  "traveller": "sky",
  "money": "piggy",
  "planner": "mint",
  "captain": "lemon",
  "tester": "indigo",
  "guard": "lime",
  "bug": "ladybug"
};

export const LOOK_NAMES: Record<string, string> = {
  cook: "Chef",
  investigate: "Penyelidik",
  write: "Sastrawan",
  builder: "Maker",
  music: "Maestro",
  tutor: "Mentor",
  garden: "Botanis",
  designer: "Desainer",
  director: "Kreator",
  coach: "Pelatih",
  traveller: "Penjelajah",
  money: "Finansial",
  planner: "Strategis",
  captain: "Kapten",
  tester: "Analisis",
  guard: "Protektor",
  bug: "Tester"
};

export const LOOK_JOBS: Record<string, string> = {
  "rest": "Bebas apa aja",
  "builder": "Coba bikin sesuatu",
  "captain": "Urus kode & rilis",
  "tester": "Uji coba semuanya",
  "guard": "Cek yang berisiko",
  "bug": "Buru bug",
  "investigate": "Usut masalah",
  "designer": "Bahas desain",
  "cook": "Ngulik resep",
  "write": "Rangkai kata",
  "tutor": "Jelasin dong",
  "music": "Teman buat fokus",
  "coach": "Bangun kebiasaan",
  "planner": "Atur semuanya",
  "traveller": "Siap-siap jalan",
  "money": "Atur duit",
  "garden": "Rawat tanaman",
  "director": "Bikin video"
};

export const PRESET_BOT_GROUPS: Array<[string, string[]]> = [
  [
    "Pekerjaan",
    [
      "builder",
      "captain",
      "tester",
      "bug",
      "guard",
      "investigate",
      "designer"
    ]
  ],
  [
    "Harian",
    [
      "cook",
      "write",
      "tutor",
      "music",
      "coach",
      "planner",
      "traveller",
      "money",
      "garden",
      "director"
    ]
  ]
];

export const LOOK_POSES: Record<string, { brows: [number, number, number, number]; look?: [number, number]; roll?: number; yaw?: number; eyeScale?: [number, number]; tip?: [number, number, number]; leaf?: number }> = {
  "rest": {
    "brows": [
      0.012,
      0.014,
      0.014,
      0.012
    ],
    "look": [
      0.012,
      0.004
    ]
  },
  "cook": {
    "brows": [
      0.02,
      0.022,
      0.022,
      0.02
    ],
    "roll": 0.03
  },
  "investigate": {
    "brows": [
      0.008,
      0.008,
      0.02,
      0.024
    ],
    "look": [
      0.02,
      -0.006
    ],
    "roll": 0.035
  },
  "write": {
    "brows": [
      0.01,
      0.012,
      0.012,
      0.01
    ],
    "look": [
      0.03,
      0.03
    ],
    "roll": 0.04
  },
  "builder": {
    "brows": [
      0.012,
      0.014,
      0.014,
      0.012
    ],
    "look": [
      0.01,
      0
    ],
    "tip": [
      -0.2,
      0,
      0.62
    ]
  },
  "music": {
    "brows": [
      0.02,
      0.022,
      0.022,
      0.02
    ],
    "roll": 0.04
  },
  "tutor": {
    "brows": [
      0.02,
      0.022,
      0.022,
      0.02
    ],
    "look": [
      0,
      0
    ],
    "eyeScale": [
      1.08,
      1.08
    ]
  },
  "garden": {
    "brows": [
      0.014,
      0.016,
      0.016,
      0.014
    ],
    "leaf": 0.7
  },
  "designer": {
    "brows": [
      0.016,
      0.018,
      0.018,
      0.016
    ],
    "look": [
      0.02,
      0.02
    ],
    "tip": [
      -0.2,
      0,
      0.62
    ],
    "roll": -0.04
  },
  "director": {
    "brows": [
      0.012,
      0.014,
      0.018,
      0.02
    ],
    "look": [
      0,
      0
    ],
    "tip": [
      -0.2,
      0,
      0.62
    ]
  },
  "coach": {
    "brows": [
      0.02,
      0.022,
      0.022,
      0.02
    ],
    "roll": 0.02
  },
  "traveller": {
    "brows": [
      0.018,
      0.02,
      0.02,
      0.018
    ],
    "look": [
      0.03,
      0.02
    ]
  },
  "money": {
    "brows": [
      0.008,
      0.01,
      0.01,
      0.008
    ],
    "look": [
      0,
      -0.02
    ],
    "tip": [
      -0.2,
      0,
      0.62
    ]
  },
  "planner": {
    "brows": [
      0.018,
      0.02,
      0.02,
      0.018
    ],
    "look": [
      0.02,
      0
    ],
    "roll": 0.04
  },
  "captain": {
    "brows": [
      0.014,
      0.016,
      0.016,
      0.014
    ],
    "look": [
      0.01,
      0
    ],
    "tip": [
      -0.2,
      0,
      0.62
    ]
  },
  "tester": {
    "brows": [
      0.008,
      0.01,
      0.022,
      0.026
    ],
    "look": [
      0,
      -0.005
    ],
    "roll": 0.02
  },
  "guard": {
    "brows": [
      0.02,
      0.022,
      0.012,
      0.01
    ],
    "look": [
      0,
      0
    ]
  },
  "bug": {
    "brows": [
      0.016,
      0.018,
      0.018,
      0.016
    ],
    "look": [
      0,
      0
    ],
    "tip": [
      -0.2,
      0,
      0.62
    ]
  },
  "dead": {
    "brows": [0, 0, 0, 0]
  }
};

export const DEFAULT_MOOD_BY_LOOK: Record<string, MoodId> = {
  "rest": "neutral",
  "cook": "happy",
  "investigate": "curious",
  "write": "focused",
  "dead": "neutral",
  "builder": "focused",
  "music": "happy",
  "tutor": "happy",
  "garden": "neutral",
  "designer": "curious",
  "director": "focused",
  "coach": "happy",
  "traveller": "happy",
  "money": "focused",
  "planner": "focused",
  "captain": "focused",
  "tester": "curious",
  "guard": "concerned",
  "bug": "curious"
};

export const MOOD_POSES: Record<MoodId, { brows: [number, number, number, number]; eye: [number, number]; roll: number }> = {
  "neutral": {
    "brows": [
      0,
      0,
      0,
      0
    ],
    "eye": [
      1,
      1
    ],
    "roll": 0
  },
  "happy": {
    "brows": [
      0.022,
      0.024,
      0.024,
      0.022
    ],
    "eye": [
      1,
      0.96
    ],
    "roll": 0.03
  },
  "focused": {
    "brows": [
      0.006,
      0.01,
      0.01,
      0.006
    ],
    "eye": [
      0.98,
      0.97
    ],
    "roll": 0
  },
  "curious": {
    "brows": [
      0.006,
      0.008,
      0.03,
      0.038
    ],
    "eye": [
      1.06,
      1.08
    ],
    "roll": 0.07
  },
  "unsure": {
    "brows": [
      0.018,
      0.022,
      0.008,
      0.004
    ],
    "eye": [
      1.02,
      1.03
    ],
    "roll": -0.08
  },
  "concerned": {
    "brows": [
      0.012,
      0.02,
      0.02,
      0.012
    ],
    "eye": [
      0.97,
      0.97
    ],
    "roll": -0.03
  },
  "listening": {
    "brows": [
      0.018,
      0.022,
      0.022,
      0.018
    ],
    "eye": [
      1.05,
      1.08
    ],
    "roll": 0.03
  },
  "thinking": {
    "brows": [
      0.008,
      0.01,
      0.028,
      0.034
    ],
    "eye": [
      1,
      1
    ],
    "roll": 0.06
  }
};

export const LOOK_KEYWORD_RULES: Array<[string, RegExp]> = [
  ["cook", /\b(cook|recipe|masak|resep|telur|egg|pasta|nasi|rice|pancake|dapur|kitchen|bumbu|goreng|rebus|makan|chef|koki)\b/i],
  ["guard", /\b(guard|danger|risk|risiko|delete|hapus|drop|truncate|confirm|konfirmasi|password|2fa|two-factor|auth|security|aman|keamanan|prod|production)\b/i],
  ["tester", /\b(test|testing|uji|penguji|spec|assert|coverage|jest|vitest|playwright|e2e|unit test|regression)\b/i],
  ["traveller", /\b(travel|traveller|trip|liburan|pergi|berangkat|rute|route|arah|berapa lama|estimasi|kemayoran|jakarta|bandung|jogja|bali|whoosh|lembang|flight|pesawat|kereta|stasiun|halte|transjakarta|krl|mrt|lrt|ojol|gocar|grab|stadium|stadion|jis|venue|konser|nonton|hotel|wisata|packing|ransel|koper|paspor|parkir)\b/i],
  ["bug", /\b(bug|error|crash|exception|stack ?trace|debug|cors|404|500|502|null|undefined|nan|rusak|pecah|lacak)\b/i],
  ["investigate", /\b(investigat|root cause|akar masalah|diagnos|kenapa|why|trace|audit|detektif|selidik|selidiki|forensic|latency|slow)\b/i],
  ["captain", /\b(git|branch|merge|rebase|commit|push|pull|release|rilis|deploy|ci\/cd|docker|kubernetes|kapten|kapal|tag)\b/i],
  ["director", /\b(video|script|skrip|film|sutradara|director|reel|short|hook|camera|kamera|shot|editing|storyboard|konten)\b/i],
  ["designer", /\b(ui\/ux|ux|font|tipografi|typography|color palette|palet warna|moodboard|figma|skeuo|skeuomorphic|hierarki visual|visual hierarchy|design system|mockup|wireframe|desainer)\b/i],
  ["builder", /\b(build|builder|code|kode|app|website|web|react|next|typescript|api|html|css|tailwind|framer|motion|layoutid|animasi|animation|dom|reflow|gpu|component|komponen|fitur|bikin aplikasi)\b/i],
  ["music", /\b(music|musik|lagu|song|playlist|audio|beat|bpm|spotify|fokus|focus mix|tempo|melodi|nada|chord|instrument)\b/i],
  ["planner", /\b(plan|rencana|perencana|jadwal|schedule|agenda|book|booking|meja|table|reservasi|yogyakarta|itinerary|rapat|meeting)\b/i],
  ["money", /\b(money|uang|keuangan|budget|anggaran|gaji|salary|split|patungan|tagihan|bill|pajak|tax|invest|tabungan|inflasi|bunga|rupiah|rp)\b/i],
  ["coach", /\b(coach|pelatih|workout|olahraga|latihan|gym|pushup|squat|plank|lunge|lari|run|cardio|kalori|kebiasaan|habit|tidur|sleep)\b/i],
  ["tutor", /\b(tutor|mentor|explain|jelasin|jelaskan|ajar|belajar|paham|pahami|mengerti|konsep|prinsip|mekanisme|analogi|bedanya|perbedaan|kenapa bisa|kok bisa|gimana cara kerja|apa itu|what is|how does|cara kerja|dns|vpn|https|cookie|cache|quantum|schr(ö|o)dinger)\b/i],
  ["garden", /\b(garden|kebun|pekebun|plant|tanaman|daun|leaf|kuning|layu|basil|kangkung|tomat|sukulen|succulent|pupuk|tanah|pot|repot|siram)\b/i],
  ["write", /\b(write|nulis|penulis|tulis|draft|draf|email|surat|apology|maaf|bio|caption|artikel|essay|blog|copywriting|surat lamaran|cold email)\b/i],
];
