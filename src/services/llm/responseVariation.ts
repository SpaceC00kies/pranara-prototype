/**
 * Response Variation Manager
 * Ensures Pranara never repeats the same opening patterns
 */

export class ResponseVariationManager {
  private static openingsByContext = {
    worry_parent: [
      "การดูแลพ่อแม่นี่ท้าทายจริงๆ นะคะ",
      "เห็นความห่วงใยที่มีให้คุณแม่เลยค่ะ",
      "ช่วงนี้คุณแม่เป็นยังไงบ้างคะ",
      "ความกังวลนี้แสดงถึงความรักที่ลึกซึ้งเลยนะคะ",
      "ดูแลคุณแม่มานานแล้วใช่ไหมคะ"
    ],
    health_concern: [
      "อาการที่เล่ามาน่าเป็นห่วงนะคะ",
      "ร่างกายส่งสัญญาณมาแบบนี้สินะ",
      "มาดูกันว่าจะดูแลตัวเองยังไงดีนะคะ",
      "ไม่สบายมาหลายวันแล้วใช่ไหมคะ",
      "ขอให้ค่อยๆ ฟื้นตัวนะคะ"
    ],
    emotional_support: [
      "ใจหนักมากเลยช่วงนี้นะคะ",
      "บางครั้งชีวิตก็ท้าทายเราแบบนี้จริงๆ",
      "ความรู้สึกนี้เป็นธรรมชาติค่ะ ไม่ต้องกลัว",
      "มีปราณาราอยู่ตรงนี้ค่ะ พร้อมฟังเสมอ",
      "ช่วงเวลาแบบนี้ เราต้องใจเย็นๆ กันนะคะ"
    ]
  };

  static getUniqueOpening(context: string, recentPatterns: string[]): string {
    const possibleOpenings = this.openingsByContext[context] || this.openingsByContext.emotional_support;
    
    // Filter out any openings that match recent patterns
    const availableOpenings = possibleOpenings.filter(opening => 
      !recentPatterns.some(pattern => 
        opening.includes(pattern.substring(0, 10)) || 
        pattern.includes(opening.substring(0, 10))
      )
    );

    // If all openings have been used, create a new unique one
    if (availableOpenings.length === 0) {
      return this.generateCreativeOpening(context);
    }

    // Return random available opening
    return availableOpenings[Math.floor(Math.random() * availableOpenings.length)];
  }

  private static generateCreativeOpening(context: string): string {
    const creativeTemplates = [
      "ขอบคุณที่แบ่งปันนะคะ...",
      "อ่านแล้วรู้สึกถึง...",
      "เรื่องราวที่เล่ามา...",
      "ปราณาราเข้าใจดีค่ะว่า...",
      "ช่วงเวลาแบบนี้..."
    ];
    
    return creativeTemplates[Math.floor(Math.random() * creativeTemplates.length)];
  }
}