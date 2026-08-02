# Dashboard Navigation Redesign: 5-Icon Symmetrical Layout

## Goal
Reshape the bottom navigation so it has **5 symmetrical touchpoints** with **Ethan AI anchored in the centre**, while keeping both DMs and GymBros reachable from a single combined location.

## Current State
- `AppShell.tsx` renders 5 route links + a centre Ethan button across a 6-column grid.
- Order today: **Dash | Lift | [Ethan] | Form | DMs | Bros**
- Routes `/messages` and `/gymbros` already exist and work.

## Proposed Change

### 1. Unified Social Hub (`/social`)
Create a new route `src/routes/social.tsx` that hosts a tabbed screen:
- **Tab 1 — GymBros:** existing friend list, search, requests, leaderboard.
- **Tab 2 — DMs:** existing conversation list.
- A top tab switcher lets the user jump between the two surfaces without leaving the screen.
- Keep `/messages/:conversationId` route intact so DM deep-links still work.

### 2. Bottom Nav Update (`src/components/AppShell.tsx`)
Reduce nav items to four side icons so the centre Ethan button creates a balanced 5-icon row:
```text
[ Dash ] [ Lift ] [ Ethan ] [ Social ] [ Form ]
```
- Update `navItems` to: Dash, Lift, Social, Form.
- Change grid from `grid-cols-6` to `grid-cols-5`.
- Render: `navItems.slice(0,2)` | Ethan | `navItems.slice(2)`.
- Social icon: `Users` (or a combined icon if a suitable one is available).
- Active state for Social matches `/social`, `/messages`, `/gymbros`, and `/messages/:id`.

### 3. Routing Adjustments
- Add `src/routes/social.tsx` to the route tree.
- Redirect `/gymbros` and `/messages` to `/social` (or keep them as aliases that render the same component) so old bookmarks and in-app links still land in the right place.

### 4. UI/UX Details
- Preserve the existing floating Ethan centre button styling (red circle, ring, glow).
- Social tab bar uses the existing brand tokens (`brand-red` active, `brand-silver` inactive).
- No backend changes required; this is a frontend navigation restructure.

## Acceptance Criteria
- Bottom nav shows exactly 5 icons: Dash, Lift, Ethan, Social, Form.
- Tapping Social opens a screen with GymBros and DMs tabs.
- DM deep links (`/messages/:conversationId`) still open the conversation.
- Active highlighting works correctly for all five nav positions.
- No visual overlap or safe-area issues on mobile.
