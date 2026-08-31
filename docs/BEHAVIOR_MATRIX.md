# Heroes II behavior matrix

Status is deliberately conservative: “candidate” means the behavior should be
tested, not that the original has been conclusively established.

| Area | Reference behavior / candidate invariant | Evidence | Confidence | Deterministic acceptance test |
|---|---|---|---|---|
| Adventure routing | A destination route is distinct from progressive hero movement; turning has its own animation state. | fheroes2 `heroes_move.cpp`; original capture still required for click-confirm semantics | Medium | Plan a multi-step route, assert no teleport, assert facing follows each step, and snapshot route markers before execution. |
| Adventure movement | Land mobility depends in part on the slowest army creature and surface; movement points reset rather than carrying leftovers. | fheroes2 `heroes.cpp` comments/logic; corroborate with original manual | Medium | Fixed armies/surfaces yield stable budgets; ending day resets to computed maximum. |
| Battle occupancy | Reachable destinations must respect occupied cells and creature speed. | fheroes2 `battle_cell.cpp` (`GetReachable`) | High for oracle, medium for original | Given blockers and speed N, assert only unoccupied cells with cost ≤ N are returned. |
| Battle melee | Melee requires a reachable adjacent attack position. | fheroes2 battle position/reachability organization; genre observation | Medium | A non-adjacent melee click moves or is rejected; adjacency permits attack. |
| Retaliation | A surviving eligible defender retaliates; a destroyed or disabled defender does not. | fheroes2 `battle_troop.cpp` explicitly branches on destruction and disabling effects | High for core condition | Attack twice in one round: verify one normal retaliation maximum; lethal first strike yields none. Confirm exceptions separately. |
| Ranged attack | Shooter resolves damage without entering the target cell; projectile origin/impact are animation metadata. | Requested original behavior; visual capture pending | Low | Shooter and target coordinates remain occupied; projectile completes before hit/death state. |
| Wait | Waiting defers a stack's action rather than consuming its ability to act this round. | Campaign requirement; original source/manual confirmation pending | Low | Wait removes current stack from normal queue and returns it in a deterministic late phase exactly once. |
| Defend | Defend consumes the action and provides a real defensive effect until the next activation/round boundary. | Campaign requirement; magnitude pending | Low | Same seeded attack causes no more damage to defending stack than control; modifier expires at documented boundary. |
| Damage / deaths | Stack count derives from remaining aggregate HP; death is terminal and never returns to idle. | fheroes2 battle model plus observable UI requirement | Medium | Seeded damage crosses HP boundary, decrements count, removes zero-count stack, and locks death animation terminal frame. |
| Initiative | The visible queue and actual activation order must agree and be deterministic for equal state. | Campaign requirement; tie-breaking evidence pending | Low | Fixed stacks produce repeatable order; each living stack acts at most once before next round except explicit extra-turn effects. |
| Victory persistence | Battle casualties/results update the adventure army after leaving battle. | fheroes2 `heroes_action.cpp` result application; campaign requirement | Medium | Complete seeded battle, return to map, assert surviving stack counts equal battle result. |
| Recruitment | Recruitment is limited by dwelling availability and resources, and updates army/resources atomically. | Original-style town model; exact prices/growth pending decomp/manual check | Low | Reject over-capacity/unaffordable purchase without partial mutation; valid purchase subtracts exact cost and stock. |
| Daily economy | End day restores movement and applies owned income once. | Current campaign requirement; original constants pending | Medium concept / low values | Calling end-day once increments date/income once; repeated UI events cannot double-pay. |
| Weekly growth | Dwelling population changes at the verified week boundary, not every day. | Campaign requirement; original values pending | Medium concept / low values | Days 1–7 show no premature weekly increment; boundary applies one configured growth. |
| Save/load | Persisted state round-trips army, resources, date, hero/map objects, and town stock. | Product requirement, not original-format evidence | High as web requirement | Serialize, mutate, reload, and deep-compare canonical gameplay state. |

## Unresolved observations blocking high confidence

- Whether the DOS original requires a second destination click in every movement context.
- Exact terrain/road movement costs and diagonal accounting by edition.
- Speed tie-breaks, wait phase ordering, defend magnitude, and retaliation exceptions.
- Knight dwelling growth, recruitment prices, starting income, and week transition timing.
- Native animation frame sequences, durations, anchors, projectile points, and terminal death frames.
