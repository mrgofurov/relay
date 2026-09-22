# RELAY — PREMIUM UI/UX REDESIGN

You are a senior product designer and frontend engineer specializing in premium developer tools, collaboration platforms, and modern SaaS products.

You are working on the existing RELAY project.

The current UI looks too AI-generated / generic SaaS:
- excessive purple/blue accents
- too many badges and pill-shaped controls
- excessive borders
- too many rounded cards
- overly decorative elements
- generic dashboard appearance
- visual hierarchy is weak
- some UI elements look like they were generated from a template rather than designed as a real product

Your task is to completely redesign the visual language of RELAY while preserving all existing functionality and behavior.

IMPORTANT:
This is a UI/UX redesign, NOT a feature rewrite.

Do not remove existing functionality.
Do not break existing interactions.
Do not change business logic unless absolutely required for the UI.
Do not create fake features just for visual purposes.

---

# 1. DESIGN DIRECTION

Relay should feel like a serious premium developer/productivity tool.

The visual direction should be inspired by products such as:

- Linear
- Vercel
- Raycast
- Arc
- Stripe Dashboard
- GitHub's modern UI
- modern developer tools

BUT DO NOT COPY any of these products directly.

Create an original Relay identity.

The core design principles:

1. Minimal
2. Premium
3. Professional
4. Calm
5. Extremely readable
6. High information density without feeling crowded
7. Strong typography
8. Excellent spacing
9. Subtle visual hierarchy
10. Black/white first
11. Accent colors only when functionally necessary

Relay should NOT look colorful.

---

# 2. COLOR SYSTEM

Move away from the current purple-heavy visual system.

Use a predominantly monochrome palette.

Primary colors:

- Background: near-black / black
- Surface: very dark gray
- Elevated surface: slightly lighter dark gray
- Borders: subtle neutral gray
- Primary text: white / near-white
- Secondary text: neutral gray
- Muted text: darker neutral gray

For example, use a system approximately around:

Dark theme:

background:
#09090B

surface:
#0F0F12

surface-elevated:
#151518

border:
#232326

border-subtle:
#1A1A1D

primary-text:
#FAFAFA

secondary-text:
#A1A1AA

muted-text:
#71717A

white:
#FFFFFF

Light theme, if the application supports it:

background:
#FFFFFF

surface:
#FAFAFA

surface-elevated:
#F4F4F5

border:
#E4E4E7

primary-text:
#18181B

secondary-text:
#52525B

muted-text:
#71717A

IMPORTANT:

Do not blindly use these exact values everywhere.

Build a coherent design token system.

---

# 3. ACCENT COLOR

Relay should NOT have a permanent bright purple identity.

Use a very restrained accent.

The accent should primarily communicate:

- active state
- selected item
- primary CTA
- focus
- important status

The accent should occupy a very small percentage of the interface.

Avoid:
- large purple backgrounds
- purple cards
- purple gradients
- glowing purple effects
- excessive blue/purple icons
- colorful badges everywhere

The interface should still look premium if the accent color is removed completely.

---

# 4. REMOVE "AI-GENERATED UI" CHARACTERISTICS

Aggressively reduce the following patterns:

- excessive rounded cards
- excessive pill buttons
- excessive badges
- unnecessary gradients
- glowing effects
- decorative sparkles
- oversized icons
- random colored labels
- large empty cards
- excessive shadows
- unnecessary borders around every component
- huge rounded containers
- generic dashboard widgets
- unnecessary visual decoration

Do not make every component look like a floating card.

Use the page itself as the primary surface.

Prefer:

text + spacing + subtle separators

instead of:

card + border + shadow + badge + icon

---

# 5. BORDER RADIUS

Use restrained corner radii.

Do NOT make every element heavily rounded.

Recommended:

- buttons: 6–8px
- inputs: 6–8px
- dropdowns: 6–8px
- dialogs: 10–12px
- major surfaces: 8–12px

Avoid:
- 20px+
- 9999px pill shapes unless semantically necessary

Pills should be used only for statuses or compact filters where they actually improve usability.

---

# 6. TYPOGRAPHY

Typography should become one of the main design elements.

Use a clean modern UI font such as:

Inter

or the existing project's equivalent system font if already configured.

Typography should have clear hierarchy.

Examples:

Page title:
18–22px
font-weight: 600

Section title:
14–16px
font-weight: 600

Body:
13–14px

Secondary:
12–13px

Do not make everything bold.

Use font-weight and spacing to create hierarchy rather than boxes and colors.

Avoid oversized headings.

Relay is a productivity/developer application, not a marketing website.

---

# 7. MAIN APPLICATION LAYOUT

Redesign the current three-column layout carefully.

The general structure can remain:

LEFT:
Workspace / navigation

CENTER:
Rooms / threads

RIGHT:
Active conversation

But the visual treatment should become much more refined.

The layout should feel like a professional desktop application.

---

## LEFT SIDEBAR

Current problems:

- too much empty space
- too many visual separators
- generic project list
- AI agents feel like random items
- bottom profile section feels disconnected

