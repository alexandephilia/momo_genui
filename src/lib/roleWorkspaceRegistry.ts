import { LOOK_NAMES, LOOK_JOBS } from "@/data/looks";
import type {
  ChatSession,
  WorkspaceBoardColumn,
  WorkspaceBoardItem,
} from "@/types/momo";

export type ArtworkFamily =
  | "general"
  | "travel"
  | "design"
  | "finance"
  | "engineering"
  | "culinary"
  | "learning"
  | "creative"
  | "botany";

export interface RoleWorkspaceConfig {
  lookId: string;
  label: string;
  identity: {
    expertise: string;
    communicationStyle: string;
  };
  capability: {
    tools: string[];
    primaryAffordances: string[];
  };
  presentation: {
    editorialMode: "editorial" | "technical" | "balanced";
    density: "spacious" | "balanced" | "compact";
    complimentaryNotes: string;
    artworkFamily: ArtworkFamily;
    complimentaryTag: string;
  };
  exploreHeadline: string;
  exploreSubline: string;
  exploreSuggestions: Array<{ kicker: string; label: string; prompt: string }>;
  chatHeroCue: string;
  chatHeroSuggestions: Array<{ tag: string; label: string; prompt: string }>;
  boardLabel: string;
  boardDefaultColumns: WorkspaceBoardColumn[];
  boardReshapeChips: Array<{ label: string; prompt: string }>;
}

const ROLE_OVERRIDES: Record<
  string,
  Omit<RoleWorkspaceConfig, "lookId" | "label">
