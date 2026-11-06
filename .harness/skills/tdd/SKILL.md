---
name: tdd
description: Write the failing test first. Use when implementing or fixing behavior. Do not use for text or visual tweaks.
---
## Steps
1. Write a test for the behavior and run it: it must fail for the right reason.
2. Write the smallest code that passes.
3. Run with `run_tests_for(path)`.
4. Refactor only with the test green. Bug fix: the test reproduces the bug first.
