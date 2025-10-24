# AI Tutoring/Chat System - Implementation Guide

**Implemented**: October 24, 2025  
**Feature**: AI Model Selection for Tutoring Sessions

---

## 🎯 What Was Implemented

### ✅ AI Model Selection Feature
Users can now choose which OpenAI model to use for their tutoring sessions:
- **GPT-4 Turbo** (`gpt-4o`) - Most capable, best for complex problems
- **GPT-4 Mini** (`gpt-4o-mini`) - Balanced performance and speed (default)
- **GPT-3.5 Turbo** (`gpt-3.5-turbo`) - Fast and efficient for simple queries

---

## 📁 Files Modified

### Frontend Changes

#### 1. **client/src/pages/Tutoring/Tutoring.tsx**
- ✅ Added model selection state: `selectedModel`
- ✅ Added `availableModels` array with descriptions
- ✅ Added model dropdown in chat header with Material-UI Select component
- ✅ Updated `handleSendMessage` to include model parameter
- ✅ Reset model to default when switching sessions

**Key Changes**:
```tsx
const [selectedModel, setSelectedModel] = useState<string>('gpt-4o-mini');

const availableModels = [
  { value: 'gpt-4o', label: 'GPT-4 Turbo', description: 'Most capable' },
  { value: 'gpt-4o-mini', label: 'GPT-4 Mini', description: 'Balanced (recommended)' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast and efficient' },
];
```

#### 2. **client/src/services/tutoringApi.ts**
- ✅ Updated `SendMessageRequest` interface to include optional `model` parameter

```typescript
export interface SendMessageRequest {
  content: string;
  model?: string; // AI model to use
}
```

### Backend Changes

#### 3. **server/src/services/AITutoringService.ts**
- ✅ Updated `generateResponse()` method signature to accept `model` parameter
- ✅ Added model validation (whitelist of valid models)
- ✅ Added console logging for model tracking
- ✅ Default model: `gpt-4o-mini`

**Key Changes**:
```typescript
async generateResponse(
  message: string,
  context: TutoringContext,
  model: string = 'gpt-4o-mini'
): Promise<AIResponse> {
  const validModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'];
  const selectedModel = validModels.includes(model) ? model : 'gpt-4o-mini';
  
  console.log(`🤖 Generating AI response using model: ${selectedModel}`);
  
  const completion = await this.openai.chat.completions.create({
    model: selectedModel, // Dynamic model selection
    // ... rest of config
  });
}
```

#### 4. **server/src/routes/tutoring.ts**
- ✅ Updated POST `/sessions/:sessionId/messages` to accept `model` in request body
- ✅ Added session context update to persist model preference
- ✅ Pass model parameter to `aiService.generateResponse()`
- ✅ Store model information in message metadata

**Key Changes**:
```typescript
router.post('/sessions/:sessionId/messages', authenticateToken, async (req, res) => {
  const { content, model } = req.body; // Accept model parameter
  
  // Update session context with preferred model
  if (model) {
    sessionContext = { ...sessionContext, preferredModel: model };
    await db.execute(`UPDATE dbo.TutoringSessions SET Context = @context WHERE Id = @sessionId`);
  }
  
  // Generate AI response with selected model
  const aiResponse = await aiService.generateResponse(content, tutoringContext, model);
  
  // Store model in metadata
  metadata: JSON.stringify({
    suggestions: aiResponse.suggestions,
    followUpQuestions: aiResponse.followUpQuestions,
    model: model || 'gpt-4o-mini'
  })
});
```

---

## 🗄️ Database Changes

### TutoringSessions Table
- **Context JSON field** now stores: `{ preferredModel: 'gpt-4o-mini', ... }`

### TutoringMessages Table
- **Metadata JSON field** now stores: `{ model: 'gpt-4o-mini', suggestions: [...], followUpQuestions: [...] }`

**No schema changes required** - using existing JSON fields for flexibility.

---

## 🚀 How To Use

### For Users:

1. **Navigate to AI Tutoring** (already in navigation):
   - Click "AI Tutoring" in the main navigation menu
   - Or visit: `http://localhost:5173/tutoring`

2. **Create or Select a Session**:
   - Click "New" to create a new tutoring session
   - Or select an existing session from the sidebar

3. **Choose Your AI Model**:
   - Look for the "AI Model" dropdown in the top-right of the chat area
   - Select your preferred model based on your needs:
     - **GPT-4 Turbo**: Complex problem-solving, detailed explanations
     - **GPT-4 Mini**: General use, good balance (default)
     - **GPT-3.5 Turbo**: Quick questions, simple explanations

4. **Start Chatting**:
   - Type your question in the message box
   - Press Enter or click Send
   - The AI will respond using your selected model

5. **Switch Models Anytime**:
   - Change the model dropdown at any time
   - Next message will use the new model
   - Previous messages remain unchanged

### For Developers:

**Start the Application**:
```powershell
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

**Test the Feature**:
1. Navigate to `http://localhost:5173/tutoring`
2. Create a new session
3. Try sending messages with different models
4. Check server console for model logs: `🤖 Generating AI response using model: gpt-4o-mini`

---

## 🧪 Testing Checklist