> = {
  rest: {
    identity: {
      expertise: "Generalist assistant across reasoning, planning, current events, and technical synthesis.",
      communicationStyle: "Casual dari awal kayak temen deket: gue/lo, slang, ceplas-ceplos, dan bebas ngumpat kalau pas tanpa nunggu user duluan. Ngikutin ruangan: user kasar ikut kasar, user formal jadi rapi dan jernih, user lagi susah jadi lembut. Nggak pernah menggurui, nggak pernah kaku kayak buku teks atau pembaca berita.",
    },
    capability: {
      tools: ["web_search", "search_images", "sync_workspace_board"],
      primaryAffordances: ["prose", "table", "cards", "interactive_choices", "steps", "actions"],
    },
    presentation: {
      editorialMode: "balanced",
      density: "balanced",
      complimentaryNotes: "Use handwriting notes and circled numbers sparingly for standout points.",
      artworkFamily: "general",
      complimentaryTag: "PINBOARD",
    },
    exploreHeadline: "Mau eksplorasi topik apa hari ini?",
    exploreSubline: "Tanyakan apa saja. Ide utamanya disusun visual ke kanan dan otomatis bisa ditata ulang di Pinboard.",
    exploreSuggestions: [
      { kicker: "Info", label: "Berita penting hari ini", prompt: "Apa berita paling penting hari ini? Rangkum headline utamanya plus konteks singkat kenapa itu penting." },
      { kicker: "Cuaca", label: "Cuaca hari ini & besok", prompt: "Gimana cuaca hari ini dan besok? Kasih rangkuman suhu, peluang hujan, dan saran kegiatan outdoor." },
      { kicker: "Trending", label: "Lagi rame dibahas", prompt: "Apa topik yang lagi rame dibahas orang minggu ini? Jelasin konteksnya singkat." },
      { kicker: "Ide", label: "Satu hal produktif hari ini", prompt: "Saranin satu hal kecil tapi berdampak yang bisa gue kerjain hari ini." },
    ],
    chatHeroCue: "atau mulai cepat dari sini ~",
    chatHeroSuggestions: [
      { tag: "01", label: "Berita penting hari ini", prompt: "Apa berita paling penting hari ini? Rangkum headline utamanya plus konteks singkat." },
      { tag: "02", label: "Cuaca hari ini", prompt: "Gimana cuaca hari ini? Kasih rangkuman suhu, peluang hujan, dan saran kegiatan." },
      { tag: "03", label: "Lagi rame dibahas", prompt: "Apa yang lagi rame dibahas orang minggu ini? Jelasin konteks singkatnya." },
    ],
    boardLabel: "Pinboard",
    boardDefaultColumns: [
      { id: "col-1", title: "Sorotan", subtitle: "Ide utama" },
      { id: "col-2", title: "Evaluasi", subtitle: "Perlu dicek" },
      { id: "col-3", title: "Aksi Lanjut", subtitle: "Siap jalan" },
    ],
    boardReshapeChips: [
      { label: "Kelompokkan per prioritas", prompt: "Tolong kelompokkan ulang item di Pinboard berdasarkan prioritas dampak." },
      { label: "Ringkas langkah berikutnya", prompt: "Susun 3 langkah aksi paling penting dari isi Pinboard saat ini." },
    ],
  },
  traveller: {
    identity: {
      expertise: "Travel curator focused on neighborhood rhythm, transit ease, local food, and pacing.",
      communicationStyle: "Casual, seru, dan street-smart kayak temen lokal yang udah hafal lapangan ('gue/lo'). Jujur soal jam macet, trik transit/ojol, spot kuliner beneran vs tourist trap, dan pacing jalan yang realistis.",
    },
    capability: {
      tools: ["web_search", "search_images", "sync_workspace_board"],
      primaryAffordances: ["editorial_cards", "interactive_choices", "board_preview", "tabs", "actions"],
    },
    presentation: {
      editorialMode: "editorial",
      density: "spacious",
      complimentaryNotes: "Favor Display Serif titles, Reenie Beanie time/area notes, and hand-drawn circled budgets.",
      artworkFamily: "travel",
      complimentaryTag: "ITINERARY",
    },
    exploreHeadline: "Mau menjelajah ke mana berikutnya?",
    exploreSubline: "Mulai dari kota, suasana, atau bulan berangkat. Semua tempat bisa disusun ulang per hari di Itinerary.",
    exploreSuggestions: [
      { kicker: "Yogyakarta", label: "4 hari santai di Jogja", prompt: "Rencanakan 4 hari santai di Yogyakarta fokus kuliner legendaris, kopi pagi di Prawirotaman, dan rute candi tanpa macet." },
      { kicker: "Bandung", label: "Long weekend kuliner Bandung", prompt: "Rekomendasi long weekend di Bandung dari koridor Braga, Cihapit, sampai Dago dengan estimasi waktu tempuh." },
      { kicker: "Nusantara", label: "Pulau & laut Labuan Bajo", prompt: "Susun rencana liburan 4 hari di Labuan Bajo dan Taman Nasional Komodo lengkap dengan estimasi biaya per orang." },
      { kicker: "Kereta Jawa", label: "1 minggu kereta lintas Jawa", prompt: "Susun rute perjalanan 1 minggu hemat naik kereta dari Jakarta, Semarang, Solo, sampai Malang yang realistis." },
    ],
    chatHeroCue: "mau jalan ke mana kita? ~",
    chatHeroSuggestions: [
      { tag: "Jogja", label: "4 hari kuliner & candi pagi", prompt: "Rencanakan 4 hari santai di Yogyakarta fokus kuliner legendaris, kopi pagi di Prawirotaman, dan rute candi tanpa macet." },
      { tag: "Bandung", label: "Rute jalan kaki Braga & Cihapit", prompt: "Rekomendasi long weekend di Bandung dari koridor Braga, Cihapit, sampai Dago dengan estimasi waktu tempuh." },
      { tag: "Bajo", label: "Estimasi trip Labuan Bajo", prompt: "Susun rencana liburan 4 hari di Labuan Bajo dan Taman Nasional Komodo lengkap dengan estimasi biaya per orang." },
    ],
    boardLabel: "Itinerary",
    boardDefaultColumns: [
      { id: "day-1", title: "Day 1", subtitle: "Arrival & orientasi" },
      { id: "day-2", title: "Day 2", subtitle: "Eksplorasi inti" },
      { id: "day-3", title: "Day 3", subtitle: "Spot lokal & santai" },
    ],
    boardReshapeChips: [
      { label: "Kelompokkan per area", prompt: "Susun ulang kartu Itinerary berdasarkan kedekatan area agar tidak bolak-balik." },
      { label: "Buat ritme lebih santai", prompt: "Kurangi kepadatan Itinerary jadi maksimal 2 spot utama per hari." },
      { label: "Rekomendasi makan dekat sini", prompt: "Tambahkan rekomendasi tempat makan siang & malam di sekitar rute Itinerary." },
    ],
  },
  designer: {
    identity: {
      expertise: "Product designer focused on hierarchy, typography, tactile elevation, and spatial motion.",
      communicationStyle: "Gaya ngobrol studio kreatif ('gue/lo'), punya selera visual tajam, opini kuat soal kerning, kontras, tactile skeuo, dan spring motion. Alergi UI generik yang ngebosenin.",
    },
    capability: {
      tools: ["web_search", "search_images", "sync_workspace_board"],
      primaryAffordances: ["editorial_cards", "interactive_choices", "tabs", "metrics", "board_preview"],
    },
    presentation: {
      editorialMode: "editorial",
      density: "spacious",
      complimentaryNotes: "Showcase editorial Serif headings, highlight callouts, color swatches, and visual critique notes.",
      artworkFamily: "design",
      complimentaryTag: "SWATCH & TYPE",
    },
    exploreHeadline: "Konsep visual apa yang mau digarap?",
    exploreSubline: "Bahas arah tipografi, sistem warna, atau komposisi layout lalu kumpulkan referensinya di Moodboard.",
    exploreSuggestions: [
      { kicker: "Sistem", label: "Audit hierarki kartu & shadow", prompt: "Evaluasi kontras visual dan hierarki kartu untuk light dan dark mode." },
      { kicker: "Tipografi", label: "Pasangan Serif + Handwriting", prompt: "Rancang pasangan Display Serif dan tulisan tangan untuk workspace editorial." },
      { kicker: "Motion", label: "Transisi tab tanpa flicker", prompt: "Bandingkan pola transisi tab untuk antarmuka dengan konten dinamis." },
      { kicker: "Eksplorasi", label: "Moodboard skeuomorphic modern", prompt: "Susun prinsip visual porcelain light vs matte charcoal dark." },
    ],
    chatHeroCue: "coresan arah visual dulu ~",
    chatHeroSuggestions: [
      { tag: "Type", label: "Pasangan Serif & UI Sans", prompt: "Rancang pasangan Display Serif dan UI Sans untuk antarmuka editorial." },
      { tag: "Elevation", label: "Porcelain vs Matte Charcoal", prompt: "Susun prinsip visual elevasi porcelain light vs matte charcoal dark." },
      { tag: "Motion", label: "Micro-interaction 60FPS", prompt: "Review aturan spring Motion agar transisi terasa organik tanpa jank." },
    ],
    boardLabel: "Moodboard",
    boardDefaultColumns: [
      { id: "col-ref", title: "Referensi", subtitle: "Arah gaya" },
      { id: "col-token", title: "Token & Type", subtitle: "Skala & warna" },
      { id: "col-ship", title: "Final Polish", subtitle: "Siap implementasi" },
    ],
    boardReshapeChips: [
      { label: "Urutkan berdasarkan alur layar", prompt: "Kelompokkan kartu Moodboard sesuai urutan alur layar pengguna." },
      { label: "Audit konsistensi warna", prompt: "Review elemen di Moodboard dari sisi konsistensi kontras dark/light mode." },
    ],
  },
  money: {
    identity: {
      expertise: "Personal finance & modeling strategist handling cashflow, yield math, and risk buffers.",
      communicationStyle: "Conversational tapi tajam soal angka ('gue/lo' atau peer akrab), blak-blakan ngebongkar biaya tersembunyi, kebocoran arus kas, dan asumsi yield tanpa bahasa bank yang kaku.",
    },
    capability: {
      tools: ["web_search", "search_images", "sync_workspace_board"],
      primaryAffordances: ["calculator", "bars", "ring", "metrics", "table", "interactive_choices"],
    },
    presentation: {
      editorialMode: "balanced",
      density: "balanced",
      complimentaryNotes: "Circle key nominal figures and use calculators only when tuning parameters adds insight.",
      artworkFamily: "finance",
      complimentaryTag: "BUCKET & YIELD",
    },
    exploreHeadline: "Angka atau strategi finansial apa yang mau dibedah?",
    exploreSubline: "Uji skenario alokasi, proyeksi bunga, atau efisiensi budget dan simpan ke Bucket Board.",
    exploreSuggestions: [
      { kicker: "Simulasi", label: "Alokasi gaji & dana darurat", prompt: "Bantu simulasi alokasi pemasukan bulanan untuk tabungan, investasi, dan gaya hidup." },
      { kicker: "Bandingkan", label: "KPR tetap vs mengambang", prompt: "Bandingkan cicilan tetap vs mengambang untuk jangka 15 tahun." },
      { kicker: "Budget", label: "Audit langganan & burn rate", prompt: "Susun kerangka audit pengeluaran rutin bulanan untuk menekan kebocoran." },
      { kicker: "Target", label: "Proyeksi investasi 5 tahun", prompt: "Hitung simulasi pertumbuhan dana rutin selama 5 tahun." },
    ],
    chatHeroCue: "cek angka biar nggak bocor ~",
    chatHeroSuggestions: [
      { tag: "Rp", label: "Simulasi alokasi gaji", prompt: "Bantu simulasi alokasi pemasukan bulanan untuk tabungan, investasi, dan gaya hidup." },
      { tag: "5Th", label: "Proyeksi nabung rutin", prompt: "Hitung simulasi pertumbuhan dana rutin selama 5 tahun." },
      { tag: "Audit", label: "Pangkas langganan bocor", prompt: "Susun kerangka audit pengeluaran rutin bulanan untuk menekan kebocoran." },
    ],
    boardLabel: "Budget Board",
    boardDefaultColumns: [
      { id: "col-need", title: "Wajib & Tetap", subtitle: "Kebutuhan inti" },
      { id: "col-save", title: "Cadangan & Invest", subtitle: "Pertumbuhan" },
      { id: "col-flex", title: "Fleksibel", subtitle: "Opsional" },
    ],
    boardReshapeChips: [
      { label: "Ketatkan budget 15%", prompt: "Atur ulang bucket di Budget Board supaya total pengeluaran turun sekitar 15%." },
      { label: "Simulasikan skenario dana darurat", prompt: "Tampilkan kalkulator interaktif untuk target dana darurat 6 bulan." },
    ],
  },
  bug: {
    identity: {
      expertise: "Senior debugging & incident engineer specializing in root-cause isolation and repro clarity.",
      communicationStyle: "Gaya senior engineer di war-room ('gue/lo'): tajam, blak-blakan, alergi tebak-tebakan tanpa bukti, langsung sikat gejala vs root cause dan kasih patch yang beres.",
    },
    capability: {
      tools: ["web_search", "search_images", "sync_workspace_board"],
      primaryAffordances: ["code", "steps", "callout", "table", "checklist", "board_preview"],
    },
    presentation: {
      editorialMode: "technical",
      density: "compact",
      complimentaryNotes: "Pair structured reproduction checklists and code diffs with sharp severity callouts.",
      artworkFamily: "engineering",
      complimentaryTag: "! REPRO TRACE",
    },
    exploreHeadline: "Bug atau error apa yang lagi membandel?",
    exploreSubline: "Lacak jejak reproduksi, pisahkan gejala dari akar masalah, lalu kelola status perbaikan di Triage Board.",
    exploreSuggestions: [
      { kicker: "React", label: "Stale closure di stream SSE", prompt: "Bedah penyebab bug state stale saat menerima event SSE cepat di React." },
      { kicker: "Layout", label: "CLS & jump pas switch tab", prompt: "Cara mendiagnosis animasi tab yang melompat sebelum unmount selesai." },
      { kicker: "API", label: "Timeout & retry race condition", prompt: "Tunjukkan pola isolasi race condition pada request fetch berulang." },
      { kicker: "CSS", label: "Konflik transition vs Motion", prompt: "Kenapa animasi CSS dan Motion saling bertabrakan pada property transform?" },
    ],
    chatHeroCue: "paste stack trace atau pilih skenario repro",
    chatHeroSuggestions: [
      { tag: "SSE", label: "Isolasi stale closure React", prompt: "Bedah penyebab bug state stale saat menerima event SSE cepat di React." },
      { tag: "RACE", label: "Fetch retry race condition", prompt: "Tunjukkan pola isolasi race condition pada request fetch berulang." },
      { tag: "CSS", label: "Konflik CSS vs Motion", prompt: "Kenapa animasi CSS dan Motion saling bertabrakan pada property transform?" },
    ],
    boardLabel: "Triage Board",
    boardDefaultColumns: [
      { id: "col-repro", title: "Repro", subtitle: "Gejala & langkah" },
      { id: "col-root", title: "Root Cause", subtitle: "Akar masalah" },
      { id: "col-fix", title: "Fix & Verify", subtitle: "Patch & test" },
    ],
    boardReshapeChips: [
      { label: "Urutkan berdasar severity", prompt: "Urutkan item di Triage Board berdasarkan tingkat dampak ke user." },
      { label: "Buat checklist verifikasi", prompt: "Hasilkan checklist regresi untuk memverifikasi perbaikan pada Triage Board." },
    ],
  },
  investigate: {
    identity: {
      expertise: "Systems investigator mapping hypotheses, causal chains, and missing evidence.",
      communicationStyle: "Kritis, penasaran, dan tajam kayak detektif lapangan ('gue/lo' atau peer investigatif). Selalu misahin bukti keras dari asumsi dan berani nantang klaim yang belum terverifikasi.",
    },
    capability: {
      tools: ["web_search", "search_images", "sync_workspace_board"],
      primaryAffordances: ["table", "steps", "callout", "editorial_cards", "actions"],
    },
    presentation: {
      editorialMode: "technical",
      density: "balanced",
      complimentaryNotes: "Highlight verified clues and frame competing hypotheses cleanly.",
      artworkFamily: "engineering",
      complimentaryTag: "EVIDENCE LOG",
    },
    exploreHeadline: "Kasus atau anomali apa yang mau diusut?",
    exploreSubline: "Kumpulkan temuan, bandingkan hipotesis, dan susun peta bukti di Evidence Wall.",
    exploreSuggestions: [
      { kicker: "Performa", label: "Kenapa LCP naik di produksi", prompt: "Susun investigasi terstruktur untuk lonjakan latency rendering di Next.js." },
      { kicker: "Data", label: "Selisih angka metrik antar sistem", prompt: "Rancang matrix investigasi selisih data antara frontend dan API." },
      { kicker: "Keamanan", label: "Audit alur autentikasi & session", prompt: "Petakan titik rawan dan bukti audit pada alur login berbasis token." },
      { kicker: "UX", label: "Drop-off tinggi di step ke-2", prompt: "Bantu evaluasi hipotesis penyebab user berhenti di alur onboarding." },
    ],
    chatHeroCue: "pisahin fakta lapangan dari asumsi",
    chatHeroSuggestions: [
      { tag: "LCP", label: "Investigasi latency Next.js", prompt: "Susun investigasi terstruktur untuk lonjakan latency rendering di Next.js." },
      { tag: "DIFF", label: "Selisih metrik API vs UI", prompt: "Rancang matrix investigasi selisih data antara frontend dan API." },
      { tag: "AUTH", label: "Audit titik rawan session", prompt: "Petakan titik rawan dan bukti audit pada alur login berbasis token." },
    ],
    boardLabel: "Evidence Wall",
    boardDefaultColumns: [
      { id: "col-clue", title: "Bukti", subtitle: "Data teramati" },
      { id: "col-hyp", title: "Hipotesis", subtitle: "Dugaan sebab" },
      { id: "col-verdict", title: "Kesimpulan", subtitle: "Terverifikasi" },
    ],
    boardReshapeChips: [
      { label: "Pisahkan fakta vs asumsi", prompt: "Kelompokkan kartu di Evidence Wall mana yang sudah terbukti vs masih hipotesis." },
      { label: "Tentukan tes pembuktian", prompt: "Berikan eksperimen tercepat untuk membuktikan hipotesis teratas." },
    ],
  },
  captain: {
    identity: {
      expertise: "Release captain managing git hygiene, CI/CD gates, deployment cutovers, and rollback safety.",
      communicationStyle: "Tegas, taktis, dan sigap kayak komandan rilis ('kita/lo'). Fokus ke checklist go/no-go, blast radius, dan kesiapan rollback sebelum tombol deploy dipencet.",
    },
    capability: {
      tools: ["web_search", "search_images", "sync_workspace_board"],
      primaryAffordances: ["checklist", "metrics", "tabs", "code", "actions"],
    },
    presentation: {
      editorialMode: "technical",
      density: "compact",
      complimentaryNotes: "Use crisp go/no-go release gates, blast-radius callouts, and rollback commands.",
      artworkFamily: "engineering",
      complimentaryTag: "RELEASE GATE",
    },
    exploreHeadline: "Rilis atau branch mana yang mau dikawal?",
    exploreSubline: "Periksa kesiapan merge, validasi gate CI/CD, dan susun daftar go/no-go di Release Board.",
    exploreSuggestions: [
      { kicker: "Git", label: "Strategi rebase & konflik branch", prompt: "Susun alur aman menyelesaikan konflik merge pada branch rilis besar." },
      { kicker: "CI/CD", label: "Checklist prasyarat go-live", prompt: "Buat checklist go/no-go sebelum deploy aplikasi Next.js ke produksi." },
      { kicker: "Rollback", label: "Rencana mitigasi rilis gagal", prompt: "Rancang prosedur rollback cepat untuk migrasi database dan frontend." },
      { kicker: "Container", label: "Optimasi Docker build cache", prompt: "Bandingkan strategi caching layer Docker agar pipeline rilis lebih cepat." },
    ],
    chatHeroCue: "cek kesiapan gate rilis sebelum ship",
    chatHeroSuggestions: [
      { tag: "SHIP", label: "Checklist go/no-go deploy", prompt: "Buat checklist go/no-go sebelum deploy aplikasi Next.js ke produksi." },
      { tag: "GIT", label: "Urutan aman beresin konflik", prompt: "Susun alur aman menyelesaikan konflik merge pada branch rilis besar." },
      { tag: "ROLL", label: "Skenario rollback instan", prompt: "Rancang prosedur rollback cepat untuk migrasi database dan frontend." },
    ],
    boardLabel: "Release Board",
    boardDefaultColumns: [
      { id: "col-ready", title: "Ready", subtitle: "Lolos QA & CI" },
      { id: "col-blocked", title: "Blocked", subtitle: "Butuh tindakan" },
      { id: "col-shipped", title: "Shipped", subtitle: "Live di prod" },
    ],
    boardReshapeChips: [
      { label: "Saring item blocker rilis", prompt: "Tandai seluruh item di Release Board yang menghambat deploy hari ini." },
      { label: "Ringkas release notes", prompt: "Buat ringkasan changelog user-facing dari item Release Board." },
    ],
  },
  builder: {
    identity: {
      expertise: "Full-stack maker architecting clean components, state wiring, APIs, and rapid prototypes.",
      communicationStyle: "Pragmatis, hands-on, gaya ngobrol sesama builder ('gue/lo'). Lebih suka langsung ngerakit kode modular yang bersih daripada teori arsitektur yang kepanjangan.",
    },
    capability: {
      tools: ["web_search", "search_images", "sync_workspace_board"],
      primaryAffordances: ["code", "steps", "tabs", "cards", "checklist"],
    },
    presentation: {
      editorialMode: "technical",
      density: "balanced",
      complimentaryNotes: "Pair crisp component wireframes with concrete TypeScript contracts and modular steps.",
      artworkFamily: "engineering",
      complimentaryTag: "BLUEPRINT",
    },
    exploreHeadline: "Fitur atau sistem apa yang mau dirakit?",
    exploreSubline: "Rancang struktur komponen, kontrak tipe, dan urutan pengerjaan modular di Build Canvas.",
    exploreSuggestions: [
      { kicker: "Arsitektur", label: "Modularisasi React state kompleks", prompt: "Rancang pemisahan state, hooks, dan reducer untuk editor interaktif." },
      { kicker: "API", label: "Streaming SSE typed protocol", prompt: "Susun kontrak event SSE yang aman untuk streaming teks dan UI blok." },
      { kicker: "Performa", label: "Optimasi canvas 60FPS WebGL/DOM", prompt: "Tunjukkan pola memisahkan animasi transform dari re-render React." },
      { kicker: "Storage", label: "Sinkronisasi draft lokal & server", prompt: "Desain mekanisme autosave tahan offline untuk aplikasi Next.js." },
    ],
    chatHeroCue: "mau rakit modul atau arsitektur apa?",
    chatHeroSuggestions: [
      { tag: "SSE", label: "Protokol stream GenUI", prompt: "Susun kontrak event SSE yang aman untuk streaming teks dan UI blok." },
      { tag: "60FPS", label: "Pisahkan animasi & React state", prompt: "Tunjukkan pola memisahkan animasi transform dari re-render React." },
      { tag: "STATE", label: "Struktur hooks & reducer bersih", prompt: "Rancang pemisahan state, hooks, dan reducer untuk editor interaktif." },
    ],
    boardLabel: "Build Canvas",
    boardDefaultColumns: [
      { id: "col-spec", title: "Arsitektur", subtitle: "Kontrak & tipe" },
      { id: "col-build", title: "Bangun", subtitle: "Komponen & API" },
      { id: "col-wire", title: "Integrasi", subtitle: "Wiring & uji" },
    ],
    boardReshapeChips: [
      { label: "Pecah jadi task modular", prompt: "Pecah komponen besar di Build Canvas jadi langkah implementasi kecil." },
      { label: "Cari ketergantungan API", prompt: "Soroti urutan wiring frontend ke backend pada Build Canvas." },
    ],
  },
  tester: {
    identity: {
      expertise: "QA & verification strategist focused on edge cases, test matrices, and deterministic assertions.",
      communicationStyle: "Skeptis, teliti, dan suka ngulik skenario 'gimana kalau...' ('gue/lo'). Nggak pernah percaya happy-path sebelum boundary & race condition diuji.",
    },
    capability: {
      tools: ["web_search", "search_images", "sync_workspace_board"],
      primaryAffordances: ["table", "ring", "checklist", "metrics", "code"],
    },
    presentation: {
      editorialMode: "technical",
      density: "compact",
      complimentaryNotes: "Highlight edge-case boundary matrices and deterministic pass/fail criteria.",
      artworkFamily: "engineering",
      complimentaryTag: "TEST MATRIX",
    },
    exploreHeadline: "Alur atau edge case mana yang mau diuji?",
    exploreSubline: "Petakan skenario batas, race condition, dan assertions deterministik ke dalam Test Matrix.",
    exploreSuggestions: [
      { kicker: "E2E", label: "Skenario Playwright anti-flaky", prompt: "Susun pola wait dan assertion Playwright yang stabil untuk UI streaming." },
      { kicker: "Edge", label: "Uji kondisi jaringan lambat & putus", prompt: "Buat matriks pengujian saat koneksi terputus di tengah respons AI." },
      { kicker: "Boundary", label: "Validasi input ekstrem & XSS", prompt: "Daftar edge case keamanan dan karakter aneh untuk input JSON/Markdown." },
      { kicker: "A11y", label: "Audit fokus keyboard & reduced-motion", prompt: "Buat checklist pengujian navigasi keyboard dan prefers-reduced-motion." },
    ],
    chatHeroCue: "uji skenario batas dan edge case dulu",
    chatHeroSuggestions: [
      { tag: "E2E", label: "Assert Playwright bebas flaky", prompt: "Susun pola wait dan assertion Playwright yang stabil untuk UI streaming." },
      { tag: "NET", label: "Putus koneksi tengah stream", prompt: "Buat matriks pengujian saat koneksi terputus di tengah respons AI." },
      { tag: "A11Y", label: "Cek fokus & reduced motion", prompt: "Buat checklist pengujian navigasi keyboard dan prefers-reduced-motion." },
    ],
    boardLabel: "Test Matrix",
    boardDefaultColumns: [
      { id: "col-pass", title: "Pass", subtitle: "Terverifikasi" },
      { id: "col-edge", title: "Edge Case", subtitle: "Kondisi batas" },
      { id: "col-fail", title: "Fail / Gap", subtitle: "Perlu coverage" },
    ],
    boardReshapeChips: [
      { label: "Prioritaskan skenario berisiko", prompt: "Urutkan skenario di Test Matrix dari dampak kegagalan paling tinggi." },
      { label: "Tambah negative test case", prompt: "Tambahkan skenario kegagalan input & timeout ke Test Matrix." },
    ],
  },
  guard: {
    identity: {
      expertise: "Security & reliability guardian checking permissions, blast radius, and destructive operations.",
      communicationStyle: "Waspada, lugas, dan tanpa kompromi soal celah keamanan ('gue/lo'), tapi selalu ngasih mitigasi praktis yang langsung bisa dipasang.",
    },
    capability: {
      tools: ["web_search", "search_images", "sync_workspace_board"],
      primaryAffordances: ["callout", "checklist", "table", "code", "actions"],
    },
    presentation: {
      editorialMode: "technical",
      density: "compact",
      complimentaryNotes: "Use stark severity banners and tiered risk registers before approving irreversible changes.",
      artworkFamily: "engineering",
      complimentaryTag: "RISK SHIELD",
    },
    exploreHeadline: "Risiko atau celah mana yang mau diperiksa?",
    exploreSubline: "Evaluasi otorisasi, sanitasi payload, dan radius dampak perubahan sebelum disahkan di Risk Register.",
    exploreSuggestions: [
      { kicker: "XSS", label: "Sanitasi komponen GenUI dinamis", prompt: "Audit risiko injeksi saat merender props komponen UI dari respons model." },
      { kicker: "Auth", label: "Celah IDOR & kebocoran session", prompt: "Periksa kontrol akses paling sering bocor pada endpoint API multi-user." },
      { kicker: "Data", label: "Checklist sebelum operasi destruktif", prompt: "Susun pagar pengaman untuk migrasi atau penghapusan data produksi." },
      { kicker: "CSP", label: "Hardening header keamanan Next.js", prompt: "Rancang header CSP, CSRF, dan rate limit dasar untuk aplikasi AI." },
    ],
    chatHeroCue: "periksa radius dampak sebelum eksekusi",
    chatHeroSuggestions: [
      { tag: "SAN", label: "Sanitasi payload GenUI", prompt: "Audit risiko injeksi saat merender props komponen UI dari respons model." },
      { tag: "IDOR", label: "Audit batas akses API", prompt: "Periksa kontrol akses paling sering bocor pada endpoint API multi-user." },
      { tag: "CSP", label: "Header keamanan Next.js", prompt: "Rancang header CSP, CSRF, dan rate limit dasar untuk aplikasi AI." },
    ],
    boardLabel: "Risk Register",
    boardDefaultColumns: [
      { id: "col-low", title: "Low", subtitle: "Risiko terkendali" },
      { id: "col-med", title: "Medium", subtitle: "Perlu mitigasi" },
      { id: "col-crit", title: "Critical", subtitle: "Wajib blokir dulu" },
    ],
    boardReshapeChips: [
      { label: "Tunjukkan mitigasi tercepat", prompt: "Tambahkan langkah mitigasi konkret untuk semua risiko Critical & Medium." },
      { label: "Audit surface input user", prompt: "Fokuskan Risk Register pada seluruh titik masuk input yang belum tersanitasi." },
    ],
  },
  planner: {
    identity: {
      expertise: "Strategic planner structuring milestones, dependencies, and realistic pacing.",
      communicationStyle: "Kolaboratif, tenang, dan membumi ('kita/lo'). Jago mecah kerjaan numpuk jadi urutan eksekusi yang masuk akal tanpa bikin kewalahan.",
    },
    capability: {
      tools: ["web_search", "search_images", "sync_workspace_board"],
      primaryAffordances: ["steps", "checklist", "tabs", "bars", "board_preview"],
    },
    presentation: {
      editorialMode: "balanced",
      density: "balanced",
      complimentaryNotes: "Highlight critical path items and organize work cleanly across time buckets.",
      artworkFamily: "learning",
      complimentaryTag: "TIMELINE",
    },
    exploreHeadline: "Roadmap atau agenda apa yang mau disusun?",
    exploreSubline: "Ubah tujuan besar jadi langkah bertahap dan kelola urutan eksekusi di Schedule Board.",
    exploreSuggestions: [
      { kicker: "Sprint", label: "Roadmap rilis 2 minggu", prompt: "Susun rencana sprint 2 minggu untuk peluncuran fitur baru." },
      { kicker: "Peluncuran", label: "Checklist kesiapan launch", prompt: "Buat kerangka persiapan teknis dan produk sebelum go-live." },
      { kicker: "Prioritas", label: "Pilah backlog berantakan", prompt: "Bantu menyusun metode prioritaskan 10 task yang datang bersamaan." },
      { kicker: "Mingguan", label: "Blok waktu deep work", prompt: "Rancang struktur minggu kerja seimbang antara coding, review, dan istirahat." },
    ],
    chatHeroCue: "susun ritme biar jalan realistis ~",
    chatHeroSuggestions: [
      { tag: "2Mgg", label: "Susun sprint peluncuran", prompt: "Susun rencana sprint 2 minggu untuk peluncuran fitur baru." },
      { tag: "Triage", label: "Pilah 10 task menumpuk", prompt: "Bantu menyusun metode prioritaskan 10 task yang datang bersamaan." },
      { tag: "Focus", label: "Blok jadwal deep work", prompt: "Rancang struktur minggu kerja seimbang antara coding, review, dan istirahat." },
    ],
    boardLabel: "Schedule Board",
    boardDefaultColumns: [
      { id: "col-today", title: "Hari Ini", subtitle: "Fokus utama" },
      { id: "col-week", title: "Minggu Ini", subtitle: "Antrian aktif" },
      { id: "col-later", title: "Backlog", subtitle: "Tahap lanjut" },
    ],
    boardReshapeChips: [
      { label: "Seimbangkan beban per tahap", prompt: "Ratakan distribusi item di Schedule Board supaya tidak menumpuk di satu fase." },
      { label: "Cari ketergantungan kritis", prompt: "Soroti item mana yang memblokir pekerjaan lain di Schedule Board." },
    ],
  },
  cook: {
    identity: {
      expertise: "Culinary guide focused on ingredient balance, timing, texture, and kitchen prep.",
      communicationStyle: "Hangat, santai, dan menggugah selera kayak temen masak di dapur ('kita/lo'). Suka ngasih patokan aroma, bunyi tumisan, kontrol api, dan substitusi bahan rumahan.",
    },
    capability: {
      tools: ["web_search", "search_images", "sync_workspace_board"],
      primaryAffordances: ["editorial_cards", "checklist", "steps", "calculator", "interactive_choices"],
    },
    presentation: {
      editorialMode: "editorial",
      density: "spacious",
      complimentaryNotes: "Use Display Serif dish titles, circled prep time/temp, and handwritten tasting notes.",
      artworkFamily: "culinary",
      complimentaryTag: "PREP °C",
    },
    exploreHeadline: "Mau masak atau ngulik menu apa?",
    exploreSubline: "Cari inspirasi hidangan, takar porsi otomatis, dan susun alur memasak di Prep Board.",
    exploreSuggestions: [
      { kicker: "Cepat", label: "Lauk & sambal malam 20 menit", prompt: "Ide lauk gurih rumahan dan sambal segar yang siap dalam 20 menit dengan bahan dapur Indonesia." },
      { kicker: "Berkuah", label: "Soto Betawi & rawon rumahan", prompt: "Resep soto Betawi gurih atau rawon rempah pekat versi rumahan beserta tahapan prep bumbu halus." },
      { kicker: "Roti", label: "Roti sobek susu tanpa mixer", prompt: "Panduan membuat roti sobek susu lembut metode ulen minimal di rumah." },
      { kicker: "Keluarga", label: "Susunan makan malam 4 porsi", prompt: "Rancang susunan hidangan makan malam Nusantara untuk 4 orang yang prep-nya bisa dicicil." },
    ],
    chatHeroCue: "buka kulkas, mau masak apa? ~",
    chatHeroSuggestions: [
      { tag: "20m", label: "Lauk & sambal praktis", prompt: "Ide lauk gurih rumahan dan sambal segar yang siap dalam 20 menit dengan bahan dapur Indonesia." },
      { tag: "Rempah", label: "Soto & rawon kuah mantap", prompt: "Resep soto Betawi gurih atau rawon rempah pekat versi rumahan beserta tahapan prep bumbu halus." },
      { tag: "Ulen", label: "Roti sobek tanpa mixer", prompt: "Panduan membuat roti sobek susu lembut metode ulen minimal di rumah." },
    ],
    boardLabel: "Prep Board",
    boardDefaultColumns: [
      { id: "col-prep", title: "Prep Awal", subtitle: "Potong & marinasi" },
      { id: "col-cook", title: "Masak Inti", subtitle: "Kompor / oven" },
      { id: "col-plate", title: "Sajikan", subtitle: "Finishing" },
    ],
    boardReshapeChips: [
      { label: "Skalakan ke 4 porsi", prompt: "Hitung ulang kebutuhan bahan dan langkah Prep Board untuk 4 porsi." },
      { label: "Urutkan timeline kompor", prompt: "Susun urutan masak di Prep Board supaya semua hidangan matang bersamaan." },
    ],
  },
  write: {
    identity: {
      expertise: "Editorial writer and copy editor sharpening structure, cadence, and narrative hook.",
      communicationStyle: "Tajam, ekspresif, dan ritmis ('gue/lo'). Peka banget sama pilihan diksi, anti kalimat klise/robotik, dan fokus bikin tulisan langsung hidup.",
    },
    capability: {
      tools: ["web_search", "search_images", "sync_workspace_board"],
      primaryAffordances: ["prose", "tabs", "editorial_cards", "interactive_choices"],
    },
    presentation: {
      editorialMode: "editorial",
      density: "spacious",
      complimentaryNotes: "Highlight strong hooks in marker tint and attach brief editor margin notes.",
      artworkFamily: "creative",
      complimentaryTag: "EDITORIAL",
    },
    exploreHeadline: "Tulisan atau narasi apa yang mau dirangkai?",
    exploreSubline: "Uji sudut pandang, bandingkan nada tulisan, lalu susun alurnya di Story Board.",
    exploreSuggestions: [
      { kicker: "Produk", label: "Launch note singkat & tajam", prompt: "Tulis catatan peluncuran fitur baru dengan gaya lugas dan jelas." },
      { kicker: "Esai", label: "Outline artikel teknis mendalam", prompt: "Buat kerangka artikel tentang desain antarmuka AI yang tidak membosankan." },
      { kicker: "Copy", label: "3 variasi microcopy onboarding", prompt: "Bandingkan 3 gaya nada copy untuk halaman sambutan aplikasi." },
      { kicker: "Review", label: "Perbaiki teks biar nggak kaku", prompt: "Tunjukkan prinsip mengedit paragraf panjang supaya lebih hidup." },
    ],
    chatHeroCue: "mulai dari satu premis kuat ~",
    chatHeroSuggestions: [
      { tag: "Hook", label: "Launch note singkat & tajam", prompt: "Tulis catatan peluncuran fitur baru dengan gaya lugas dan jelas." },
      { tag: "Copy", label: "3 nada microcopy aplikasi", prompt: "Bandingkan 3 gaya nada copy untuk halaman sambutan aplikasi." },
      { tag: "Edit", label: "Hidupkan paragraf kaku", prompt: "Tunjukkan prinsip mengedit paragraf panjang supaya lebih hidup." },
    ],
    boardLabel: "Outline Board",
    boardDefaultColumns: [
      { id: "col-hook", title: "Pembuka", subtitle: "Hook & premis" },
      { id: "col-body", title: "Isi Utama", subtitle: "Argumen & contoh" },
      { id: "col-close", title: "Penutup", subtitle: "Punchline / CTA" },
    ],
    boardReshapeChips: [
      { label: "Beri 2 variasi nada", prompt: "Sajikan perbandingan 2 variasi gaya bahasa untuk isi Outline Board." },
      { label: "Perkuat hook pembuka", prompt: "Usulkan 3 opsi kalimat pembuka yang lebih tajam." },
    ],
  },
  director: {
    identity: {
      expertise: "Video director & story producer shaping framing, pacing, hook seconds, and shot lists.",
      communicationStyle: "Visual, energik, dan punchy ('gue/lo'). Ngobrol dalam bahasa gambar, angle kamera, ritme cut, dan hook 3 detik pertama yang langsung ngunci penonton.",
    },
    capability: {
      tools: ["web_search", "search_images", "sync_workspace_board"],
      primaryAffordances: ["steps", "editorial_cards", "table", "actions"],
    },
    presentation: {
      editorialMode: "editorial",
      density: "spacious",
      complimentaryNotes: "Include shot-ratio tags, timecode markers, and camera/audio margin notes.",
      artworkFamily: "creative",
      complimentaryTag: "TIMECODE",
    },
    exploreHeadline: "Cerita atau shot video apa yang mau digarap?",
    exploreSubline: "Susun hook pembuka, shot list kamera, dan ritme editing lalu geser adegan di Storyboard.",
    exploreSuggestions: [
      { kicker: "Hook", label: "3 pembuka reel dalam 3 detik", prompt: "Buat 3 variasi visual hook 3 detik pertama untuk demo produk UI." },
      { kicker: "Script", label: "Naskah demo produk 60 detik", prompt: "Susun naskah video 60 detik lengkap dengan cue visual dan voiceover." },
      { kicker: "Framing", label: "Shot list B-roll meja kerja", prompt: "Rancang daftar sudut kamera dan pencahayaan simpel untuk studio meja." },
      { kicker: "Pacing", label: "Irama cut agar retensi tinggi", prompt: "Bedah pola pacing editing antara shot lebar, close-up, dan teks layar." },
    ],
    chatHeroCue: "3 detik pertama harus nempel ~",
    chatHeroSuggestions: [
      { tag: "0:03", label: "3 hook visual demo UI", prompt: "Buat 3 variasi visual hook 3 detik pertama untuk demo produk UI." },
      { tag: "60s", label: "Script + cue kamera 60 detik", prompt: "Susun naskah video 60 detik lengkap dengan cue visual dan voiceover." },
      { tag: "Shot", label: "Setup B-roll meja estetik", prompt: "Rancang daftar sudut kamera dan pencahayaan simpel untuk studio meja." },
    ],
    boardLabel: "Storyboard",
    boardDefaultColumns: [
      { id: "col-scene1", title: "Hook (0-5s)", subtitle: "Pancing perhatian" },
      { id: "col-scene2", title: "Isi & Demo", subtitle: "Alur cerita" },
      { id: "col-scene3", title: "Payoff / CTA", subtitle: "Penutup kuat" },
    ],
    boardReshapeChips: [
      { label: "Perketat durasi jadi 45 detik", prompt: "Padatkan seluruh adegan di Storyboard biar muat mulus di 45 detik." },
      { label: "Tambah catatan transisi B-roll", prompt: "Lengkapi kolom Storyboard dengan transisi kamera dan efek audio." },
    ],
  },
  tutor: {
    identity: {
      expertise: "First-principles teacher breaking dense concepts into intuitive mental models.",
      communicationStyle: "Akrab, sabar, dan komunikatif kayak mentor/kakak tingkat yang asik ('kita/lo'). Selalu mulai dari analogi fisik sehari-hari baru naik ke istilah teknis tanpa menggurui.",
    },
    capability: {
      tools: ["web_search", "search_images", "sync_workspace_board"],
      primaryAffordances: ["prose", "steps", "callout", "interactive_choices", "table"],
    },
    presentation: {
      editorialMode: "balanced",
      density: "balanced",
      complimentaryNotes: "Use handwritten margin notes for intuitive analogies; only show quick checks when reinforcing.",
      artworkFamily: "learning",
      complimentaryTag: "MENTAL MODEL",
    },
    exploreHeadline: "Konsep apa yang mau dipahami dari nol?",
    exploreSubline: "Bedah mekanisme dasarnya dulu, uji pemahaman singkat bila perlu, lalu simpan ke Study Deck.",
    exploreSuggestions: [
      { kicker: "Frontend", label: "Cara kerja React reconciliation", prompt: "Jelaskan React reconciliation dan diffing dari prinsip dasar secara intuitif." },
      { kicker: "Jaringan", label: "SSE vs WebSocket dari nol", prompt: "Bandingkan kapan memakai SSE vs WebSocket untuk streaming AI." },
      { kicker: "Database", label: "Kenapa B-Tree mempercepat query", prompt: "Jelaskan indeks B-Tree dengan analogi fisik sebelum masuk ke detail teknis." },
      { kicker: "AI", label: "Perbedaan Tool Call vs Prompt JSON", prompt: "Bahas arsitektur function calling vs teks terstruktur dalam stream LLM." },
    ],
    chatHeroCue: "bangun intuisi dulu baru istilah ~",
    chatHeroSuggestions: [
      { tag: "01", label: "React diffing pakai analogi", prompt: "Jelaskan React reconciliation dan diffing dari prinsip dasar secara intuitif." },
      { tag: "02", label: "SSE vs WebSocket untuk AI", prompt: "Bandingkan kapan memakai SSE vs WebSocket untuk streaming AI." },
      { tag: "03", label: "Cara kerja indeks B-Tree", prompt: "Jelaskan indeks B-Tree dengan analogi fisik sebelum masuk ke detail teknis." },
    ],
    boardLabel: "Study Deck",
    boardDefaultColumns: [
      { id: "col-core", title: "Konsep Inti", subtitle: "Pondasi" },
      { id: "col-drill", title: "Latihan", subtitle: "Uji paham" },
      { id: "col-master", title: "Dikuasai", subtitle: "Siap pakai" },
    ],
    boardReshapeChips: [
      { label: "Buat kuis cepat", prompt: "Beri 1 latihan pilihan interaktif dari topik yang ada di Study Deck." },
      { label: "Ringkas cheat-sheet", prompt: "Padatkan poin di Study Deck jadi rangkuman 1 layar." },
    ],
  },
  coach: {
    identity: {
      expertise: "Training & habit coach building sustainable routines, progressive overload, and recovery balance.",
      communicationStyle: "Suportif, asik, dan membumi kayak partner latihan ('kita/lo'). Semangat tapi anti-burnout, fokus ke konsistensi kecil dan form yang bener.",
    },
    capability: {
      tools: ["web_search", "search_images", "sync_workspace_board"],
      primaryAffordances: ["ring", "checklist", "bars", "steps", "calculator"],
    },
    presentation: {
      editorialMode: "balanced",
      density: "balanced",
      complimentaryNotes: "Combine streak ring visual feedback with crisp rest-day and form cues.",
      artworkFamily: "learning",
      complimentaryTag: "STREAK & FORM",
    },
    exploreHeadline: "Latihan atau kebiasaan apa yang mau dibangun?",
    exploreSubline: "Atur beban yang aman, jaga konsistensi harian, dan pantau progresnya di Habit Board.",
    exploreSuggestions: [
      { kicker: "Latihan", label: "Workout 20 menit tanpa alat", prompt: "Susun rutinitas latihan 20 menit di rumah untuk seluruh tubuh." },
      { kicker: "Kebiasaan", label: "Rantai habit pagi anti-bolong", prompt: "Rancang sistem habit pagi 3 langkah yang ringan buat hari sibuk." },
      { kicker: "Pemulihan", label: "Atur jadwal tidur & mobilitas", prompt: "Evaluasi pola tidur dan peregangan setelah kerja duduk seharian." },
      { kicker: "Lari", label: "Target 5K bertahap dalam 6 minggu", prompt: "Buat jadwal lari progresif aman dari pemula menuju 5K." },
    ],
    chatHeroCue: "konsisten lebih menang dari keras ~",
    chatHeroSuggestions: [
      { tag: "20m", label: "Workout tanpa alat", prompt: "Susun rutinitas latihan 20 menit di rumah untuk seluruh tubuh." },
      { tag: "Habit", label: "Rutinitas pagi antimalas", prompt: "Rancang sistem habit pagi 3 langkah yang ringan buat hari sibuk." },
      { tag: "5K", label: "Rencana lari 6 minggu", prompt: "Buat jadwal lari progresif aman dari pemula menuju 5K." },
    ],
    boardLabel: "Habit Board",
    boardDefaultColumns: [
      { id: "col-warm", title: "Pemanasan / Pagi", subtitle: "Pemicu ringan" },
      { id: "col-main", title: "Rutinitas Inti", subtitle: "Konsisten harian" },
      { id: "col-rec", title: "Recovery", subtitle: "Istirahat & evaluasi" },
    ],
    boardReshapeChips: [
      { label: "Ringankan versi hari sibuk", prompt: "Buat versi 10 menit untuk tiap kebiasaan di Habit Board." },
      { label: "Tambahkan metrik streak", prompt: "Sertakan target mingguan terukur pada tiap kartu Habit Board." },
    ],
  },
  music: {
    identity: {
      expertise: "Sound curator & sonic companion crafting focus atmospheres, BPM flow, and listening textures.",
      communicationStyle: "Casual, ekspresif, dan berjiwa skena musik/gigs ('gue/lo'). Paham luar-dalam soal energi konser, lore album, aransemen panggung, tekstur audio, sampai cerita di balik lagu.",
    },
    capability: {
      tools: ["web_search", "search_images", "sync_workspace_board"],
      primaryAffordances: ["editorial_cards", "tabs", "interactive_choices", "actions"],
    },
    presentation: {
      editorialMode: "editorial",
      density: "spacious",
      complimentaryNotes: "Highlight BPM ranges, instrumentation texture, and smooth mood transitions.",
      artworkFamily: "creative",
      complimentaryTag: "BPM & TEXTURE",
    },
    exploreHeadline: "Suasana atau ritme audio apa yang dibutuhin?",
    exploreSubline: "Pilih mood kerja, atur progresi tempo, dan susun daftar putar sesi di Session Queue.",
    exploreSuggestions: [
      { kicker: "Deep Work", label: "Soundscape instrumental 90 BPM", prompt: "Rancang komposisi atmosfer musik tanpa lirik untuk sesi coding panjang." },
      { kicker: "Malam", label: "Ambient hangat buat unwind", prompt: "Buat progresi trek lo-fi dan jazz ambient untuk rileks malam hari." },
      { kicker: "Produksi", label: "Bedah struktur progresi lo-fi chord", prompt: "Jelaskan progresi chord 7th dan tekstur vinyl hangat gaya lo-fi." },
      { kicker: "Energi", label: "Playlist warmup ritme bertahap", prompt: "Susun transisi lagu dari 100 BPM naik perlahan ke 128 BPM." },
    ],
    chatHeroCue: "set mood dulu sebelum mulai ~",
    chatHeroSuggestions: [
      { tag: "90BPM", label: "Soundscape deep work", prompt: "Rancang komposisi atmosfer musik tanpa lirik untuk sesi coding panjang." },
      { tag: "Chill", label: "Ambient hangat malam hari", prompt: "Buat progresi trek lo-fi dan jazz ambient untuk rileks malam hari." },
      { tag: "Chord", label: "Harmoni lo-fi & tekstur", prompt: "Jelaskan progresi chord 7th dan tekstur vinyl hangat gaya lo-fi." },
    ],
    boardLabel: "Session Queue",
    boardDefaultColumns: [
      { id: "col-warm", title: "Warmup", subtitle: "Masuk fokus" },
      { id: "col-deep", title: "Deep Work", subtitle: "Tempo stabil" },
      { id: "col-cool", title: "Cooldown", subtitle: "Lepas lelah" },
    ],
    boardReshapeChips: [
      { label: "Ubah ke mode malam tenang", prompt: "Ganti energi Session Queue ke tempo lambat & instrumen lembut." },
      { label: "Perhalus transisi antar fase", prompt: "Tambahkan catatan bridging tempo antara Warmup dan Deep Work." },
    ],
  },
  garden: {
    identity: {
      expertise: "Botanist & urban grower advising on light exposure, watering cadence, soil aeration, and leaf health.",
      communicationStyle: "Kalem, hangat, dan observatif kayak temen ngobrol di teras kebun ('kita/lo'). Jeli baca sinyal daun, media tanam, dan sirkulasi cahaya dengan bahasa santai.",
    },
    capability: {
      tools: ["web_search", "search_images", "sync_workspace_board"],
      primaryAffordances: ["checklist", "editorial_cards", "callout", "steps"],
    },
    presentation: {
      editorialMode: "editorial",
      density: "spacious",
      complimentaryNotes: "Use botanical handwritten care notes, circled watering intervals, and soil/sun cues.",
      artworkFamily: "botany",
      complimentaryTag: "SOIL & LUX",
    },
    exploreHeadline: "Tanaman atau kebun apa yang lagi dirawat?",
    exploreSubline: "Cek gejala daun, takar jadwal siram dan cahaya matahari, lalu pantau rutinitas di Care Board.",
    exploreSuggestions: [
      { kicker: "Diagnosis", label: "Kenapa pucuk daun menguning", prompt: "Bantu bedakan gejala daun kuning akibat kelebihan air vs kurang nutrisi." },
      { kicker: "Media", label: "Racik tanah poros untuk pot indoor", prompt: "Resep campuran media tanam ringan anti busuk akar untuk monstera & philodendron." },
      { kicker: "Cahaya", label: "Pilih tanaman tahan minim matahari", prompt: "Rekomendasi 5 tanaman hias kuat untuk sudut ruang kerja redup." },
      { kicker: "Herba", label: "Mulai pot basil & mint di balkon", prompt: "Panduan pemangkasan & siram harian supaya basil tumbuh rimbun." },
    ],
    chatHeroCue: "cek kelembapan tanah & cahaya ~",
    chatHeroSuggestions: [
      { tag: "Daun", label: "Daun menguning kenapa?", prompt: "Bantu bedakan gejala daun kuning akibat kelebihan air vs kurang nutrisi." },
      { tag: "Pot", label: "Media tanam anti busuk akar", prompt: "Resep campuran media tanam ringan anti busuk akar untuk monstera & philodendron." },
      { tag: "Indoor", label: "Tanaman ruang minim cahaya", prompt: "Rekomendasi 5 tanaman hias kuat untuk sudut ruang kerja redup." },
    ],
    boardLabel: "Care Board",
    boardDefaultColumns: [
      { id: "col-daily", title: "Cek Harian", subtitle: "Tanah & cahaya" },
      { id: "col-week", title: "Siram & Pupuk", subtitle: "Jadwal mingguan" },
      { id: "col-repot", title: "Repot & Prune", subtitle: "Perawatan berkala" },
    ],
    boardReshapeChips: [
      { label: "Sesuaikan jadwal musim hujan", prompt: "Kurangi frekuensi siram pada Care Board karena kelembapan tinggi." },
      { label: "Pisahkan tanaman butuh cahaya penuh", prompt: "Kelompokkan kartu Care Board berdasarkan kebutuhan intensitas sinar matahari." },
    ],
  },
};

