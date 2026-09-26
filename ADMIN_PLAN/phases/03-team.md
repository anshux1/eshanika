# 03 Team and invitations

**Goal:** owners manage who can use the admin.

## Build

- Apply the Phase 03 items in `../schema-changes.md` (email invitations).
- `team.members.list`, `team.members.update` (role, suspend, restore).
- `team.invitations.list`, `create`, `revoke`, `resend`, and `accept`.
- Invitation tokens: random, stored only as a hash, single use, expire after 7 days. Send the link by email. The raw link is also shown once to the owner.
- `/invite/[token]`: the invitee signs up or signs in (email or Google) with the invited email. Accepting creates or updates `User.role = admin` and the `AdminMembership` in one transaction.

## Rules

- The last active owner cannot be demoted or suspended.
- Accepting fails when the signed-in email does not match, or when the invitation is expired, revoked, or already used.
- Every change is audited.

## Done when

- An owner invites an email as editor. The invitee accepts and sees editor navigation.
- Suspending that editor kicks them out on their next request.
- Expired, revoked, and reused links each show a clear message.
