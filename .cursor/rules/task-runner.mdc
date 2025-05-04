---
description: 
globs: 
alwaysApply: false
---
<!--
@description  Enforces folder structure, Tailwind-only styling and file-size limits for DeepWorkPostureAI.
@autoattach   chat
-->
# Task-runner rule (always loaded)

**When** the agent starts a new action  
**If** a file named `task.md` exists  
**Then**:
1. Read `task.md`.  
2. Find the next unchecked `- [ ]` item.  
3. Implement that task **only**.  
4. After successful code + tests, mark it `- [x]` and save.  
5. If no unchecked tasks remain, ask the user for new goals.