function createFallbackRoleConfig(lookId: string): RoleWorkspaceConfig {
  const label = LOOK_NAMES[lookId] || "Momo";
  const job = LOOK_JOBS[lookId] || "Asisten adaptif";
  return {
    lookId,
    label,
    identity: {
      expertise: `${label} (${job}) providing focused domain reasoning.`,
      communicationStyle: "Concise, grounded, tailored to the user's immediate objective.",
    },
    capability: {
      tools: ["web_search", "search_images", "sync_workspace_board"],
      primaryAffordances: ["prose", "editorial_cards", "steps", "checklist", "table", "actions"],
    },
    presentation: {
      editorialMode: "balanced",
      density: "balanced",
      complimentaryNotes: "Match UI representation to information complexity; skip cards for trivial questions.",
      artworkFamily: "general",
      complimentaryTag: label.toUpperCase(),
    },
    exploreHeadline: `${label}: ${job}`,
    exploreSubline: "Ketik pertanyaan atau pilih pemantik di bawah untuk melihat kanvas horizontal dan board kerja.",
    exploreSuggestions: [
      { kicker: label, label: `Mulai sesi ${job.toLowerCase()}`, prompt: `Bantu saya merencanakan alur kerja ${job.toLowerCase()} langkah demi langkah.` },
      { kicker: "Bandingkan", label: "Evaluasi opsi utama", prompt: `Bandingkan pendekatan terbaik untuk tugas ${job.toLowerCase()}.` },
      { kicker: "Checklist", label: "Buat daftar cek eksekusi", prompt: `Susun checklist praktis terkait ${job.toLowerCase()}.` },
      { kicker: "Eksplorasi", label: "Rekomendasi terstruktur", prompt: `Tunjukkan 3 skenario praktis sesuai peran ${label}.` },
    ],
    chatHeroCue: `mulai obrolan bareng ${label.toLowerCase()} ~`,
    chatHeroSuggestions: [
      { tag: "01", label: `Alur kerja ${job.toLowerCase()}`, prompt: `Bantu saya merencanakan alur kerja ${job.toLowerCase()} langkah demi langkah.` },
      { tag: "02", label: "Bandingkan pendekatan", prompt: `Bandingkan pendekatan terbaik untuk tugas ${job.toLowerCase()}.` },
      { tag: "03", label: "Susun checklist cepat", prompt: `Susun checklist praktis terkait ${job.toLowerCase()}.` },
    ],
    boardLabel: "Build Canvas",
    boardDefaultColumns: [
      { id: "col-1", title: "Tahap 1", subtitle: "Inisiasi" },
      { id: "col-2", title: "Tahap 2", subtitle: "Proses inti" },
      { id: "col-3", title: "Tahap 3", subtitle: "Siap / Selesai" },
    ],
    boardReshapeChips: [
      { label: "Atur ulang urutan", prompt: `Tata ulang item board agar lebih logis untuk peran ${label}.` },
      { label: "Ringkas langkah prioritas", prompt: "Saring hanya 3 langkah berdampak tertinggi dari board saat ini." },
    ],
  };
}

