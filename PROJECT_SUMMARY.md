# Project Summary

Expense Splitter is a full-stack expense-sharing app (Splitwise-style) built with
React/TypeScript, Node/Express and Prisma/SQLite, covering groups, multi-payer
expenses, four split types, recurring bills, and a debt-simplification engine
that collapses many-to-many IOUs into a minimal set of settle-up payments. The
main engineering challenge was correctness with money: every amount is stored
and computed as integer cents, and a largest-remainder allocator with a
deterministic tie-break guarantees splits always sum exactly to the total,
verified with property-based tests across thousands of randomized groups and
expenses.

**Technical highlights:**

- Designed a pure, framework-free money module (rounding, split calculation,
  greedy debt simplification) decoupled from the HTTP/DB layers, enabling
  fast unit and property-based tests (fast-check) independent of a database.
- Built a layered backend (routes → controllers → services → Prisma) with
  zod validation on every request and a single consistent error shape across
  ~30 REST endpoints.
- Implemented an idempotent recurring-billing job (node-cron) driven by an
  injectable clock, so "runs twice in the same tick" and time-dependent
  logic are fully unit-testable without waiting on real time.
- Modeled money edits as an audit trail (soft delete + revision snapshots)
  rather than mutating history in place, so balances stay reconstructable
  and every change is attributable.
- Shipped a React client with a live, client-side split preview that mirrors
  the server's exact rounding algorithm, giving users an accurate picture of
  per-member amounts before they submit.
