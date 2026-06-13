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

---

# Auto-Publish Engine — Testing Checklist

## Automated Tests

### Recipient Management (4 tests)
- [ ] Create recipient: POST /api/recipients returns id
- [ ] List recipients: GET /api/recipients?userId=X returns array
- [ ] Update recipient: PUT /api/recipients succeeds
- [ ] Delete recipient: DELETE /api/recipients?id=X succeeds

### Publish Queue (5 tests)
- [ ] Publish single item: returns { success, messageId }
- [ ] Publish batch: returns array of job statuses
- [ ] Queue processes items with configurable delay
- [ ] Failed items set status to "failed" with error message
- [ ] All items set to "queued" initially before processing

### WhatsApp Business API (3 tests)
- [ ] Mock service saves to Firestore with status "draft"
- [ ] WABA service posts to Meta Graph API with correct body
- [ ] WABA service handles API error gracefully

## Manual UI Tests

### Recipient Manager
- [ ] "Add" form accepts phone number + label
- [ ] Auto-formats Nigerian numbers (+234 prefix)
- [ ] List shows all saved recipients
- [ ] Edit button opens inline edit fields
- [ ] Delete button shows confirmation
- [ ] Select radio works (on Connections page and Publish dialog)

### Publish Button / Dialog
- [ ] Button opens publish dialog
- [ ] Dialog shows recipient selector with saved numbers
- [ ] Inter-send delay slider works (1s-10s)
- [ ] "Publish All" triggers queue and shows progress
- [ ] Queue status shows per-item progress (Queued → Sending → Sent/Failed)
- [ ] Progress bar fills as items are sent
- [ ] Failed items show error message
- [ ] Cancel button closes dialog
- [ ] After all sent, button shows "Done" / "Published"

### Publish from Create Page
- [ ] "Publish All" bar appears in results section
- [ ] All platform items are queued correctly
- [ ] WhatsApp items get sent via WABA connector

### Publish from WhatsApp Suite
- [ ] "Publish All" bar appears in results section
- [ ] Individual "Publish" button replaces old "Send to WhatsApp" in ContentActions
- [ ] All selected WhatsApp types are queued

### Publish from Campaign Builder
- [ ] "Publish Campaign" button appears in the timeline header
- [ ] All timeline items are queued in order
- [ ] Inter-send delay prevents spam

### Connections Page
- [ ] Shows all platform connections (WhatsApp active, others "Coming soon")
- [ ] WhatsApp Recipients section shows recipient manager
- [ ] Add/edit/delete recipients works on this page

### Performance & UX
- [ ] Queue processes quickly (< 1s per item in mock mode)
- [ ] UI does not freeze during publishing
- [ ] Toast notifications for success/failure per item
- [ ] Published items show "sent" badge