export interface RoleLensProfile {
  lens: string;
  laneHints: Record<string, string>;
}

const ROLE_LENS_AND_LANES: Record<string, RoleLensProfile> = {
  rest: {
    lens: "Generalist intelligence: inspect query intent carefully and pick the sharpest OpenUI mix automatically — Diagram (Mermaid) for systems/processes, Versus + Table for comparisons, Chart for metrics, Adjuster for tunable scenarios, Cards (with auto web photos) + Map for tangible places/items.",
    laneHints: { Plan: "Aksi Lanjut", Checklist: "Aksi Lanjut", Steps: "Evaluasi", Versus: "Evaluasi" },
  },
  traveller: {
    lens: "Traveler lens: automatically show destinations and eats as visual Cards (grid/feature with verified web photos via imageQuery), schedules as interactive Plan, multi-stop routes on Map (auto-pinpoint), budget/travelers calculator as Adjuster, area/season trade-offs as Versus.",
    laneHints: { Cards: "Day 1", Versus: "Day 1", Map: "Day 1", Checklist: "Day 3", Stats: "Day 2" },
  },
  designer: {
    lens: "Designer lens: colours as interactive Palette swatches, visual references & spaces as Cards (with real web photo imageQuery), UI/UX critiques as Checklist, A/B trade-offs as Versus, user/design flows as Diagram (Mermaid), type scales and tokens as Table or Code.",
    laneHints: { Cards: "Referensi", Palette: "Token & Type", Table: "Token & Type", Code: "Final Polish", Checklist: "Final Polish", Versus: "Final Polish" },
  },
  money: {
    lens: "Finance lens: interactive ROI/budget/runway calculator as Adjuster, allocation splits as Chart (donut), multi-year projections as Chart (line), headline KPIs as Stats, itemized breakdowns as Table, financial trade-offs as Versus.",
    laneHints: { Stats: "Wajib & Tetap", Table: "Wajib & Tetap", Chart: "Cadangan & Invest", Versus: "Cadangan & Invest", Checklist: "Fleksibel", Steps: "Fleksibel" },
  },
  bug: {
    lens: "Bug Hunter lens: root diagnosis as Callout, call/state trace as Diagram (Mermaid sequence/flowchart), ranked suspects in Cards (list, tag = severity), repro steps as Steps, patches/diffs as Code, regression verification as Checklist, latency/error timings as Chart or Stats.",
    laneHints: { Cards: "Root Cause", Callout: "Root Cause", Flow: "Root Cause", Code: "Fix & Verify", Checklist: "Fix & Verify", Steps: "Repro" },
  },
  investigate: {
    lens: "Investigator lens: trace system causality and data lineage with Diagram (Mermaid) + Flow, weigh competing hypotheses in Table or Versus, gather leads in Cards (list), highlight confirmed findings in Callout.",
    laneHints: { Cards: "Hipotesis", Callout: "Fakta", Flow: "Fakta", Steps: "Langkah Verifikasi" },
  },
  captain: {
    lens: "Release Captain lens: deployment topology and CI/CD pipelines as Diagram (Mermaid flowchart/gantt), release gate as Checklist, risk vs speed trade-offs as Versus + Table, rollout phases as Plan, commands/configs as Code.",
    laneHints: { Flow: "Tahap 1", Checklist: "Tahap 3", Code: "Tahap 2", Plan: "Tahap 2" },
  },
  builder: {
    lens: "Builder lens: system architecture, DB ERDs, and auth/API sequences as Diagram (Mermaid erDiagram/sequenceDiagram/flowchart), stack trade-offs as Versus + Table, benchmarks as Chart + Stats, milestones as Plan/Steps, runnable snippets as Code, capacity sizing as Adjuster.",
    laneHints: { Flow: "Arsitektur", Code: "Implementasi", Steps: "Implementasi", Checklist: "Verifikasi", Versus: "Arsitektur" },
  },
  tester: {
    lens: "QA Analyst lens: test coverage & bug metrics as Chart + Stats, test matrix as Table, state transitions as Diagram (Mermaid stateDiagram-v2), verification suites as Checklist, repro flows as Steps.",
    laneHints: { Table: "Tahap 1", Checklist: "Tahap 3", Code: "Tahap 2" },
  },
  guard: {
    lens: "Security Guard lens: threat models & attack paths as Diagram (Mermaid), severity alerts in Callout (warning), vulnerability rankings in Cards + Table, mitigation plan in Checklist, hardened configs in Code.",
    laneHints: { Callout: "Tahap 1", Cards: "Tahap 1", Code: "Tahap 2", Checklist: "Tahap 3" },
  },
  planner: {
    lens: "Strategist lens: roadmap timelines as Diagram (Mermaid gantt/timeline) or Plan, KPIs as Stats + Chart, resource allocation as Adjuster, strategic trade-offs as Versus + Table, execution milestones as Steps.",
    laneHints: { Plan: "Minggu 1", Steps: "Minggu 2", Checklist: "Checklist", Stats: "Target" },
  },
  cook: {
    lens: "Chef lens: dishes/ingredients as Cards (feature/grid with verified food photography imageQuery), scaling servings/ingredients interactively with Adjuster, cooking sequence as Steps (timeline/numbered), prep checklist as Checklist, macros/timing as Stats or Chart.",
    laneHints: { Cards: "Belanja", Checklist: "Prep", Steps: "Masak", Callout: "Sajikan" },
  },
  write: {
    lens: "Writer/Editor lens: narrative prose first, structural beats and story arcs as Diagram (Mermaid) or Steps, tone/style comparisons as Versus, concise pull-quotes as Callout.",
    laneHints: { Steps: "Outline", Cards: "Riset", Callout: "Draft", Checklist: "Polish" },
  },
  director: {
    lens: "Creative Director lens: visual storyboard scenes as Cards (grid/row with real web photography imageQuery), colour script as Palette, production timeline as Diagram (gantt) or Plan, pacing arc as Flow.",
    laneHints: { Cards: "Referensi", Palette: "Visual", Plan: "Produksi", Steps: "Produksi" },
  },
  tutor: {
    lens: "Tutor lens: build intuition first, show mental models/concept maps with Diagram (Mermaid mindmap/flowchart) + Flow, worked examples in Code or Table, trends in Chart, and test mastery with Quiz.",
    laneHints: { Flow: "Intuisi", Cards: "Konsep", Code: "Contoh", Checklist: "Latihan", Steps: "Latihan" },
  },
  coach: {
    lens: "Habit Coach lens: weekly schedule as Plan, interactive goal pacing calculator as Adjuster, daily checkable habits as Checklist, progress curves as Chart (line) or Stats, mindset anchor as Callout.",
    laneHints: { Plan: "Minggu Ini", Checklist: "Kebiasaan Harian", Stats: "Progres" },
  },
  music: {
    lens: "Music Focus Companion lens: moodboards/albums as Cards (grid/row with real visual art/cover imageQuery) + Palette, listening session blocks as Plan, focus checklist as Checklist.",
    laneHints: { Cards: "Sesi", Checklist: "Fokus", Plan: "Ritme" },
  },
  garden: {
    lens: "Botanist lens: plant profiles as Cards (grid with real botanical photography imageQuery), care schedules as Plan, diagnostic alerts as Callout (warning/tip), seasonal tasks as Checklist.",
    laneHints: { Cards: "Cek Harian", Plan: "Siram & Pupuk", Checklist: "Repot & Prune", Callout: "Cek Harian" },
  },
};

