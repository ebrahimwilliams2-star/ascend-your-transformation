# Ascendant Evolution System (XP-Driven)

This PR adds design and implementation scaffolding for the Ascendant Evolution System, which uses the user's total XP as the single source of truth to drive progressive visual changes to the Ascendant character.

## Summary

Redesign the Ascendant progression system so the character’s appearance is directly driven by the user’s total XP. The Ascendant should visually represent the person the user is becoming — every XP point contributes to an earned visual evolution.

## What this PR adds

- Initial feature spec and documentation (see ISSUE-9.md)
- XP to stage mapping helper (src/utils/xpStage.ts)
- UI component scaffold for RankScreen (src/components/Ascendant/RankScreen.tsx)
- Placeholder animation hooks (src/components/Ascendant/animationHooks.ts)
- PR template and QA checklist

## Notes

- This PR does not change the existing XP calculation — it reads total XP from the existing system.
- XP thresholds are configurable via the exported XP_THRESHOLDS constant in src/utils/xpStage.ts

Closes #9
