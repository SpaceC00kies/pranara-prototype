/**
 * Jirung Care Center Knowledge Base (Thai-first)
 * Safe, non-technical wording per hospital expectations.
 * Location-accurate (Mae Rim, Chiang Mai) and brand-consistent.
 */

export interface JirungInfo {
  name: string;
  shortName: string;
  description: string;
  programs: {
    flagshipCancerRetreat: {
      title: string;
      duration: string;
      priceHint?: string;  // optional soft hint, avoid hard claims
      summary: string;
    };
    shortRetreat: {
      title: string;
      duration: string;
      priceRange?: string;
      summary: string;
    };
  };
  services: string[];        // general, non-technical
  facilities: string[];
  staff: string[];           // roles, not credentials
  location: {
    address: string;
    district: string;
    province: string;
    mapUrl?: string;
  };
  contact: {
    phone?: string;
    line?: string;
    email?: string;
    website?: string;
  };
  specialties: string[];     // gentle phrasing
  philosophy: string;
  experience: string;        // e.g., "มากกว่า 15 ปี"
  disclaimers: {
    safety: string;
    nonMedical: string;
  };
}

export const JIRUNG_KNOWLEDGE: JirungInfo = {
  name: "จีรัง เวลเนส (Jirung Wellness)",
  shortName: "จีรัง เวลเนส",
  description:
    "สถานที่พักฟื้นและดูแลสุขภาวะเชิงองค์รวม ท่ามกลางธรรมชาติอันเงียบสงบของแม่ริม เชียงใหม่ โฟกัสการฟื้นฟูคุณภาพชีวิตทั้งกาย ใจ และความสงบภายใน ในบรรยากาศเป็นกันเองและปลอดภัย",

  programs: {
    flagshipCancerRetreat: {
      title: "โปรแกรมฟื้นฟูผู้ป่วยมะเร็ง (7 คืน 8 วัน)",
      duration: "7 คืน 8 วัน",
      priceHint: "แพ็กเกจระดับพรีเมียม (สอบถามราคาและห้องพัก)",
      summary:
        "ออกแบบเพื่อช่วงพักฟื้นหลังการรักษา เน้นการดูแลชีวิตประจำวันอย่างอ่อนโยน อาหารเหมาะสม การพักผ่อนในธรรมชาติ กิจกรรมคลายเครียดและฝึกสติอย่างเรียบง่าย โดยไม่ทับซ้อนงานทางการแพทย์ และสามารถปรับตามความพร้อมของแต่ละท่าน"
    },
    shortRetreat: {
      title: "Back to Nature Retreat (3 คืน 4 วัน)",
      duration: "3 คืน 4 วัน",
      priceRange: "ประมาณ 12,000–15,000 บาท / ท่าน (ขึ้นกับห้องพักและรอบ)",
      summary:
        "แพ็กเกจสั้นเพื่อเติมพลังและผ่อนคลาย เหมาะกับผู้ดูแล ผู้ทำงานเครียด หรือผู้ที่ต้องการพักใจอย่างรวดเร็ว เน้นอาหารที่ย่อยง่าย เดินในสวน สมาธิอย่างอ่อนโยน และกิจกรรมธรรมชาติบำบัด"
    }
  },

  services: [
    "การดูแลช่วงพักฟื้นหลังการรักษา (เช่น หลังผ่าตัด/คีโม/ฉายแสง) แบบไม่ซับซ้อน",
    "การจัดอาหารที่เหมาะสมกับร่างกายในระยะพักฟื้น",
    "กิจกรรมคลายเครียดและฝึกสติ (mindfulness activities) แบบอ่อนโยน",
    "การออกกำลังกายเบา ๆ และการเดินในธรรมชาติ",
    "พื้นที่พักผ่อนที่เงียบสงบ เป็นส่วนตัว เหมาะกับครอบครัว"
  ],

  facilities: [
    "บ้านพัก/ห้องพักท่ามกลางธรรมชาติในแม่ริม",
    "พื้นที่ทำกิจกรรม เงียบสงบ โปร่งโล่ง",
    "เส้นทางเดินชมสวนและมุมทำสมาธิกลางธรรมชาติ",
    "ห้องอาหารที่เน้นวัตถุดิบสะอาดและย่อยง่าย",
    "ระบบดูแลความปลอดภัยและความเป็นส่วนตัว"
  ],

  staff: [
    "ทีมดูแลประจำพื้นที่ที่มีประสบการณ์ด้านกิจวัตรผู้พักฟื้น",
    "ผู้ดูแลกิจกรรมคลายเครียดและการฝึกสติ",
    "ผู้ช่วยดูแลการเคลื่อนไหวเบื้องต้นและการเดินในสวน",
    "ทีมครัวที่เข้าใจอาหารเหมาะสมในช่วงพักฟื้น",
    "ที่ปรึกษาทางการแพทย์/พยาบาลวิชาชีพ (ตามความเหมาะสมในบางกรณี)"
  ],

  location: {
    address: "อำเภอแม่ริม จังหวัดเชียงใหม่",
    district: "แม่ริม",
    province: "เชียงใหม่",
    mapUrl: "https://maps.app.goo.gl/TDMDfLDT514Hu7JAA" // ใส่ลิงก์จริงเมื่อสะดวก
  },

  contact: {
    phone: "080-802-6622",
    line: "@jirungwellness",
    email: "info@jirungwellness.com",
    website: "https://www.jirungwellness.com"
  },

  specialties: [
    "การดูแลช่วงพักฟื้นที่เน้นคุณภาพชีวิต",
    "บรรยากาศธรรมชาติช่วยฟื้นฟูอารมณ์และการนอน",
    "กิจกรรมอ่อนโยนสำหรับผู้ที่อ่อนล้าหลังการรักษา",
    "การสนับสนุนผู้ดูแล (caregiver) ให้มีพลังใจและแนวทางที่ทำได้จริง"
  ],

  philosophy:
    "เราเชื่อว่าการฟื้นฟูที่ดี เริ่มจากการมี ‘พื้นที่ปลอดภัย’ ให้ร่างกายและหัวใจได้พัก และให้ธรรมชาติช่วยเยียวยาอย่างเรียบง่าย",

  experience: "มากกว่า 15 ปี ในงานดูแลสุขภาวะแนวองค์รวมที่เชียงใหม่",

  disclaimers: {
    safety:
      "คำแนะนำนี้เป็นแนวทางทั่วไปเพื่อความสบายกายใจ หากมีอาการผิดปกติหรือภาวะฉุกเฉิน โปรดติดต่อแพทย์ประจำหรือโทร 1669",
    nonMedical:
      "จีรัง เวลเนส เป็นพื้นที่พักฟื้นและเสริมคุณภาพชีวิต ไม่ใช่สถานพยาบาล และไม่ให้คำวินิจฉัย/สั่งยา"
  }
};