export function getRoleLens(lookId: string): RoleLensProfile {
  return ROLE_LENS_AND_LANES[lookId] || ROLE_LENS_AND_LANES.rest;
}

export function getRoleWorkspaceConfig(lookId: string): RoleWorkspaceConfig {
  const key = lookId || "rest";
  const label = LOOK_NAMES[key] || (key === "rest" ? "Momo" : key);
  const override = ROLE_OVERRIDES[key];
  if (!override) return createFallbackRoleConfig(key);
  return {
    lookId: key,
    label,
    ...override,
  };
}

export function extractSessionBoardState(
  session: ChatSession | null,
  lookId: string
): { columns: WorkspaceBoardColumn[]; items: WorkspaceBoardItem[] } {
  const cfg = getRoleWorkspaceConfig(lookId);
  const pinnedList = session?.pinnedItems ?? [];
  const hasLiveBoard = Boolean(
    session?.boardColumns && session.boardColumns.length > 0,
  );
  const effectiveColumns = hasLiveBoard
    ? session!.boardColumns!
    : session?.boardsByLook?.[lookId]?.columns;
  const effectiveItems = hasLiveBoard
    ? (session!.boardItems ?? [])
    : (session?.boardsByLook?.[lookId]?.items ?? []);
  if (effectiveColumns && effectiveColumns.length > 0) {
    const pinnedByTitle = new Map(
      pinnedList.map((p) => [p.title.trim().toLowerCase(), p])
    );
    const enrichedBoard = effectiveItems.map((it) => {
      const pMatch = pinnedByTitle.get(it.title.trim().toLowerCase());
      return pMatch
        ? { ...it, pin: "heart" as const, sticker: "heart" as const }
        : it;
    });
    const existingKeys = new Set(
      enrichedBoard.map((it) => it.title.trim().toLowerCase())
    );
    const mergedPinned = pinnedList.filter(
      (p) => !existingKeys.has(p.title.trim().toLowerCase())
    );
    return {
      columns: effectiveColumns,
      items: [...mergedPinned, ...enrichedBoard],
    };
  }

  const columns: WorkspaceBoardColumn[] = [...cfg.boardDefaultColumns];
  const boardPreviewItems: WorkspaceBoardItem[] = [];
  const editorialItems: WorkspaceBoardItem[] = [];
  const secondaryItems: WorkspaceBoardItem[] = [];
  const colIds = () => columns.map((c) => c.id);

  if (!session) {
    return { columns, items: [] };
  }

  const collectFromSpec = (blkId: string, spec: NonNullable<import("@/types/momo").GenUiBlockItem["spec"]>) => {
    if (spec.type === "tabs") {
      (spec.tabs || []).forEach((tab, tIdx) => {
        (tab.blocks || []).forEach((child, cIdx) => {
          collectFromSpec(`${blkId}-t${tIdx}-${cIdx}`, child);
        });
      });
      return;
    }

    if (spec.type === "board_preview" && spec.columns?.length) {
      columns.length = 0;
      boardPreviewItems.length = 0;
      spec.columns.forEach((col, cIdx) => {
        const cId = col.id || `col-${cIdx + 1}`;
        columns.push({ id: cId, title: col.title, subtitle: col.subtitle });
        (col.items || []).forEach((it, iIdx) => {
          const title = (it.title || "").trim();
          if (!title) return;
          boardPreviewItems.push({
            id: `${blkId}-${cId}-${iIdx}`,
            columnId: cId,
            slot: it.slot,
            title,
            handNote: it.note,
            metric: it.metric,
            pin: it.pin,
          });
        });
      });
    } else if (spec.type === "editorial_cards") {
      const targetCol = colIds()[editorialItems.length % columns.length] || columns[0].id;
      (Array.isArray(spec.items) ? spec.items : []).forEach((it, iIdx) => {
        const title = (it.title || "").trim();
        if (!title) return;
        const colId = colIds()[iIdx % columns.length] || targetCol;
        editorialItems.push({
          id: `${blkId}-ed-${iIdx}`,
          columnId: colId,
          slot: it.slot,
          title,
          subtitle: it.body,
          handNote: it.handNote,
          metric: it.metric,
          pin: it.pin,
          sticker: it.pin === "heart" || it.pin === "star" ? it.pin : undefined,
          imageUrl: it.imageUrl,
          imageQuery: it.imageQuery,
          tone: it.tone,
        });
      });
    } else if (spec.type === "steps") {
      (Array.isArray(spec.items) ? spec.items : []).forEach((it, iIdx) => {
        const title = (it.title || "").trim();
        if (!title) return;
        const colId =
          colIds()[
            Math.min(
              columns.length - 1,
              Math.floor((iIdx / Math.max(1, spec.items?.length ?? 0)) * columns.length)
            )
          ];
        secondaryItems.push({
          id: `${blkId}-st-${iIdx}`,
          columnId: colId,
          slot: it.meta || `Langkah ${iIdx + 1}`,
          title,
          handNote: it.note,
        });
      });
    } else if (spec.type === "cards") {
      (Array.isArray(spec.items) ? spec.items : []).forEach((it, iIdx) => {
        const title = (it.title || "").trim();
        if (!title) return;
        const colId = colIds()[iIdx % columns.length];
        secondaryItems.push({
          id: `${blkId}-cd-${iIdx}`,
          columnId: colId,
          slot: it.kicker,
          title,
          subtitle: it.body,
          metric: it.badge || it.meta,
          imageUrl: it.imageUrl,
          imageQuery: it.imageQuery,
          pin: it.lit ? "star" : undefined,
          sticker: it.lit ? "star" : undefined,
        });
      });
    }
  };

  const allMessages = [...session.messages, ...(session.exploreMessages || [])];
  for (const msg of allMessages) {
    if (msg.role !== "momo" || !msg.parts) continue;
    for (const part of msg.parts) {
      if (part.kind !== "gen_ui") continue;
      for (const blk of part.blocks) {
        if (blk.spec) collectFromSpec(blk.id, blk.spec);
      }
    }
  }

  const prioritized = [
    ...pinnedList,
    ...(boardPreviewItems.length > 0
      ? [...boardPreviewItems, ...editorialItems]
      : editorialItems.length > 0
        ? editorialItems
        : secondaryItems),
  ];

  const seenTitles = new Set<string>();
  const colCounts = new Map<string, number>();
  const deduped: WorkspaceBoardItem[] = [];

  for (const item of prioritized) {
    const key = item.title.trim().toLowerCase();
    if (!key || seenTitles.has(key)) continue;
    const colCount = colCounts.get(item.columnId) ?? 0;
    if (colCount >= 12) continue;
    seenTitles.add(key);
    colCounts.set(item.columnId, colCount + 1);
    deduped.push(item);
  }

  return { columns, items: deduped };
}
