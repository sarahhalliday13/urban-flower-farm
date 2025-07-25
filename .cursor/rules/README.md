# 🧠 Cursor Rules for BUFF

This folder contains rule files that guide Cursor's behavior while coding in this project. These rules ensure consistency across development, testing, styling, and Git workflows.

## 📄 Main Rule File

### `buff-dev-standards.mdc`
This is the primary rule file used by Cursor. It enforces:

- Folder and file structure
- Required testing for all components and screens
- Style and design token usage
- Git and branching discipline (no commits to `main`)
- Cursor usage expectations

These rules apply automatically to all files in `src/**/*`.

## 📚 Reference Docs

For deeper system guardrails (like order logic, admin refactors, email flows), see:
```
docs/ai-guidelines/
```
Those files provide domain-specific constraints Cursor should follow but **are not general rules**.

## ✏️ Updating Rules

- To update the main rules, edit `buff-dev-standards.mdc`
- If you create new Cursor rules for specific file types or workflows, add them here with `.mdc` extension
- Avoid duplicating logic between `.mdc` rules and `/docs/ai-guidelines`

---

Cursor is here to help, not to micromanage. Build with intention 🌼
