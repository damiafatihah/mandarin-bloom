# 学海 Xuéhǎi — design system

> Source of truth for UI work. Mode: **Operate** (app UI). The brief (blue, Chinese ink-wash look from the reference screenshot) wins over generic taste rules.

## Product design

### 2.1 Name and idea
**学海 Xuéhǎi**, "sea of learning", from 学海无涯 ("the sea of learning has no shore"). It fits the blue and water theme and the goal of improving without end. One visual thread runs through the app: **ink mist above, water below, a red seal for every day completed.**

### 2.2 What makes it right for someone who already speaks Mandarin
| Pain point for a speaker who wants to improve | Feature that targets it |
|---|---|
| Too many "easy" words waste time | Each word card starts as **hanzi only**. "I know it" skips it and refills from the next most frequent word. "Teach me" reveals it and adds it to reviews. Skipping 10 or more in a day suggests raising the level. |
| Speaks well but tones are shaky when reading | A **tone quiz**: the same syllables with different tones (yóu yù vs yòu yǔ). Wrong options are generated from the word's own syllables. |
| Mixes up near-homophones | A **listening quiz** whose wrong options sound almost the same (进 jìn vs 金 jīn). Identical-sounding words are left out so it stays fair. |
| Measure words get fuzzy | A **measure word quiz**: 一 ＿ 书 → 本. |
| Reading vocabulary lags behind speaking | Daily words are ordered by **frequency** inside the chosen HSK levels, so the most useful gaps come first. |
| Forgets new words | **Spaced repetition** with boxes at 1, 2, 4, 7, 15, 30 and 60 days. Words missed in any quiz are added to reviews automatically. |

### 2.3 Screens and navigation
Routes (React Router, `BrowserRouter`):

| Route | Screen | Purpose |
|---|---|---|
| `/welcome` | Welcome (3 steps) | Brand → words per day → levels. Saves settings. |
| `/` | Today 今日 | Today's word cards, daily challenge panel, review count, seal calendar. |
| `/challenge` | Daily challenge 每日挑战 | 10 mixed questions, the same set all day, ending with a seal stamp. |
| `/practice` | Practice 练习 | Choose source (due / my levels / all my words), question type and length. |
| `/dictionary` | Dictionary 词典 | Search by hanzi, pinyin (with or without tones) or English. |
| `/word/:hanzi` | Word page | Big hanzi, toned pinyin, audio, meanings, measure words, other readings, character breakdown, "Add to reviews". |
| `/me` | Me 我 | Stats, settings (words per day, levels, tone colours, voice speed), reset, credits. |

Navigation uses **one hanzi per tab inside a circle, with no icon library**: 今 Today · 战 Challenge · 练 Practice · 典 Dictionary · 我 Me. The **active tab's hanzi turns into a red seal**.

### 2.4 Layout per breakpoint ("adjusting the size right")
| Width | Navigation | Today layout | Notes |
|---|---|---|---|
| < 768px (phone) | Fixed bottom tab bar, `env(safe-area-inset-bottom)` padding | Word cards in a horizontal **swipe carousel** (`scroll-snap`, card width `min(82vw, 340px)`), then challenge panel, review, seal calendar | Tap targets ≥ 44px, inputs ≥ 16px (no iOS zoom), `100dvh`, `viewport-fit=cover` |
| 768–1023px (tablet) | Bottom tab bar | Word cards in an auto-fill grid (`minmax(260px,1fr)`) | |
| ≥ 1024px (laptop) | Sticky **left rail** (232px) with brush wordmark 学海 | 2 columns: word grid on the left, sticky 340px aside on the right (challenge, review, calendar) | Content max 1180px |

Big hanzi always fit their card: cards use `container-type: inline-size`, and the hanzi size is `min(var(--han-xl), calc(80cqi / var(--len)))`, so 一帆风顺 shrinks and 书 stays huge.

Wireframes:

