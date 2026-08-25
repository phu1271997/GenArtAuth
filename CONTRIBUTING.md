# Contributing to GenArtAuth

Thanks for wanting to make GenArtAuth better. This project is a GenLayer Intelligent Contract plus a Next.js dApp; contributions can land in any of the three layers — contract, tests, or frontend.

## Quick start

```bash
git clone https://github.com/phu1271997/GenArtAuth.git
cd GenArtAuth

# Contract + tests
pip install genlayer-test
python3 -m pytest tests/ -v

# Frontend
cd frontend
npm install
npm run dev   # http://localhost:3000
```

Contract deployment target is **GenLayer Studionet** (`https://studio.genlayer.com`). See the deploy section of the README.

## Ground rules (read before opening a PR)

- **Do not touch the version pragma** on line 1 of `contracts/gen_art_auth.py` unless the Studio default template has bumped. Match whatever ships in Studio → New Contract.
- **Never invent a new nondet API**: every `gl.nondet.*` call must live inside `gl.eq_principle.*` or `gl.vm.run_nondet*`. See `~GEN_RULES/02-common-errors.md` Rule #7.
- **`str` keys everywhere on TreeMap**: even for internal-only maps. Refactoring an internal map into a public view later breaks the schema otherwise.
- **`bigint`/sized ints in storage**, never bare `int` — see R14.
- **Always `from genlayer import *`** — no alias imports (R13).
- **All new features need a test.** Add to `tests/test_gen_art_auth.py`, use `direct_vm.mock_web` + `direct_vm.mock_llm` for non-det branches (R17). Run `python3 -m pytest tests/ -q` before pushing.
- **Frontend must build with Turbopack**: `npm run build` locally before pushing. Fix ESLint warnings — CI does not tolerate them.
- **Reputation deltas are load-bearing**: any change to `_bump_score` or the `_award_*` helpers must update `docs/ECONOMICS.md` and the reputation tests.

## Development flow

1. Open an issue describing the change first if it is non-trivial. Small tweaks can go straight to a PR.
2. Branch off `main`. Prefix branch names with `feat/`, `fix/`, `docs/`, `chore/`.
3. Keep commits atomic. The commit message body should include a **Why** paragraph — the diff shows the *what*.
4. If you change contract storage or view signatures, redeploy to Studionet and update `NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS` on Vercel + the fallback in `frontend/src/config/contract.ts`.
5. Update `CHANGELOG.md` under an `Unreleased` heading (or the current milestone).

## Testing checklist

- [ ] `python3 -m pytest tests/ -q` — all pass.
- [ ] `cd frontend && npm run build` — no warnings, no errors.
- [ ] Manually smoke-test any UI change on `npm run dev` before pushing.
- [ ] For a contract change: deploy to Studionet, verify `Result: SUCCESS` on the deploy tx.
- [ ] For a new revert path: add a `pytest.raises` case.

## Filing a security issue

Do **not** open a public GitHub issue for a vulnerability. See `docs/SECURITY.md` for the disclosure channel.

## Code style

- Python: PEP 8, 4-space indent, no `type: ignore` unless justified by a comment.
- TypeScript / React: strict mode already on; no `any` in new code except at the SDK boundary. Extract inline types to interfaces if used in two places.
- Comments only where the *why* is non-obvious. No comments that just restate the code.

## Release cadence

The project publishes milestones roughly aligned with the GenLayer Contribution Portal windows. See `CHANGELOG.md` for the history and `docs/ARCHITECTURE.md` for the current shape.
