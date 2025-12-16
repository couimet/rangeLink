# Narrative: Basic RangeLink Usage Demo

**Total Duration:** 30-45 seconds
**Target Audience:** Developers using AI coding assistants
**Key Value Prop:** Eliminate the tedious manual process of sharing code context

---

## 🎭 Script with Timing

### [0:00-0:03] Opening Scene
**Visual:**
- VSCode window fills screen
- `user-validator.ts` file is open
- Code is visible, scrolled to show `validateUser` function
- Terminal with Claude Code below (split view)
- Cursor is idle

**Voiceover/Text Overlay (Optional):**
> "Need to ask about specific code?"

**Director Notes:**
- Let viewers orient themselves
- They should see: typical dev environment, code editor, AI assistant ready
- Keep cursor still (no nervous movements)

---

### [0:03-0:08] The Setup
**Visual:**
- Cursor moves to line 13
- User begins selecting lines 13-28 (the email validation block)
- Selection highlight appears as mouse drags down

**Code being highlighted:**
```typescript
  // Check email format
  if (!user.email.includes('@')) {
    return false;
  }
```

**No voiceover needed** - action is self-explanatory

**Director Notes:**
- Move mouse smoothly, not jittery
- Ensure line numbers are visible during selection
- Selection should be clear and deliberate
- Hold selection for 1 second before next action

---

### [0:08-0:11] Opening Command Palette
**Visual:**
- `Cmd+Shift+P` pressed
- Command palette opens at top of screen
- User types: "RangeLink" (slowly, letter by letter)

**Text Overlay (Optional):**
> "✨ Just highlight and..."

**Director Notes:**
- Type slowly enough for viewers to read
- Command palette should auto-filter to show RangeLink commands
- Don't rush this - viewers need to see what you're typing

---

### [0:11-0:13] Copying the Link
**Visual:**
- "RangeLink: Copy RangeLink to Clipboard" is highlighted
- User presses Enter
- Command palette closes
- Brief pause (1 second)

**Text Overlay:**
> "📋 Link copied!"

**Director Notes:**
- The action happens fast, text overlay is crucial here
- No visible feedback from the command (clipboard is invisible)
- Pause gives viewers a moment to register what happened

---

### [0:13-0:18] Switching to Terminal
**Visual:**
- Cursor moves down to terminal
- Click into terminal (Claude Code prompt)
- Cursor blinks in terminal, ready for input

**No voiceover/overlay needed**

**Director Notes:**
- Smooth transition from editor to terminal
- Click clearly in the terminal area
- Ensure cursor is blinking at the prompt before pasting

---

### [0:18-0:23] Pasting the Link
**Visual:**
- `Cmd+V` pressed
- RangeLink appears in terminal:
  ```
  vscode://file//Users/.../user-validator.ts:13:3-28:4
  ```
- Pause for 2 seconds to let viewers see the link format

**No overlay needed** - let viewers absorb the link format

**Director Notes:**
- This is a key moment - viewers see the output format
- Don't rush past this
- The link format demonstrates what RangeLink generates
- 2-second pause is critical for comprehension

---

### [0:23-0:30] Adding Context/Prompt
**Visual:**
- User presses Enter (moves to next line in terminal)
- Types the prompt:
  ```
  This email validation looks fragile. How can I make it more robust?
  ```
- Cursor at end of prompt

**Text Overlay (Optional):**
> "🎯 Precise context"

**Director Notes:**
- Type at natural speed (not too fast)
- If adding voiceover, you can speed up typing and use text overlay
- The prompt should feel natural, like a real question
- Don't press Enter yet - hold for 1 second

---

### [0:30-0:35] Submission
**Visual:**
- User presses Enter
- Claude Code begins processing (you might see initial streaming response)
- Can stop recording here OR capture first few words of Claude's response

**Text Overlay:**
> "Instant communication"

**Director Notes:**
- You don't need to capture Claude's full response
- Just showing the submission demonstrates the workflow
- If you want to show Claude responding, capture 3-5 seconds of streaming

---

### [0:35-0:45] Closing / Call to Action
**Option A: Fade to Black**
- Screen fades
- Text appears:
  ```
  RangeLink for VSCode

  Stop copying line numbers.
  Start sharing context.

  github.com/Shopify/rangeLink
  ```

**Option B: Stay on Screen**
- Keep VSCode visible
- Overlay text in corner:
  ```
  RangeLink
  github.com/Shopify/rangeLink
  ```

