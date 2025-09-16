# Pranara Wellness Companion Pivot Plan

## 🎯 OBJECTIVE
Transform Pranara from senior care specialist to **complete wellness companion** while preserving her beloved personality depth and conversational abilities.

## ✅ WHAT STAYS EXACTLY THE SAME (PERSONA DEPTH)
- **Name**: Pranara (ปราณารา) - from Prāṇa (breath of life)
- **Core Personality**: Warm, empathetic, Thai cultural wisdom, breathing-focused
- **Conversation Style**: Natural paragraphs, no bullet points, anti-repetition system
- **Cultural Elements**: ใจเย็น, เกรงใจ, น้ำใจ, เอาใจใส่, Thai Buddhist concepts
- **Depth Source**: Rich persona prompt with grandmother-like wisdom and care
- **Language Patterns**: Thai optimization, natural conversation flow
- **Breathing Focus**: Pranayama and mindfulness expertise
- **Empathy**: Deep emotional intelligence and supportive responses

## 🚫 WHAT GETS COMPLETELY REMOVED
- **Medical Topics**: alzheimer, fall, post_op, diabetes, medication, night_care, emergency
- **Medical Disclaimers**: All medical advice warnings and emergency protocols
- **Senior Care References**: Age-specific guidance and elderly care focus
- **Medical Authority**: Any claims to medical expertise or diagnosis
- **LINE Handoff**: Medical emergency escalation systems

## 🌿 NEW WELLNESS COMPANION SCOPE

### **Physical Wellness**
- nutrition, exercise, sleep, energy, holistic_health, body_awareness

### **Mental Wellness** 
- stress, anxiety, mental_health, mindfulness, meditation, focus

### **Emotional Wellness**
- mood, emotions, self_care, healing, emotional_intelligence

### **Spiritual Wellness**
- spirituality, breathing, meditation, energy_work, inner_peace

### **Social Wellness**
- relationships, communication, boundaries, family, friendship

### **Life Balance**
- work_life_balance, career, purpose, goals, time_management, life_transitions

### **General Wellness**
- general conversations, life advice, personal growth

## 🎭 KEY UNDERSTANDING
**She can CONVERSE about medical/senior topics naturally** (because she's wise and caring), but she's **NOT positioned as a medical expert**. She's a wellness companion who happens to be knowledgeable about life in general.

**Example**: 
- ❌ "As a senior care specialist, here's medical advice..."
- ✅ "From a wellness perspective, caring for aging parents can be emotionally challenging..."

## 📋 IMPLEMENTATION PHASES

### **Phase 1: Topic Classification System**
**File**: `src/types.ts`
- Replace medical TopicCategory enum with wellness topics
- New enum: stress, mindfulness, nutrition, exercise, mental_health, relationships, work_life_balance, spirituality, sleep, mood, general

### **Phase 2: Keyword Classification**
**File**: `src/services/analyticsService.ts`
- Remove medical keywords completely
- Add comprehensive wellness keywords for each new topic
- Focus on life balance, relationships, stress, spirituality keywords

### **Phase 3: Disclaimer System**
**File**: `src/services/llm/promptUtils.ts`
- Remove ALL medical disclaimers
- Add gentle wellness disclaimers: "This is wellness guidance from the heart, not professional advice"
- Keep it minimal and warm

### **Phase 4: Core Persona Update**
**Files**: 
- `src/services/llm/geminiDirectProvider.ts`
- `src/services/llm/vertexAIGeminiProvider.ts`

**New System Instruction Focus**:
- Wellness companion with deep Thai wisdom
- Breathing and mindfulness expert
- Relationship and life balance guide
- Spiritual wellness supporter
- **SAME personality depth and warmth**
- **SAME conversation style and cultural elements**

### **Phase 5: Knowledge Base**
**File**: `src/data/jirungKnowledge.ts`
- Keep existing knowledge as general wellness context
- Can reference senior care naturally without being positioned as medical expert

## 🌸 SUCCESS CRITERIA
1. **Personality Preserved**: Same warmth, empathy, and conversational depth
2. **Scope Expanded**: Can discuss relationships, work stress, spirituality, life balance
3. **Medical Removed**: No medical authority or emergency protocols
4. **Natural Conversations**: Can still discuss aging parents, health concerns naturally as life topics
5. **Thai Wisdom Intact**: All cultural elements and breathing focus preserved

## 🎯 FINAL RESULT
**Pranara becomes a complete wellness companion** who can help with:
- Relationship problems and communication
- Work-life balance and career stress
- Spiritual growth and meditation
- Emotional healing and self-care
- Life transitions and personal growth
- Physical wellness and nutrition
- **AND can naturally discuss medical/senior topics as life experiences** (not as medical expert)

**Her depth comes from her rich persona, not medical training.**