/** Utility: simple PII scrubber for logs (hide long numbers/emails/URLs) */
export function scrubPII(text: string): string {
  return text
    .replace(/\b\d{6,}\b/g, "●●●")                 // long numbers
    .replace(/\S+@\S+\.\S+/g, "[email]")           // emails
    .replace(/https?:\/\/\S+/g, "[url]");          // urls
}

/** Classify a user question into a coarse topic for stats */
export type TopicKey =
  | "alzheimer"
  | "fall_risk"
  | "sleep"
  | "diet"
  | "night_care"
  | "post_op"
  | "diabetes"
  | "mood"
  | "cancer_recovery"
  | "general";

export function classifyTopic(query: string): TopicKey {
  const q = query.toLowerCase();
  if (/(อัลไซเมอร์|ความจำ|สับสน|หลงลืม)/.test(q)) return "alzheimer";
  if (/(หกล้ม|ล้ม|พื้นลื่น|รองเท้า)/.test(q)) return "fall_risk";
  if (/(นอนไม่หลับ|หลับยาก|ตื่นบ่อย|นอน)/.test(q)) return "sleep";
  if (/(อาหาร|กินไม่ลง|โภชนาการ|ย่อย)/.test(q)) return "diet";
  if (/(กลางคืน|เฝ้าเวร|ดูแลกลางคืน)/.test(q)) return "night_care";
  if (/(หลังผ่าตัด|ผ่าตัดเข่า|พักฟื้นหลังผ่าตัด)/.test(q)) return "post_op";
  if (/(เบาหวาน|น้ำตาล|อินซูลิน)/.test(q)) return "diabetes";
  if (/(เครียด|วิตก|ซึมเศร้า|อารมณ์)/.test(q)) return "mood";
  if (/(มะเร็ง|คีโม|ฉายแสง|พักฟื้นมะเร็ง)/.test(q)) return "cancer_recovery";
  return "general";
}