**Director Notes:**
- Option A is more polished, Option B is easier to edit
- Include the GitHub URL prominently
- If posting to Twitter, mention "@anthropic" or "#ClaudeCode"

---

## 📣 Voiceover Script (Optional)

If you want to add voiceover instead of text overlays:

### Full Voiceover (Conversational Tone)

```
[0:00] "Need to ask Claude about specific code?"

[0:03] "Just highlight the section you want to discuss..."

[0:08] "...open the command palette..."

[0:11] "...and copy a RangeLink."

[0:18] "Paste it into Claude Code with your question..."

[0:30] "...and get instant, precise feedback."

[0:35] "RangeLink: Stop copying line numbers. Start sharing context."
```

### Minimal Voiceover (Let Actions Speak)

```
[0:00] "Need to ask about specific code?"

[0:30] "RangeLink makes it effortless."

[0:35] "Available now for VSCode."
```

---

## 🎬 Alternative Narratives

### Narrative B: "The Problem First"

Show the pain before the solution:

**[0:00-0:10] The Old Way (Painful)**
- Show user manually scrolling
- Highlighting filename in file explorer, copying
- Noting line numbers: "Lines 13 to 28"
- Typing manually: `user-validator.ts lines 13-28`
- Text overlay: ❌ "The tedious way"

**[0:10-0:30] The RangeLink Way (Effortless)**
- Same as main narrative above
- Text overlay: ✅ "The effortless way"

**Duration:** 30-40 seconds total

---

### Narrative C: "Speed Run" (15 seconds)

For social media where attention is scarce:

**[0:00-0:03]** Highlight code
**[0:03-0:06]** Command palette → Copy RangeLink
**[0:06-0:09]** Paste into Claude Code
**[0:09-0:12]** Press Enter
**[0:12-0:15]** Claude responds (show first line)

Text overlays:
- [0:00] "Highlight"
- [0:03] "Copy RangeLink"
- [0:06] "Paste & Ask"
- [0:09] "Get Precise Help"
- [0:12] "RangeLink for VSCode"

---

## 🎨 Visual Polish Ideas

### Option 1: Highlight Effects
Use video editing to add:
- Soft glow around highlighted code section
- Zoom in slightly when selection is made
- Subtle animation when link is copied

### Option 2: Split Screen Comparison
Show two windows side by side:
- Left: Manual process (copying filename, noting lines)
- Right: RangeLink process (highlight → copy → paste)

### Option 3: Picture-in-Picture
- Main screen: VSCode with your actions
- PiP corner: Your face explaining (optional, builds trust)

---

## 🎯 Key Messages to Convey

By the end of this 30-45 seconds, viewers should understand:

1. ✅ **The Problem:** Sharing code context with AI is tedious (filenames, line numbers)
2. ✅ **The Solution:** RangeLink automates this with one command
3. ✅ **The Workflow:** Highlight → Copy RangeLink → Paste → Ask
4. ✅ **The Benefit:** Precise, effortless communication with AI assistants
5. ✅ **The Call to Action:** Available now on GitHub

---

## 📊 Success Metrics

How to know if your demo is effective:

**During Recording:**
- [ ] Every action is visible and clear
- [ ] Timing feels natural (not rushed)
- [ ] Text overlays are readable at small sizes
- [ ] Link format is visible for 2+ seconds

**After Publishing:**
- Engagement: Likes, shares, comments
- Clicks: GitHub link traffic
- Installs: Extension download metrics
- Feedback: "This is exactly what I needed" comments

---

## 🔄 Iteration Ideas

After your first recording, consider:

1. **Timing Adjustments:** Did any part feel rushed? Too slow?
2. **Clarity:** Can viewers easily see what you're doing?
3. **Audio:** Is voiceover needed, or do actions speak for themselves?
4. **Length:** Can you trim to 20 seconds for Twitter? Or expand to 60 seconds for YouTube?

Save multiple versions:
- `demo-15s.gif` - Twitter optimized
- `demo-30s.gif` - GitHub README
- `demo-60s.mp4` - YouTube / DEV.to

---

## 💡 Pro Tips

1. **Practice First:** Do a few dry runs before recording
2. **Slow Down:** Actions that feel slow to you are perfect for viewers
3. **Pause More:** 1-2 second pauses after key actions are critical
4. **Keep Cursor Visible:** Ensure cursor doesn't disappear off-screen
5. **Show the Link:** The RangeLink format (with line numbers) should be clearly visible
6. **End Strong:** The closing frame with GitHub URL should linger 3-5 seconds
