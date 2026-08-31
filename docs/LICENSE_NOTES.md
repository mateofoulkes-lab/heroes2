# License and reuse notes

Checked 2026-08-31 through each repository's license file and GitHub repository
metadata. This is an engineering ledger, not legal advice.

| Repository / material | Detected terms | Decision for this project |
|---|---|---|
| [ihhub/fheroes2](https://github.com/ihhub/fheroes2/blob/master/LICENSE) | GPL-2.0 | Behavioral oracle only. Do not paste or translate its implementation. Independently implement concepts and cite factual observations. |
| [sushi-shi/homm2-decomp](https://github.com/sushi-shi/homm2-decomp/blob/master/LICENSE) | CC0-1.0 for repository material | May verify constants/states. Preserve attribution in the research ledger despite CC0; do not assume the license grants rights to separately required original game resources. |
| [Carter54git web port](https://github.com/Carter54git/fheroes-1.1.17-ported-to-web/blob/main/LICENSE) | GPL-2.0 | Deployment oracle only; no copied implementation. Its README says users must provide their own game data. |
| [HeroWO Core](https://github.com/HeroWO-js/Core/blob/master/LICENSE.txt) | Unlicense | Architectural study is allowed, but Heroes III rules/assets remain out of scope. If code is ever reused, record exact file and commit first. |
| [mwardrop/HOMM3Clone](https://github.com/mwardrop/HOMM3Clone) | No license detected by GitHub API; no root license found | All rights reserved by default: ideas can prompt independent design, but no source or assets may be copied. |
| [The Spriters Resource sheets](https://www.spriters-resource.com/ms_dos/heroesofmightandmagicii/) | Original game art; site listing is not a software license | Existing local derivatives are retained under the owner's stated authorization for this private experiment. Do not infer redistribution rights. Track each derivative in `docs/ASSET_SOURCES.md`. |
| fheroes2 README screenshots | Contained in a GPL repository, but underlying original art may have separate rights | Link as comparison metadata; do not vendor during this round. |

## Clean-room rule

Research notes may describe observable inputs, outputs, constants, and state
transitions. Builders should implement from those notes without keeping oracle
source open and without copying expression, comments, tables, or large literal
sequences. Any future reuse must record source repository, exact revision, file,
license compatibility analysis, attribution, and generated/bundled artifacts.

## Runtime rule

No external reference is loaded by the game. New art/audio must be placed in the
repository, have an entry in the asset source ledger, and have documented owner
authorization or a compatible license. A URL alone is not sufficient permission.
