/**
 * Sample props for every Mistline gen-ui component.
 * Keys must match MISTLINE_REGISTRY names exactly.
 * Props match the actual component implementations (not just catalog schema).
 */
export const PLAYGROUND_SAMPLES: Record<string, Record<string, unknown>> = {
  RegionalShowcase: {
    kicker: "Worldbuilding & Variasi Regional",
    title: "Rezim Fiktif 'Draag' — Long Live The Black Parade",
    subtitle: "Evolusi narasi panggung dan adaptasi lokal tiap benua (2025–2026)",
    lore: "MCR membangun negara otoriter fiktif bernama Draag di bawah Grand Immortal Dictator. Band tampil sebagai grup nasional dalam masa 'work release' dari The MOAT dengan plot teater yang berubah antar leg.",
    regions: [
      {
        name: "Amerika Utara (2025)",
        badge: "Timeline Original",
        title: "The Execution — Era Beton",
        summary: "Penonton diajak memilih kandidat eksekusi di panggung. Narasi penuh penindasan oleh The Clerk dan berakhir tragis dengan eksekusi Gerard Way.",
        symbolLabel: "Simbol Lokal",
        symbolValue: "Stempel & Poster Keposhka",
        focusLabel: "Fokus Babak II",
        focusValue: "Bullets & Deep Cuts",
      },
      {
        name: "Amerika Latin (2026)",
        badge: "Prequel Twist",
        title: "The Rebellion — Awal Kediktatoran",
        summary: "Plot twist terungkap sebagai prequel dari tur 2025: Gerard Way membalas dendam dan melawan The Clerk di panggung.",
        symbolLabel: "Simbol Lokal",
        symbolValue: "Brosur Propaganda Rezim",
        focusLabel: "Fokus Babak II",
        focusValue: "Three Cheers & Anthems",
      },
      {
        name: "Asia Tenggara (Jakarta)",
        badge: "22 Nov 2026 • Finale",
        title: "The Jakarta Resolution",
        summary: "Menjadi kota penutup seluruh rangkaian tur dunia. Karakter Nurse Sylvia muncul dominan memberi narasi baru menjelang resolusi akhir Draag.",
        symbolLabel: "Simbol Lokal",
        symbolValue: "Merch & Stempel Provinsi Jakarta",
        focusLabel: "Fokus Babak II",
        focusValue: "B-Stage Lepas Seragam",
      },
    ],
  },

  CatalogShelf: {
    title: "Diskografi Studio My Chemical Romance",
    subtitle: "Klik rilisan untuk membuka tracklist lengkap beserta durasi",
    items: [
      {
        title: "The Black Parade",
        year: "2006",
        kind: "Studio Album (LP)",
        summary: "Album konsep rock opera yang mengikuti perjalanan karakter 'The Patient'.",
        tracks: [
          { title: "The End.", duration: "1:52" },
          { title: "Dead!", duration: "3:17" },
          { title: "Welcome to the Black Parade", duration: "5:11", highlight: true, note: "Lead single • 5x Platinum" },
          { title: "I Don't Love You", duration: "3:58" },
          { title: "Famous Last Words", duration: "4:59", highlight: true },
        ],
      },
      {
        title: "Three Cheers for Sweet Revenge",
        year: "2004",
        kind: "Studio Album (LP)",
        summary: "Terobosan komersial dengan nuansa post-hardcore dan punk yang lebih agresif.",
        tracks: [
          { title: "Helena", duration: "3:22", highlight: true, note: "Tribute untuk nenek Gerard & Mikey Way" },
          { title: "Give 'Em Hell, Kid", duration: "2:16" },
          { title: "I'm Not Okay (I Promise)", duration: "3:08", highlight: true },
        ],
      },
    ],
  },

  AnnotatedSheet: {
    title: "Welcome to the Black Parade",
    subtitle: "Bedah bait kunci dan metafora narasi album",
    meta: "My Chemical Romance • 2006",
    sections: [
      {
        label: "Intro · Verse 1",
        tag: "Memori & Simbol",
        text: [
          "When I was a young boy, my father took me into the city",
          "To see a marching band",
        ],
        note: "Gerard Way memakai kenangan masa kecilnya melihat parade marching band sebagai bentuk fisik dari kematian yang menjemput sang pasien dalam wujud memori paling indah.",
      },
      {
        label: "Bridge · Refleksi",
        tag: "Konflik Batin",
        text: [
          "Sometimes I get the feeling she's watching over me",
          "And other times I feel like I should go",
        ],
        note: "Menggambarkan tarik-ulur antara rasa bersalah, keinginan menyerah, dan harapan bahwa seseorang yang sudah tiada masih menjaga dirinya.",
      },
    ],
  },

  Headline: {
    kicker: "Deep Dive",
    title: "The Architecture of Modern AI Chat",
    subtitle: "How streaming UI blocks reshape conversational interfaces",
    align: "left",
    imageQuery: "abstract neural network visualization",
  },

  BentoGrid: {
    title: "Ringkasan Perjalanan & Konser",
    subtitle: "4 micro-widget kontekstual yang dirakit dinamis oleh AI",
    items: [
      {
        slot: "flight_route_arc",
        title: "Garuda GA-884 · Jakarta ke Tokyo",
        meta: "On Schedule",
        from: "CGK",
        to: "HND",
        departTime: "08:15 WIB",
        arriveTime: "17:40 JST",
        duration: "7j 25m · Langsung",
        vehicle: "Boeing 777-300ER",
        gate: "T3 · G6",
        seat: "14A",
        baggage: "2 × 23 kg",
      },
      {
        slot: "train_route_stops",
        title: "KA Argo Wilis · Bandung ke Surabaya",
        meta: "Eksekutif 2",
        rows: [
          { label: "Bandung (BD) · Berangkat", value: "07:40 WIB", badge: "Peron 5" },
          { label: "Yogyakarta (YK) · Berhenti 5m", badge: "13:05 WIB · Peron 3", tone: "accent" },
          { label: "Solo Balapan (SLO) · Berhenti 3m", value: "14:02 WIB" },
          { label: "Surabaya Gubeng (SGU) · Tiba", value: "17:15 WIB", badge: "Peron 1" },
        ],
        footer: "Kursi 6D · Gerbong 2 · Kecepatan 105 km/j",
      },
      {
        slot: "concert_stage_time",
        title: "Synchronize Stage · Jadwal Panggung",
        meta: "Malam Ini",
        rows: [
          { label: "Open Gate & Penukaran Gelang", sub: "Pintu Barat Gambir Expo", value: "16:00–18:00" },
          { label: "Reality Club · Pembuka", sub: "Dynamic Stage · 8 Lagu", value: "19:00–19:45" },
          { label: "★ Hindia · Main Headliner", sub: "Dynamic Stage · 16 Lagu", badge: "20:45–22:15", tone: "accent" },
        ],
        footer: "Titik temu pulang: Halte TransJakarta PRJ",
      },
      {
        slot: "fun_fact_spotlight",
        title: "Fakta Sains · Gurita Punya 3 Jantung",
        meta: "Biologi Laut",
        statValue: "3×",
        statUnit: "Jantung",
        summary: "Dua jantung memompa darah ke insang, sedangkan satu jantung utama memompa ke seluruh tubuh.",
        facts: [
          { label: "Jantung insang", value: "2 buah", sub: "Mendorong darah melewati insang untuk mengikat oksigen" },
          { label: "Jantung sistemik", value: "1 buah", sub: "Berhenti berdetak saat gurita berenang" },
          { label: "Warna darah", value: "Biru", sub: "Hemosianin berbasis tembaga, bukan besi" },
        ],
        footer: "Darah biru berbasis tembaga (hemosianin)",
      },
    ],
  },

  Cards: {
    title: "Rekomendasi Kopi Jakarta",
    layout: "grid",
    items: [
      {
        title: "Kopi Tuku",
        subtitle: "Fatmawati",
        body: "Es kopi susu legendaris yang bikin Tuku jadi ikon kopi susu modern Jakarta.",
        tag: "Favorit",
        meta: "Rp 18K",
        note: "must try!",
        icon: "coffee",
        imageQuery: "indonesian iced coffee latte",
        prompt: "Ceritakan lebih lanjut tentang Kopi Tuku",
      },
      {
        title: "Anomali Coffee",
        subtitle: "Kemang",
        body: "Single origin beans dari seluruh Nusantara. Suasana cozy buat kerja.",
        tag: "Cozy",
        meta: "Rp 45K",
        icon: "coffee",
        imageQuery: "specialty coffee shop interior",
      },
      {
        title: "Filosofi Kopi",
        subtitle: "Blok M",
        body: "Coffee shop ikonik dari film. Manual brew terbaik.",
        tag: "Ikonik",
        meta: "Rp 35K",
        icon: "coffee",
        imageQuery: "manual brew pour over coffee",
      },
      {
        title: "Djournal Coffee",
        subtitle: "SCBD",
        body: "Premium vibes, latte art kelas atas, cocok meeting.",
        tag: "Premium",
        meta: "Rp 55K",
        icon: "coffee",
        imageQuery: "premium latte art coffee",
      },
    ],
  },

  Plan: {
    title: "Weekend Trip Bandung",
    days: [
      {
        label: "Hari 1",
        title: "Eksplorasi Kota",
        items: [
          { time: "08:00", title: "Berangkat dari Jakarta via Tol Cipularang" },
          { time: "11:00", title: "Brunch di Warung Nasi Ibu Imas", note: "nasi timbel legendary" },
          { time: "13:00", title: "Jalan-jalan Braga & Asia Afrika" },
          { time: "17:00", title: "Sunset di Tebing Keraton" },
          { time: "19:30", title: "Dinner Steak di Kartini" },
        ],
      },
      {
        label: "Hari 2",
        title: "Nature Day",
        items: [
          { time: "06:00", title: "Sunrise hike Tangkuban Perahu" },
          { time: "10:00", title: "Berendam air panas Ciater" },
          { time: "13:00", title: "Lunch di Sindang Reret" },
          { time: "15:00", title: "Pulang ke Jakarta", note: "hindari macet!" },
        ],
      },
    ],
  },

  Steps: {
    title: "Setup Next.js Project dari Nol",
    style: "numbered",
    steps: [
      { title: "Install Node.js 20 LTS", detail: "Download dari nodejs.org atau pakai nvm", meta: "~2 menit" },
      { title: "Create project", detail: "npx create-next-app@latest my-app --typescript --tailwind --app", meta: "~1 menit" },
      { title: "Install dependencies", detail: "cd my-app && npm install", meta: "~30 detik" },
      { title: "Run dev server", detail: "npm run dev, buka localhost:3000", meta: "done!" },
      { title: "Deploy ke Vercel", detail: "Push ke GitHub, connect di vercel.com, auto-deploy.", meta: "~3 menit" },
    ],
  },

  Versus: {
    title: "The Architecture of Modern AI Chat",
    variant: "cards",
    a: {
      label: "React",
      tagline: "Library UI paling populer",
      badge: "Market Leader",
      metrics: [
        { label: "Unduhan npm / minggu", value: "23M" },
        { label: "Kurva belajar", value: "Medium" },
        { label: "Ukuran bundle", value: "42KB" },
      ],
      points: [
        "Ekosistem masif, library untuk segalanya",
        "JSX fleksibel, kontrol penuh JavaScript",
        "React Native untuk mobile",
        "Hiring pool terbesar",
      ],
      score: 8,
    },
    b: {
      label: "Vue",
      tagline: "Progressive framework yang approachable",
      badge: "Developer Favorite",
      metrics: [
        { label: "Unduhan npm / minggu", value: "4.5M" },
        { label: "Kurva belajar", value: "Easy" },
        { label: "Ukuran bundle", value: "33KB" },
      ],
      points: [
        "Template syntax lebih mudah dibaca",
        "Composition API mirip hooks tapi lebih rapi",
        "Nuxt.js solid untuk SSR",
        "Dokumentasi terbaik",
      ],
      score: 7,
    },
    verdict: "React menang di ekosistem dan job market, tapi Vue lebih gampang di-pickup dan DX-nya lebih clean. Kalau tim lo udah familiar React, stay. Kalau greenfield solo project, Vue worth banget.",
  },

  Stats: {
    title: "Performance Metrics",
    items: [
      { label: "First Contentful Paint", value: "0.8s", delta: "-0.3s", trend: "up", note: "target <1s" },
      { label: "Largest Contentful Paint", value: "1.2s", delta: "-0.5s", trend: "up" },
      { label: "Total Blocking Time", value: "45ms", delta: "+5ms", trend: "down" },
      { label: "Cumulative Layout Shift", value: "0.02", trend: "flat", note: "excellent" },
    ],
  },

  Chart: {
    title: "Framework Popularity 2024",
    type: "bar",
    unit: "% developers",
    data: [
      { label: "React", value: 65 },
      { label: "Vue", value: 28 },
      { label: "Angular", value: 20 },
      { label: "Svelte", value: 15 },
      { label: "Solid", value: 8 },
    ],
    caption: "Data dari State of JS 2024 survey",
  },

  Palette: {
    title: "Momo Dark Theme",
    colors: [
      { hex: "#0A0A0F", name: "Void", role: "Background" },
      { hex: "#1A1A2E", name: "Deep Space", role: "Surface" },
      { hex: "#16213E", name: "Midnight", role: "Card" },
      { hex: "#0F3460", name: "Ocean", role: "Primary" },
      { hex: "#E94560", name: "Neon Rose", role: "Accent" },
      { hex: "#F5F5F5", name: "Chalk", role: "Text" },
    ],
    note: "Inspired by cyberpunk aesthetics",
  },

  Code: {
    title: "API Route Handler",
    language: "typescript",
    code: `export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of generateResponse(messages)) {
        controller.enqueue(new TextEncoder().encode(chunk));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}`,
    highlight: [5, 6, 7],
    caption: "Streaming response pattern for Next.js App Router",
  },

  Callout: {
    tone: "warning",
    title: "Jangan Hardcode API Keys",
    text: "Selalu pakai environment variables (.env.local) untuk menyimpan API keys. Kalau ke-commit ke Git, rotate key-nya ASAP dan scan history pakai git-secrets atau truffleHog.",
  },

  Flow: {
    title: "The Architecture of Modern AI Chat",
    variant: "cycle",
    nodes: [
      {
        label: "User Input",
        detail: "Chat message + attachments",
        description: "Pesan dan lampiran dikirim dari klien ke server beserta konteks percakapan.",
        kind: "input",
      },
      {
        label: "Validation",
        detail: "Sanitize & rate limit",
        description: "Input dibersihkan dan dibatasi frekuensinya sebelum menyentuh model.",
        kind: "process",
      },
      {
        label: "AI Model",
        detail: "Gemini 2.0 Flash",
        description: "Model menghasilkan jawaban dan spesifikasi UI secara streaming.",
        kind: "tool",
      },
      {
        label: "Stream Parser",
        detail: "Extract UI blocks",
        description: "Parser memotong stream menjadi blok teks dan blok komponen yang valid.",
        kind: "process",
      },
      {
        label: "Renderer",
        detail: "Mistline components",
        description: "Blok komponen dirender dengan registry; data dirujuk lewat store.",
        kind: "output",
      },
    ],
    caption: "Alur request end-to-end di Momo",
  },

  Map: {
    title: "Coffee Shops Jakarta Selatan",
    subtitle: "Top picks dalam radius 5km",
    connectRoute: true,
    pins: [
      { name: "Kopi Tuku Fatmawati", lat: -6.2927, lng: 106.7972, area: "Cipete Selatan", category: "coffee", rating: "4.8", price: "Rp25rb", time: "08:00 - 21:00", note: "OG es kopi susu tetangga dengan antrean paling cepat di pagi hari." },
      { name: "Anomali Coffee Kemang", lat: -6.2615, lng: 106.8133, area: "Kemang Raya", category: "roastery", rating: "4.6", price: "Rp45rb", time: "07:00 - 22:00", note: "Single origin Nusantara lengkap dengan meja kerja yang nyaman." },
      { name: "Filosofi Kopi Melawai", lat: -6.2444, lng: 106.7985, area: "Blok M · Melawai", category: "manual brew", rating: "4.7", price: "Rp38rb", time: "10:00 - 23:00", note: "Manual brew V60 & Tiwus dengan vibe sore paling ikonik." },
      { name: "Djournal SCBD", lat: -6.2272, lng: 106.8074, area: "Lot 11 SCBD", category: "meeting spot", rating: "4.6", price: "Rp55rb", time: "07:30 - 22:00", note: "Spot premium dekat MRT Istora buat meeting cepat." },
    ],
  },

  Adjuster: {
    title: "Trip Budget Calculator",
    description: "Adjust parameters to estimate your trip cost",
    controls: [
      { key: "days", label: "Jumlah Hari", kind: "stepper", value: 3, min: 1, max: 14, step: 1, unit: "hari" },
      { key: "hotel", label: "Budget Hotel/malam", kind: "range", value: 500000, min: 200000, max: 2000000, step: 50000, unit: "Rp" },
      { key: "meals", label: "Budget Makan/hari", kind: "range", value: 150000, min: 50000, max: 500000, step: 25000, unit: "Rp" },
      { key: "transport", label: "Include Transport", kind: "toggle", value: true },
    ],
    outputs: [
      { label: "Total Hotel", formula: "days * hotel", prefix: "Rp" },
      { label: "Total Makan", formula: "days * meals", prefix: "Rp" },
      { label: "Estimasi Total", formula: "days * hotel + days * meals", prefix: "Rp" },
    ],
    submitLabel: "Hitung ulang dengan Momo",
  },

  Diagram: {
    title: "Database ER Diagram",
    kind: "erd",
    nodes: [
      { id: "USER", label: "USER", type: "database", detail: "id PK, name, email, created_at", status: "active" },
      { id: "MESSAGE", label: "MESSAGE", type: "database", detail: "id PK, user_id FK, content, role", status: "active" },
      { id: "UI_BLOCK", label: "UI_BLOCK", type: "database", detail: "id PK, message_id FK, component, props", status: "success" },
    ],
    edges: [
      { id: "e1", source: "USER", target: "MESSAGE", label: "1:N sends" },
      { id: "e2", source: "MESSAGE", target: "UI_BLOCK", label: "1:N contains", animated: true },
    ],
    code: `erDiagram
    USER ||--o{ MESSAGE : sends
    USER {
        string id PK
        string name
        string email
        datetime created_at
    }
    MESSAGE ||--|{ UI_BLOCK : contains
    MESSAGE {
        string id PK
        string user_id FK
        string content
        string role
        datetime timestamp
    }
    UI_BLOCK {
        string id PK
        string message_id FK
        string component
        json props
    }`,
    caption: "Interactive XYFlow graph with Mermaid SVG toggle",
  },

  /* Choices uses `options` array of {label, detail?, icon?} and `question` */
  Choices: {
    question: "Mau lanjut ke mana?",
    options: [
      { label: "Lihat menu lengkap", detail: "Semua pilihan tersedia" },
      { label: "Cek review terbaru", detail: "Rating dan komentar" },
      { label: "Booking sekarang", detail: "Untuk 2 orang malam ini" },
    ],
  },

  /* Quiz uses `options` as string[], `answer` as index number, `explain` for explanation */
  Quiz: {
    question: "Apa output dari `typeof null` di JavaScript?",
    options: [
      '"null"',
      '"object"',
      '"undefined"',
      '"boolean"',
    ],
    answer: 1,
    explain: "Ini bug legendaris JavaScript sejak versi pertama tahun 1995. typeof null mengembalikan 'object' karena internal type tag untuk null kebetulan sama dengan object (0x00). TC39 pernah coba fix ini di ES6 tapi revert karena bakal break terlalu banyak website.",
  },

  /* Checklist uses items: [{text, done?, note?}] */
  Checklist: {
    title: "Pre-deploy Checklist",
    items: [
      { text: "Run full test suite", done: true },
      { text: "Check environment variables di production", done: true },
      { text: "Review bundle size (target < 200KB)", done: false },
      { text: "Test di mobile viewport", done: false },
      { text: "Setup error monitoring (Sentry)", done: false, note: "penting!" },
      { text: "Configure CDN caching headers", done: false },
    ],
  },

  Table: {
    title: "API Pricing Comparison",
    columns: ["Provider", "Model", "Input \$/1M tok", "Output \$/1M tok", "Context Window"],
    rows: [
      ["Google", "Gemini 2.0 Flash", "\$0.10", "\$0.40", "1M"],
      ["OpenAI", "GPT-4o", "\$2.50", "\$10.00", "128K"],
      ["Anthropic", "Claude 3.5 Sonnet", "\$3.00", "\$15.00", "200K"],
      ["Mistral", "Mistral Large", "\$2.00", "\$6.00", "128K"],
      ["Meta", "Llama 3.1 405B", "\$0.00", "\$0.00", "128K"],
    ],
    caption: "Harga per November 2024. Llama gratis kalau self-host (tapi infra cost tetap ada).",
  },

  /* Followups uses items as plain string array */
  Followups: {
    items: [
      "Bandingkan performa real-world",
      "Buatkan template project starter",
      "Apa best practices yang harus gue tahu?",
    ],
  },

  AsyncImage: {
    query: "tokyo skyline night neon cyberpunk",
    title: "Shinjuku Skyline & Neon Corridor",
    caption: "Distrik Shinjuku malam hari dilihat dari dek observasi barat, memadukan arsitektur vertikal modern dan jalur komuter metropolitan.",
    alt: "Tokyo skyline at night with neon lights",
    ratio: "16/9",
  },

  Image: {
    query: "bali rice terrace aerial drone green",
    title: "Terasering Subak Tegallalang",
    tag: "arkeologi lanskap",
    caption: "Pola irigasi bertingkat Subak yang mengikuti kontur lembah vulkanik Ubud.",
    alt: "Aerial view of Bali rice terraces",
    ratio: "16/9",
  },

  ImageWithCaption: {
    query: "jakarta skyline sunset golden hour",
    title: "Jakarta Skyline",
    caption: "Pemandangan Jakarta dari Monas saat golden hour. Kontras antara gedung pencakar langit modern dan area hijau kota terlihat jelas dari ketinggian ini.",
    alt: "Jakarta skyline during golden hour",
    ratio: "16/9",
  },

  ImageWithCitation: {
    query: "mount bromo sunrise volcanic landscape",
    caption: "Kawah Gunung Bromo saat sunrise, salah satu pemandangan paling ikonik di Jawa Timur.",
    sourceTitle: "National Geographic Indonesia",
    sourceUrl: "https://nationalgeographic.grid.id/",
    citationIndex: 1,
    ratio: "16/9",
  },

  ImageGallery: {
    title: "Arsitektur Nusantara",
    items: [
      { query: "borobudur temple java aerial", caption: "Candi Borobudur" },
      { query: "prambanan temple sunset silhouette", caption: "Candi Prambanan" },
      { query: "toraja traditional house tongkonan", caption: "Rumah Tongkonan" },
      { query: "minangkabau traditional house rumah gadang", caption: "Rumah Gadang" },
      { query: "balinese temple gate pura", caption: "Pura Bali" },
    ],
  },

  ImageGrid: {
    title: "Material Palette",
    columns: 3,
    items: [
      { query: "concrete texture close up raw", caption: "Raw Concrete" },
      { query: "dark walnut wood grain texture", caption: "Walnut Wood" },
      { query: "brushed brass metal texture", caption: "Brushed Brass" },
      { query: "white marble veined texture", caption: "Carrara Marble" },
      { query: "matte black ceramic tile", caption: "Matte Black" },
      { query: "natural linen fabric texture beige", caption: "Natural Linen" },
    ],
  },

  ImageCarousel: {
    title: "Street Food Jakarta",
    items: [
      { query: "nasi goreng indonesian fried rice street food", caption: "Nasi Goreng" },
      { query: "satay sate ayam indonesian grilled", caption: "Sate Ayam" },
      { query: "martabak manis indonesian sweet pancake", caption: "Martabak Manis" },
      { query: "kerak telor betawi traditional egg", caption: "Kerak Telor" },
      { query: "soto betawi jakarta beef soup", caption: "Soto Betawi" },
    ],
  },

  ImageComparison: {
    title: "Before vs After Edit",
    left: {
      label: "Original",
      query: "moody dark underexposed cityscape rain",
      caption: "Raw shot, underexposed",
    },
    right: {
      label: "Edited",
      query: "vibrant neon city night rain reflection colorful",
      caption: "Color graded, lifted shadows",
    },
    note: "Lightroom preset: Cyberpunk Night v2",
  },

  ImageLightbox: {
    query: "milky way night sky indonesia stargazing",
    caption: "Milky Way dari Gunung Bromo. ISO 3200, f/1.8, 25 detik exposure.",
    alt: "Milky Way galaxy visible over Mount Bromo",
    ratio: "16/9",
  },
};

/** All component names from the registry, in display order */
export const COMPONENT_NAMES = Object.keys(PLAYGROUND_SAMPLES);
