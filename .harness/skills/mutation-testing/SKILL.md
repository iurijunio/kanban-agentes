---
name: mutation-testing
description: Prove that new tests catch broken code by mutating the target. Use after new tests pass, on impact changes.
---
## Inputs required
Target file and functions, test files. Missing: BLOCKED: <what>.

## Steps
1. Copy the target to a temp folder and note its hash. Never use `git checkout` or `git restore`: uncommitted work may be the change under test.
2. Apply 3 to 6 plausible mistakes, one at a time: `<` to `<=`, flipped sign, `min` to `max`, removed special case (`inf`, empty, zero), wrong order, forgotten factor.
3. For each one: mutate, run the tests, restore.
4. At the end restore the copy, confirm the hash, run the tests once more: they must pass.

## Output
Table: mutation | caught? | by which test. For each one not caught, the missing test (input and expected output). End with: file restored, hash matches, tests green.
