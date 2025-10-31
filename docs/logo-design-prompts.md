# RangeLink Logo Design - AI Prompts

This document contains AI image generation prompts for creating the RangeLink logo/icon.

## Design Direction

**Mascot:** Free-range chicken (playful reference to "range" in RangeLink)
**Style:** Playful yet professional
**Color Scheme:** Orange (energy) with accents
**Format:** 128x128px icon suitable for VSCode Marketplace

---

## AI Prompts

### Option A: Playful Chicken with Chain Link (RECOMMENDED)

```
Modern minimalist logo design featuring a cheerful cartoon chicken wearing a golden chain necklace with a single prominent link. The chicken should be stylized and geometric, facing forward with confident posture. Color scheme: vibrant orange (#FF6B35) for the chicken, gold/yellow (#FFD23F) for the chain. Clean lines, flat design style suitable for a 128x128px icon. White or transparent background. Playful yet professional tech aesthetic.
```

**Why this works:**
- Memorable and distinctive mascot
- Clear visual metaphor (chain = link, free-range chicken = range)
- Playful but maintains professional quality
- Perfect conversation starter

---

### Option B: Free-Range Chicken with Code Bracket

```
Minimalist tech logo featuring a stylized orange chicken with geometric lines, incorporating a code bracket symbol [  ] or link symbol 🔗 subtly integrated into the design. Modern flat design, high contrast, suitable for small icon size (128x128px). Orange and white color scheme. Conveys both "free range" and "code linking" concepts.
```

**Why this works:**
- Balances playful mascot with technical elements
- Code bracket makes the developer audience clear
- Simpler than Option A, may scale better at small sizes

---

### Option C: Chicken + Deli Counter Badge (Hybrid Concept)

```
Playful logo combining a cheerful orange chicken with a vintage deli-style circular badge. The badge could contain "#L" or a link symbol. Retro-modern aesthetic, warm orange tones, cream/beige accents. Friendly and approachable feel while maintaining professional quality. 128x128px icon format.
```

**Why this works:**
- Incorporates the "deli" concept from BYODELI (Bring Your Own Delimiters)
- Vintage badge style adds charm
- Good for establishing brand personality

---

### Option D: Abstract Link + Feather (Subtle)

```
Abstract minimalist logo combining a chain link symbol with a stylized feather or wing motif. Geometric shapes, vibrant orange and dark gray. Modern tech aesthetic. Less literal than a full chicken, more suitable if you want sophistication over playfulness. 128x128px.
```

**Why this works:**
- More professional, less playful
- Abstract enough to work across contexts
- Feather subtly references chicken/bird without being cartoonish

---

## Logo Story (for Documentation)

Once the logo is finalized, use this story to explain it:

```markdown
## 🐔 Meet Range, the RangeLink Chicken

Range is our mascot—a free-range chicken who loves sharing code!

The chain around Range's neck represents the links that connect code across
editors and tools. Just like a free-range chicken roams freely, RangeLink
lets your code references roam freely across VSCode, Cursor, Claude Code,
Sublime Text, and beyond.

Why a chicken? Because RangeLink gives your code references free *range* 🐔✨
```

---

## Technical Specifications

### VSCode Marketplace Requirements

- **Icon:** 128x128px PNG (required)
- **Banner:** 960x90px (optional but recommended)
- **Format:** PNG with transparency preferred
- **File location:** `packages/rangelink-vscode-extension/icon.png`
- **Package.json entry:** `"icon": "icon.png"`

### Color Palette Recommendations

**Primary:**
- Orange: `#FF6B35` (energy, warmth, friendly)
- Dark Orange: `#E85D30` (for depth/shadows)

**Accent:**
- Gold/Yellow: `#FFD23F` (for chain/link)
- Green: `#4CAF50` (for "connected" elements, optional)

**Neutral:**
- Dark Gray: `#2C2C2C` (for text/outlines)
- White: `#FFFFFF` (for highlights/background)

### Design Guidelines

1. **Simplicity:** Icon must be recognizable at 16x16px (VSCode sidebar)
2. **High Contrast:** Ensure visibility in both light and dark themes
3. **Flat Design:** Avoid gradients or complex shadows for scalability
4. **Clear Silhouette:** Should be identifiable even in monochrome
5. **Professional Quality:** Playful but not unprofessional

---

## Generation Tools

### AI Image Generators
- **MidJourney** - Best quality, subscription required
- **DALL-E 3** - Good balance of quality and accessibility
- **Stable Diffusion** - Free, requires local setup or service
- **Ideogram** - Good for text/logo integration

### Design Tools (for refinement)
- **Figma** - Free, web-based vector editing
- **Inkscape** - Free, open-source vector editor
- **Adobe Illustrator** - Professional vector editor (paid)

### Quick Path to Icon
1. Generate initial concept with AI (use Option A prompt)
2. Import to Figma or Inkscape
3. Clean up lines and adjust colors
4. Export as 128x128px PNG with transparency
5. Test at various sizes (16px, 32px, 64px, 128px)

---

## Alternative Concepts (If Chicken Doesn't Work)

If the chicken mascot doesn't resonate, consider:

1. **Chain Link + Code Syntax**
   - Stylized chain link with `#L10-L20` integrated
   - Clean, professional, immediately communicates purpose

2. **Connected Nodes**
   - Abstract representation of linked code locations
   - Modern, tech-forward aesthetic

3. **Range Indicator**
   - Visual representation of a text range with selection brackets
   - Direct but may be too abstract

---

## Next Steps

1. Generate 2-3 variants using Option A prompt
2. Test icons at small sizes (16x16px minimum)
3. Gather feedback from target audience (developers)
4. Refine winning design
5. Export final assets (128x128 icon, optional 960x90 banner)
6. Update package.json and test in marketplace preview

---

## References

- [VSCode Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [Icon Design Best Practices](https://code.visualstudio.com/api/references/extension-manifest#icon)
- [Marketplace Publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