/** Is the query about Jirung (brand/place/services)? */
export function isJirungQuery(query: string): boolean {
  const q = query.toLowerCase();
  const kws = [
    "จีรัง", "jirung", "รีสอร์ทแม่ริม", "ศูนย์พักฟื้นเชียงใหม่",
    "ศูนย์นี้", "ที่นี่", "ศูนย์ดูแลนี้", "จิรัง" // common misspell
  ];
  return kws.some(k => q.includes(k));
}

/** Return relevant Jirung info given a user query */
export function getRelevantJirungInfo(query: string): string {
  const q = query.toLowerCase();

  // direct program interest
  if (/(โปรแกรม|แพ็กเกจ|คอร์ส|retreat)/.test(q) && /(มะเร็ง|cancer)/.test(q)) {
    return [
      `${JIRUNG_KNOWLEDGE.programs.flagshipCancerRetreat.title} – ${JIRUNG_KNOWLEDGE.programs.flagshipCancerRetreat.duration}`,
      JIRUNG_KNOWLEDGE.programs.flagshipCancerRetreat.summary,
      JIRUNG_KNOWLEDGE.programs.flagshipCancerRetreat.priceHint ? `ข้อมูลราคา: ${JIRUNG_KNOWLEDGE.programs.flagshipCancerRetreat.priceHint}` : "",
      `ติดต่อ: โทร ${JIRUNG_KNOWLEDGE.contact.phone} | LINE ${JIRUNG_KNOWLEDGE.contact.line}`
    ].filter(Boolean).join("\n");
  }

  if (/(โปรแกรม|แพ็กเกจ|คอร์ส|retreat)/.test(q)) {
    return [
      `${JIRUNG_KNOWLEDGE.programs.shortRetreat.title} – ${JIRUNG_KNOWLEDGE.programs.shortRetreat.duration}`,
      JIRUNG_KNOWLEDGE.programs.shortRetreat.summary,
      JIRUNG_KNOWLEDGE.programs.shortRetreat.priceRange ? `ช่วงราคา: ${JIRUNG_KNOWLEDGE.programs.shortRetreat.priceRange}` : "",
      `ติดต่อ: โทร ${JIRUNG_KNOWLEDGE.contact.phone} | LINE ${JIRUNG_KNOWLEDGE.contact.line}`
    ].filter(Boolean).join("\n");
  }

  // general “ดีไหม/รีวิว/เป็นยังไง”
  if (/(ดีไหม|เป็นยังไง|รีวิว|เหมาะไหม)/.test(q)) {
    return [
      `${JIRUNG_KNOWLEDGE.shortName}: ${JIRUNG_KNOWLEDGE.description}`,
      `แนวทาง: ${JIRUNG_KNOWLEDGE.philosophy}`,
      `จุดเด่น: ${JIRUNG_KNOWLEDGE.specialties.slice(0, 3).join(" • ")}`,
      `สถานที่: ${JIRUNG_KNOWLEDGE.location.address}`,
      `ติดต่อ: โทร ${JIRUNG_KNOWLEDGE.contact.phone} | LINE ${JIRUNG_KNOWLEDGE.contact.line}`
    ].join("\n");
  }

  // services / facilities / staff
  if (/(บริการ|ทำอะไรได้บ้าง)/.test(q)) {
    return `บริการของเรา:\n${JIRUNG_KNOWLEDGE.services.map(s => `• ${s}`).join("\n")}`;
  }
  if (/(สิ่งอำนวยความสะดวก|ห้อง|สถานที่|บรรยากาศ)/.test(q)) {
    const loc = `สถานที่: ${JIRUNG_KNOWLEDGE.location.address}${JIRUNG_KNOWLEDGE.location.mapUrl ? ` (แผนที่: ${JIRUNG_KNOWLEDGE.location.mapUrl})` : ""}`;
    return `สิ่งอำนวยความสะดวก:\n${JIRUNG_KNOWLEDGE.facilities.map(f => `• ${f}`).join("\n")}\n${loc}`;
  }
  if (/(ทีมงาน|พยาบาล|ผู้ดูแล|ครู|staff)/.test(q)) {
    return `ทีมงาน:\n${JIRUNG_KNOWLEDGE.staff.map(s => `• ${s}`).join("\n")}`;
  }

  // contact
  if (/(ติดต่อ|โทร|เบอร์|อีเมล|เว็ป|เว็บไซต์|ไลน์|line)/.test(q)) {
    return [
      `ติดต่อจีรัง เวลเนส`,
      `• โทรศัพท์: ${JIRUNG_KNOWLEDGE.contact.phone}`,
      `• LINE: ${JIRUNG_KNOWLEDGE.contact.line}`,
      `• อีเมล: ${JIRUNG_KNOWLEDGE.contact.email}`,
      `• เว็บไซต์: ${JIRUNG_KNOWLEDGE.contact.website}`
    ].join("\n");
  }

  // default general + safety
  return [
    `${JIRUNG_KNOWLEDGE.shortName}: ${JIRUNG_KNOWLEDGE.description}`,
    `โปรแกรมหลัก:`,
    `• ${JIRUNG_KNOWLEDGE.programs.flagshipCancerRetreat.title} (${JIRUNG_KNOWLEDGE.programs.flagshipCancerRetreat.duration})`,
    `• ${JIRUNG_KNOWLEDGE.programs.shortRetreat.title} (${JIRUNG_KNOWLEDGE.programs.shortRetreat.duration})`,
    `ติดต่อ: โทร ${JIRUNG_KNOWLEDGE.contact.phone} | LINE ${JIRUNG_KNOWLEDGE.contact.line}`,
    `หมายเหตุ: ${JIRUNG_KNOWLEDGE.disclaimers.nonMedical}`
  ].join("\n");
}

/** Helper: inject Jirung context into a system prompt for the chat agent */
export function injectJirungContextForPrompt(baseSystemPrompt: string): string {
  const k = JIRUNG_KNOWLEDGE;
  const lines = [
    baseSystemPrompt,
    "",
    "— Jirung Context —",
    `${k.name} @ ${k.location.address}`,
    `Philosophy: ${k.philosophy}`,
    `Programs:`,
    `- ${k.programs.flagshipCancerRetreat.title} (${k.programs.flagshipCancerRetreat.duration})`,
    `- ${k.programs.shortRetreat.title} (${k.programs.shortRetreat.duration})`,
    `Services: ${k.services.slice(0, 4).join("; ")}`,
    `Contact: Tel ${k.contact.phone} | LINE ${k.contact.line} | Web ${k.contact.website}`,
    `Safety: ${k.disclaimers.nonMedical} / ${k.disclaimers.safety}`
  ];
  return lines.join("\n");
}