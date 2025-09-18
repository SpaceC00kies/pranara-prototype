import { NextRequest, NextResponse } from 'next/server';
import { GeminiDirectProvider } from '../../../services/llm/geminiDirectProvider';

/**
 * Test endpoint to verify model switching functionality
 */
export async function POST(request: NextRequest) {
  try {
    const { model } = await request.json();
    
    if (!model || !['pnr-g', 'pnr-g2'].includes(model)) {
      return NextResponse.json(
        { error: 'Invalid model. Must be pnr-g or pnr-g2' },
        { status: 400 }
      );
    }

    // Create provider instance
    const provider = new GeminiDirectProvider();
    
    // Get initial state
    const initialVerification = provider.verifySystemInstruction();
    console.log('Initial state:', initialVerification);
    
    // Update model
    provider.updateModelInstruction(model);
    
    // Verify after update
    const finalVerification = provider.verifySystemInstruction();
    console.log('Final state:', finalVerification);
    
    // Test with a simple prompt
    const testPrompt = "สวัสดีค่ะ";
    let response = '';
    
    for await (const chunk of provider.generateStreamingResponse(testPrompt, { sessionId: 'test-session' })) {
      response += chunk;
    }
    
    return NextResponse.json({
      success: true,
      model: model,
      verification: finalVerification,
      testResponse: response.substring(0, 200) + '...',
      logs: {
        initial: initialVerification,
        final: finalVerification,
        switched: initialVerification.modelType !== finalVerification.modelType
      }
    });
    
  } catch (error) {
    console.error('Test model error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}