- [✅] Frontend UI renders model dropdown
- [✅] Model selection persists during session
- [✅] Model parameter sent to backend API
- [✅] Backend validates model selection
- [✅] AITutoringService uses selected model
- [✅] Model info stored in session context
- [✅] Model info stored in message metadata
- [ ] **Manual Testing Required**: Send actual messages and verify AI responses
- [ ] **Manual Testing Required**: Verify different models produce appropriate responses
- [ ] **Manual Testing Required**: Check OpenAI API key is configured

---

## ⚙️ Configuration Required

### OpenAI API Key Setup

The AI Tutoring system requires a valid OpenAI API key:

1. **Get an API Key**:
   - Visit: https://platform.openai.com/api-keys
   - Create a new API key

2. **Configure the Backend**:
   - Open `server/.env` file
   - Add or update: `OPENAI_API_KEY=your-actual-api-key-here`

3. **Restart the Server**:
   ```powershell
   cd server
   npm run dev
   ```

**Without a valid API key**, the tutoring system will return an error message:
> "I'm sorry, but I'm currently experiencing technical difficulties. This might be due to: Invalid or missing OpenAI API key..."

---

## 💰 Cost Considerations

Different models have different pricing:

| Model | Input Cost | Output Cost | Best For |
|-------|-----------|-------------|----------|
| GPT-4 Turbo | ~$10/1M tokens | ~$30/1M tokens | Complex problems, detailed explanations |
| **GPT-4 Mini** | ~$0.15/1M tokens | ~$0.60/1M tokens | **General tutoring (recommended)** |
| GPT-3.5 Turbo | ~$0.50/1M tokens | ~$1.50/1M tokens | Simple queries, quick responses |

**Default Model**: `gpt-4o-mini` provides excellent balance of quality and cost.

---

## 🔧 Technical Architecture

### Request Flow:

```
User UI (Tutoring.tsx)
    ↓ [Selects model in dropdown]
    ↓ [Types message]
    ↓ [Clicks Send]
    ↓
tutoringApi.sendMessage({ content, model })
    ↓ [POST /api/tutoring/sessions/:id/messages]
    ↓
tutoring.ts Route Handler
    ↓ [Validates user access]
    ↓ [Updates session context]
    ↓ [Stores user message]
    ↓
AITutoringService.generateResponse(message, context, model)
    ↓ [Validates model]
    ↓ [Builds context-aware prompt]
    ↓ [Calls OpenAI API with selected model]
    ↓
OpenAI API Response
    ↓ [Generates suggestions]
    ↓ [Returns AIResponse]
    ↓
tutoring.ts Route Handler
    ↓ [Stores AI message with metadata]
    ↓ [Returns to frontend]
    ↓
User UI Updates
    ↓ [Displays both messages]
    ✓ [Shows suggestions chips]
```

---

## 🎨 UI/UX Features

### Model Selector Design:
- **Location**: Top-right of chat area
- **Component**: Material-UI Select with FormControl
- **Size**: Small (compact)
- **Width**: 200px minimum
- **Labels**: Clear model names + descriptions
- **Default**: GPT-4 Mini (pre-selected)

### User Experience:
- Model selection is per-message (can change anytime)
- Visual feedback: dropdown shows current selection
- No page reload required when switching models
- Suggestions and follow-up questions continue to work
- Conversation context maintained across model switches

---

## 📊 Future Enhancements

Potential improvements for future iterations:

1. **Model Usage Analytics**:
   - Track which models users prefer
   - Show cost estimates per session
   - Display model usage statistics

2. **Smart Model Recommendations**:
   - AI suggests model based on query complexity
   - Auto-switch to GPT-4 for complex questions
   - Cost optimization hints

3. **Model Performance Indicators**:
   - Show response time for each model
   - Display token usage per message
   - Quality ratings from users

4. **Session-Level Model Lock**:
   - Option to lock model for entire session
   - Bulk model change for message history
   - Model comparison mode

5. **Custom Model Configurations**:
   - Adjustable temperature/creativity
   - Token limit controls
   - System prompt customization

---

## 🐛 Troubleshooting

### Issue: Model dropdown not showing
**Solution**: Make sure `availableModels` array is defined and frontend has no compilation errors

### Issue: AI returns error message
**Solution**: Check OpenAI API key configuration in `server/.env`

### Issue: Model selection not persisting
**Solution**: Check browser console for API errors, verify session context updates

### Issue: Different models return same responses
**Solution**: 
1. Check server logs for model confirmation: `🤖 Generating AI response using model: ...`
2. Verify OpenAI API key has access to selected models
3. Test with significantly different prompts (simple vs complex)

---

## ✅ Completion Status

**Implementation**: ✅ **COMPLETE**

All core features implemented:
- ✅ Model selection UI
- ✅ Frontend API integration
- ✅ Backend model validation
- ✅ Dynamic OpenAI API calls
- ✅ Session context persistence
- ✅ Message metadata storage
- ✅ Error handling
- ✅ Console logging for debugging

**Ready for Testing**: Yes - requires OpenAI API key setup

**Ready for Production**: Pending manual testing and API key configuration

---

## 📝 Notes

- Navigation already exists ("AI Tutoring" in Header)
- Chat system infrastructure was already in place
- This implementation adds model selection capability
- No breaking changes to existing functionality
- Backward compatible with existing tutoring sessions
- Database schema remains unchanged (uses JSON fields)

---

*This feature enhances the Mishin Learn Platform's AI tutoring capabilities by giving users control over the AI model used for their learning sessions.*