Redesign it.

Structure:

Workspace header
↓
Search
↓
Projects / Rooms
↓
AI Agents
↓
Flexible empty space
↓
User / workspace settings

Use subtle separators only where necessary.

Workspace header should be compact and elegant.

Example:

[ R ] Relay
    ● Online

Do not make the logo huge.

---

## SEARCH

The search bar should look like a native application command/search field.

It should be:

- compact
- monochrome
- subtle
- easy to scan

Keyboard shortcut indicator can remain, but make it understated.

Example:

Search...
⌘ K

Do not make the search box visually dominant.

---

# 8. PROJECTS & ROOMS

Make this section much easier to understand.

Instead of:

PROJECTS & ROOMS
+
No projects yet

Use a cleaner hierarchy.

Example:

PROJECTS

+ New project

No projects yet

Then:

ROOMS

or whatever terminology is already used by the application.

The important thing is that users immediately understand:

- where they are
- what is a project
- what is a room
- what is a thread

Do not rely on decorative icons to communicate hierarchy.

---

# 9. AI AGENTS

AI agents are an important part of Relay.

They should feel like real connected participants, not colored tags.

Current:

@claude-code    [Claude]
@gemini-cli     [Gemini]

Redesign this to feel more like a participant list.

Example:

AI AGENTS

● @claude-code
  Claude

● @gemini-cli
  Gemini

Use very subtle provider identification.

Do NOT use large colored provider badges.

Online/offline status should use a small dot.

---

# 10. CENTER PANEL

The center panel currently contains:

#Select Room
Thread-first channel
+ New Thread

Discussion: Manual
All / Open / Done

This hierarchy should be simplified.

The top should clearly communicate:

ROOM NAME
small contextual description

Then a simple primary action:

+ New thread

Filters should be understated.

Instead of large colorful segmented controls, use:

All    Open    Done

with a very subtle active state.

No giant pills.

---

# 11. THREAD LIST

Thread cards should NOT look like dashboard cards.

Use a clean list.

Each thread should have:

- title
- short preview
- author/agent
- timestamp
- status
- optional metadata

Use spacing and subtle separators.

Hover state:

slightly lighter background

Selected state:

subtle neutral background + very thin accent indicator

Avoid bright colored selected cards.

---

# 12. RIGHT CONVERSATION PANEL

The conversation panel should be the most important area.

It should feel similar to a premium developer chat/workspace.

Header:

Thread title
status
participants
small actions

Conversation:

Messages should have excellent spacing.

Do NOT place every message inside a large rounded card.

Prefer a natural message stream.

For agent messages:

Agent name
timestamp
message

For user messages:

User name
timestamp
message

Use subtle background differentiation only when needed.

---

# 13. MESSAGE DESIGN

Messages should feel like real collaboration, not chatbot bubbles.

Avoid:

huge rounded bubbles
bright backgrounds
gradient bubbles
excessive avatars

Instead use:

NAME
timestamp

Message content

This is especially important because Relay is a multi-agent collaboration environment.

AI agents should feel like team members participating in a shared workspace.

---

# 14. EMPTY STATES

Current:

large centered icon
"No Thread Selected"

This feels generic.

Redesign empty states to be minimal and useful.

Example:

No thread selected

Select a thread to view the discussion,
or create a new thread to start collaborating.

[ + New thread ]

Use a very subtle icon if needed.

Do not use giant decorative icons.

---

# 15. BUTTONS

Primary buttons:

- black/white depending on theme
- strong contrast
- compact
- 6–8px radius

Dark theme example:

white background
black text

Secondary:

transparent / dark surface
subtle border

Danger:

only use red when something is actually destructive.

Do not use colorful buttons just to make the interface look interesting.

---

# 16. ICONS

Use one consistent icon system.

Prefer:

Lucide

or the project's existing icon library.

Icons should generally be:

16px

Sometimes:

14px or 18px

Avoid oversized icons.

Avoid icons that exist only for decoration.

Every icon should communicate something.

---

# 17. LOGIN PAGE — COMPLETE REDESIGN

The login page must receive the same premium design treatment.

It should NOT look like a generic AI startup landing page.

Avoid:

- purple gradients
- colorful backgrounds
- giant logos
- decorative blobs
- glassmorphism
- excessive shadows
- unnecessary illustrations

Instead create a very clean premium authentication page.

Possible direction:

FULL SCREEN

dark monochrome background

CENTERED AUTH CONTAINER

Relay logo
Welcome back

Sign in to your workspace

Email
Password

[ Sign in ]

Forgot password

Optional authentication methods if they already exist.

The form should be compact and extremely clean.

Example hierarchy:

Relay

Welcome back
Sign in to continue to Relay

Email
[________________]

Password
[________________]

[ Sign in ]

Don't have an account?
Create account

Use subtle separators and excellent spacing.

---

# 18. LOGIN PAGE BRANDING

Create a simple Relay identity.

Logo should be:

- monochrome
- geometric
- minimal
- recognizable
- usable at small sizes

Do NOT create an overly complicated AI logo.

The Relay brand should work in:

- black
- white
- favicon
- sidebar
- login page
- mobile

---

# 19. RESPONSIVENESS

The redesign must work across:

- desktop
- laptop
- tablet
- mobile

Do not simply shrink the desktop UI.

On smaller screens:

- collapse sidebars appropriately
- use drawers/sheets
- maintain clear navigation
- preserve conversation readability
- keep primary actions accessible

---

# 20. DARK MODE

Dark mode is the primary experience.

It should feel intentionally designed, not just:

"black background + white text".

Use multiple neutral surface levels:

Background
↓
Sidebar
↓
Surface
↓
Elevated surface

But keep differences subtle.

Avoid pure #000 everywhere.

Use near-black values.

---

# 21. LIGHT MODE

If the application already supports light mode, redesign it consistently.

Do not create a completely different visual language.

Light mode should use:

white
off-white
light gray
dark text
subtle borders

No unnecessary colors.

---

# 22. SPACING SYSTEM

Use a consistent spacing scale.

Prefer approximately:

4
8
12
16
20
24
32

Avoid random margins.

The UI should feel mathematically aligned.

Pay particular attention to:

- sidebar spacing
- section spacing
- message spacing
- button spacing
- input spacing
- header heights

---

# 23. INFORMATION HIERARCHY

At every screen ask:

"What is the most important thing the user needs to understand here?"

Use this order:

1. Context
2. Primary content
3. Primary action
4. Secondary information
5. Metadata

Do not make secondary UI compete with the primary content.

---

# 24. PREMIUM FEEL

Premium does NOT mean adding more visual effects.

Premium should come from:

- typography
- spacing
- alignment
- restraint
- consistency
- interaction quality
- subtle transitions
- excellent empty states
- predictable behavior

Use animations only when they communicate state.

Recommended transition duration:

120–180ms

Avoid excessive animation.

---

# 25. ACCESSIBILITY

Ensure:

- sufficient contrast
- visible focus states
- keyboard navigation
- readable font sizes
- accessible buttons
- meaningful aria labels where necessary

Do not sacrifice usability for aesthetics.

---

# 26. DO NOT CHANGE THE PRODUCT'S INFORMATION ARCHITECTURE UNNECESSARILY

The current application already has concepts such as:

- Projects
- Rooms
- Threads
- AI Agents
- Discussions
- Open / Done states

Keep these concepts unless there is a strong UX reason to change terminology.

The goal is to make the existing product easier to understand, not redesign the product's business model.

---

# 27. IMPLEMENTATION RULES

Before changing the UI:

1. Inspect the existing codebase.
2. Identify the current component architecture.
3. Identify the existing design system.
4. Identify reusable components.
5. Identify all existing pages.
6. Identify the login/authentication flow.
7. Identify all existing states and interactions.

Then redesign the UI systematically.

Do not create duplicate components unnecessarily.

Create reusable design primitives where appropriate:

- Button
- Input
- Select
- Dropdown
- Dialog
- Tooltip
- Badge
- Avatar
- Sidebar item
- Thread item
- Message
- Empty state
- Status indicator

Use the project's existing component library if one already exists.

---

# 28. IMPORTANT: DO NOT OVERDESIGN

This is critical.

When you are unsure whether an element needs visual decoration:

REMOVE IT.

When you are unsure whether a border is necessary:

REMOVE IT.

When you are unsure whether a color is necessary:

USE NEUTRAL.

When you are unsure whether something should be a card:

USE A SIMPLE LIST OR SECTION.

When you are unsure whether an icon is necessary:

REMOVE IT.

The final UI should feel intentionally designed rather than visually busy.

---

# 29. FINAL QUALITY BAR

After implementation, review every screen and ask:

- Does this look like a serious production application?
- Does it look like an AI-generated template?
- Is there unnecessary color?
- Are there too many rounded elements?
- Are there too many borders?
- Are there too many badges?
- Is the hierarchy immediately understandable?
- Can I understand the page within 2 seconds?
- Does the UI feel calm?
- Does the typography feel premium?
- Does the interface remain usable with no accent colors?
- Does the login page feel like the same product?
- Do all screens feel like they belong to the same design system?

If any component looks like a generic AI-generated SaaS component, redesign it.

---

# 30. MOST IMPORTANT VISUAL TARGET

The final Relay interface should communicate:

"Professional developer collaboration tool."

NOT:

"AI-generated SaaS dashboard."

The visual ratio should roughly feel like:

90% monochrome
10% functional accent

rather than a colorful application.

Prioritize:

BLACK
WHITE
GRAY
TYPOGRAPHY
SPACING
CONTENT

over:

COLORS
GRADIENTS
CARDS
BADGES
DECORATION

Keep the interface visually quiet, precise, premium, and highly usable.

Now inspect the existing Relay application and implement this redesign across the entire UI, including the login/authentication experience, while preserving all existing functionality.