```
PHONE · Today                          LAPTOP · Today
┌──────────────────────────┐           ┌─────────┬──────────────────────────────┬──────────────┐
│ 11月8日星期日   [seal] 3  │           │ 学海     │ 11月8日星期日                   │ ┌──────────┐ │
│ 今日 Today's words        │           │          │ 今日 Today's words              │ │每日挑战    │ │
│ ┌──────────┐ ┌───        │           │ (今)Today│ ┌──────┐┌──────┐┌──────┐      │ │Daily      │ │
│ │HSK 5 ~mist~│ │          │           │ (战)     │ │ 犹豫 ││ 经济 ││ 环境 │      │ │challenge ▶│ │
│ │   犹豫     │ │  ← swipe │           │ (练)     │ └──────┘└──────┘└──────┘      │ │~~~waves~~~│ │
│ │   (spk)    │ │          │           │ (典)     │ ┌──────┐┌──────┐              │ └──────────┘ │
│ │[I know it] │ │          │           │ (我)     │ │ ...  ││ ...  │              │ Review · 6   │
│ │[Teach me ] │ │          │           │          │ └──────┘└──────┘              │ seal grid    │
│ └──────────┘ └───        │           └─────────┴──────────────────────────────┴──────────────┘
│ ┌──────────────────────┐ │
│ │每日挑战 Daily challenge│ │  deep-lake panel, white text, wave band
│ │10 questions…      (▶)│ │
│ └──────────────────────┘ │
│ Review · 6 due  [Review] │
│ [印][印][ 9][印][11]...   │  seal calendar, last 14 days
├──────────────────────────┤
│ (今)  战   练   典   我    │  active tab = red seal
└──────────────────────────┘

PHONE · Challenge question
┌──────────────────────────┐
│ ▬▬▬▬━━━━─────── (progress)│
│ Which tones are right?   │  serif italic instruction
│          犹豫             │  huge Noto Serif SC
│ ┌─────────┐┌─────────┐   │
│ │ yòu yǔ  ││ yóu yù  │   │  2×2 choice tiles (1 column for English meanings)
│ └─────────┘└─────────┘   │
│ ┌─────────┐┌─────────┐   │
│ │ yǒu yú  ││ yóu yū  │   │
│ └─────────┘└─────────┘   │
│ 对了! Correct             │
│ 犹豫 · yóu yù · hesitate (›)│  round next button
└──────────────────────────┘
```

### 2.5 Visual system (put this in `DESIGN.md` in Task 4.1)
**Palette** (taken from the reference; text colours meet WCAG AA on white and sky):

| Token | Hex | Use |
|---|---|---|
| `--sky` | `#dcedfa` | Page ground, quiet buttons |
| `--sky-deep` | `#c4ddf0` | Hover, inactive dots |
| `--paper` | `#ffffff` | Cards |
| `--mist` | `#c8d8e6` | Ink-wash clouds |
| `--ink` | `#12161b` | Headings, body |
| `--ink-2` | `#46525e` | Secondary text |
| `--lake` | `#3aa3bb` | Decorative water and waves, progress (not for text) |
| `--lake-deep` | `#1d6f86` | Primary buttons, challenge panel, correct answers (white text on it passes AA) |
| `--lake-ink` | `#0f4757` | Primary hover |
| `--cinnabar` | `#c0392b` | Seals, wrong answers, active tab |
| `--gold` | `#e0a33a` | Rare highlight (streak number only) |
| Tones 1–5 | `#c0392b` `#a8650a` `#237a48` `#2a5ea8` `#6b7785` | Pinyin colouring (toggle in settings) |

**Typography** (self-hosted with Fontsource so it works offline in the PWA):
- `Josefin Sans` 400/700: headings (letter-spacing 0.02em, as in the reference) and body text.
- `Cormorant Garamond` 500 italic / 600: dates, instructions and the motto. These are small "classical" voices, as in the reference captions.
- `Noto Serif SC` 400/600: **every hanzi a learner must read**. Song-style shapes show correct strokes.
- `Zhi Mang Xing` 400: decoration only (the brush wordmark 学海, seals, the vertical poem). Never used for words being studied, because brush fonts distort strokes.
- Fluid type scale built with `clamp()`. See tokens in Task 4.2.

**Motifs:**
- `InkMist`: an SVG of blurred ellipses pushed through `feTurbulence` displacement, plus a pale sun disc. It sits at the top of cards.
- `Waves`: three stacked wave lines (海水纹) at the bottom of the challenge panel.
- `Seal`: a red rounded square with a white inset border and brush glyph, rotated −4°. It is used for the streak, the calendar, the active tab and the challenge result (with a stamp animation).
- No emoji, gradients, glassmorphism or icon-topped feature cards.

**Motion** (transform and opacity only, with a `prefers-reduced-motion` fallback):
- The seal **stamps** when a challenge finishes: scale 1.6→0.94→1 with rotation.
- Wrong answers shake for 300ms. Choices fade to 45% once answered.
- Pagination dots stretch to show the active step.

---


### Browser surfaces
- `::selection` uses `--lake-deep` with white text, `caret-color: var(--lake-deep)`, scrollbars `--sky-deep` on `--sky`.
- Focus ring: 3px `--lake-deep`, offset 3px.

### Character set
Simplified Chinese only. Traditional forms are never displayed.
