/**
 * Simple test script to verify Gemini API key works with new Google Gen AI SDK
 * Run with: node test-gemini.js
 */

require('dotenv').config();

async function testGeminiAPI() {
  console.log('🤖 Testing Gemini API Connection with Google Gen AI SDK...\n');
  
  // Check if API key is set
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in environment variables');
    console.log('Please add your API key to the .env file:');
    console.log('GEMINI_API_KEY=your-actual-api-key-here');
    return;
  }
  
  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...');
  
  try {
    // Import the new Google Gen AI SDK
    const { GoogleGenAI } = await import('@google/genai');
    
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    console.log('🔍 Testing model:', model);
    
    // Initialize the client (try both environment variable names)
    const ai = new GoogleGenAI({ apiKey: apiKey || process.env.GOOGLE_API_KEY });
    
    // Test with a simple prompt
    const response = await ai.models.generateContent({
      model: model,
      contents: 'Hello! Please respond with "API test successful" in Thai.',
    });
    
    if (response.text) {
      console.log('✅ API Test Successful!');
      console.log('🤖 AI Response:', response.text);
      console.log('\n🎉 Your Gemini API is working correctly!');
      
      // Show usage info
      if (response.usageMetadata) {
        console.log('\n📊 Token Usage:');
        console.log('- Prompt tokens:', response.usageMetadata.promptTokenCount);
        console.log('- Response tokens:', response.usageMetadata.candidatesTokenCount);
        console.log('- Total tokens:', response.usageMetadata.totalTokenCount);
      }
      
      // Test Thai language specifically
      console.log('\n🇹🇭 Testing Thai language support...');
      const thaiResponse = await ai.models.generateContent({
        model: model,
        contents: 'คุณยายมีอาการปวดหัว ควรทำอย่างไร',
      });
      
      if (thaiResponse.text) {
        console.log('✅ Thai language test successful!');
        console.log('🤖 Thai Response:', thaiResponse.text);
      }
      
    } else {
      console.error('❌ No response text generated');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Check your internet connection');
    console.log('2. Verify your API key is correct');
    console.log('3. Make sure your API key has Gemini API access enabled');
    console.log('4. Ensure you have the @google/genai package installed');
    
    if (error.message?.includes('API key')) {
      console.log('\n🔑 API Key Issue:');
      console.log('- Make sure your API key is valid');
      console.log('- Check that it has access to the Gemini API');
      console.log('- Verify it\'s not restricted to specific IPs or domains');
    }
  }
}

// Run the test
testGeminiAPI();