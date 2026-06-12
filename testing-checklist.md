# WhatsApp Virality Engine — Testing Checklist

## Automated Tests (`npm test`)

Run `npm test` to execute 33 automated tests across 7 test suites in `lib/whatsapp/virality.test.ts`.

### Score Range (6 tests)
- [x] High-virality text: all 5 dimensions + overall are 0-100
- [x] Low-virality text: all scores are 0-100
- [x] Emoji-heavy text: all scores are 0-100
- [x] Question-hook text: all scores are 0-100
- [x] Empty text: overall is 0, suggestions returned
- [x] Whitespace-only text: overall is 0

### Dimension Scoring Logic (8 tests)
- [x] Forwardability: share triggers score higher than plain text
- [x] Forwardability: "you"-focused scores higher than "I/me/my"-focused
- [x] Readability: simple sentences score higher than complex jargon
- [x] Readability: bullet points score higher than dense prose
- [x] Emotional Impact: emotional words + personal pronouns score higher
- [x] Emotional Impact: too many exclamation points penalized (not rewarded)
- [x] Curiosity Level: questions + triggers score higher than direct statements
- [x] Curiosity Level: ellipsis creates open loops, boosts curiosity

### Overall Score (2 tests)
- [x] Overall matches weighted formula: `fwd*0.25 + read*0.2 + emo*0.2 + cur*0.2 + share*0.15`
- [x] High-virality text scores higher overall than low-virality text

### Improvement Suggestions (4 tests)
- [x] Low-scoring content returns suggestions
- [x] All suggestions are non-empty strings (>5 chars)
- [x] At most 5 suggestions returned
- [x] High-quality content suggestions are still valid strings

### Source Tracking (1 test)
- [x] Default source is "heuristic" (not "ai")

### Batch Analysis (4 tests)
- [x] Batch returns correct item count, averages in range
- [x] averageOverall matches calculated mean
- [x] Top 3 and weakest 3 scores returned correctly
- [x] Single-item batch average equals item score

### Edge Cases (6 tests)
- [x] Numbers-only text: all scores valid
- [x] Special characters only: all scores valid
- [x] Very long text (1000+ chars): all scores valid
- [x] Multi-paragraph text with line breaks: all scores valid
- [x] Nigerian English + ₦ currency: all scores valid
- [x] Deterministic: same text produces identical scores across runs

## Manual UI Tests

### WhatsAppSuiteCard (generic cards: promotional, quick-reply)
- [ ] Virality score section appears collapsed with "Show virality score" toggle
- [ ] Clicking toggle expands to show compact score display
- [ ] Scores load within 1 second of content appearing
- [ ] Score bars are color-coded appropriately (green/yellow/red)
- [ ] Improvement suggestions are relevant to the content

### WhatsAppStatusViewer (phone mockup)
- [ ] Virality score toggles below phone display
- [ ] Score updates when navigating to a different status
- [ ] Compact display shows overall + 5 dimension badges

### WhatsAppBroadcastViewer
- [ ] Virality score toggles per broadcast type card
- [ ] Score refreshes when switching tone (Short/Medium/Long)

### WhatsAppFunnelViewer
- [ ] Virality score toggles per funnel stage
- [ ] Score refreshes when switching tone (Soft/Balanced/Aggressive)

### WhatsAppFollowUpViewer
- [ ] Virality score toggles per follow-up type card
- [ ] Shows score for first variation of selected tone

### AI-Enhanced Analysis
- [ ] "Analyze with AI" button appears when `allowAI` is true
- [ ] Clicking shows loading state
- [ ] AI scores replace heuristic scores on completion
- [ ] Falls back to heuristic if AI call fails
