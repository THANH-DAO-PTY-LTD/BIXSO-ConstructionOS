# BIXSO Construction OS

Run an outdoor or landscape construction job from first enquiry to handover: site survey, design quantities, quote, agreement, variations, work plan and sign-off. It is for small contractors who quote from a drawing and want the numbers and the paperwork to agree with each other.

- **Quantities from the drawing.** Draw lawn, beds, paving, decking, gravel or concrete as areas, place plants and elements, and get a Bill of Quantities with an indicative price range and GST.
- **An order list, not just a price.** Cubic metres of soil and road base, turf rolls, pavers and lineal metres of edging, with the usual waste allowance shown in each line.
- **No quote without a survey.** The job cannot move to design until the survey records access width, soil, slope, fall, drainage, a Before You Dig Australia reference, services, easements and at least one photo.
- **Variations price only the difference.** After agreement, a design change becomes a variation for the amount above what is already agreed, and the client approves it. The original agreement is kept.
- **Handover needs the work done.** Handover is blocked while tasks are open or decisions are pending, and only the client can accept it and complete the job.
- **Plant growth and site checks.** See plant spacing conflicts at mature size and elements that sit close to the boundary.

## Try it

Use Node.js 22 or later. There are no dependencies to install.

```sh
npm test
npm run demo
```

The demo follows a fictional rear-yard renovation from enquiry to completion, including a refused move, a variation and a blocked handover.

Run your own job from the command line. Projects are saved in `.construction-os/<id>.json` in the current folder.

```sh
node bin/constructionos.js new backyard --lot 14x12
node bin/constructionos.js advance backyard survey --as contractor
node bin/constructionos.js survey backyard --findings "Clay, falls to rear" --check access --set accessWidthM=1.1 --done
node bin/constructionos.js design backyard examples/design.json
node bin/constructionos.js estimate backyard
node bin/constructionos.js help
```

A design is a JSON array of blocks. See [examples/design.json](examples/design.json): `region` blocks are polygons in metres with a surface id, `plant` blocks name a species, and `template` blocks place an element.

## Catalogues and rates

Surfaces, plants and elements live in `src/catalogue/`. Rates are indicative Australian supply-and-install figures for the demo, GST-inclusive. Replace them with your own before you quote anyone. Every figure from the estimate is calculated from schematic geometry and must be confirmed on site and with suppliers.

## Limits of this preview

- One person, one computer. Projects are JSON files with no locking, sync or backup, and both roles are typed on the same machine.
- There is no drawing tool yet. Designs are edited as JSON.
- Site checks are concept prompts, not planning, building or pool-safety advice. Confirm local rules with the relevant authority.
- It records agreements and variations. It does not create contracts, take payments or issue tax invoices.

## Use it as a library

```js
import { computeBoQ, createProject, advance } from './src/index.js'
const boq = computeBoQ(blocks)
```

Project functions return a new project and leave the previous one unchanged.

## Help shape it

Open an [issue](https://github.com/THANH-DAO-PTY-LTD/BIXSO-Construction-OS/issues) if a rate, take-off rule or stage check does not match how you build. See [CONTRIBUTING](CONTRIBUTING.md) and the [security policy](SECURITY.md).

<!-- bixso-os-family:start -->
## BIXSO OS family

Small, local-first, MIT-licensed tools for running real work, each built from the rules of a BIXSO product.

| Project | What it does |
| --- | --- |
| [BIXSO Service OS](https://github.com/THANH-DAO-PTY-LTD/BIXSO-Service-OS) | Run a one-person service business: Company, Flow and Work in a local web app. |
| [BIXSO Sourcing OS](https://github.com/THANH-DAO-PTY-LTD/BIXSO-Sourcing-OS) | B2B sourcing workflows from RFQ to delivered order, with a receipt for every step. |
| [BIXSO Consulting OS](https://github.com/THANH-DAO-PTY-LTD/BIXSO-Consulting-OS) | An evidence-first record of a consulting engagement. |
| [BIXSO Construction OS](https://github.com/THANH-DAO-PTY-LTD/BIXSO-Construction-OS) (this project) | An outdoor or landscape job from site survey to handover. |
| [BIXSO Paperwork OS](https://github.com/THANH-DAO-PTY-LTD/BIXSO-Paperwork-OS) | One shared record of a paperwork matter between a client and their professionals. |
| [BIXSO Travel OS](https://github.com/THANH-DAO-PTY-LTD/BIXSO-Travel-OS) | Trip plans where every suggestion explains itself, plus traveller-host meetups. |
| [BIXSO Sport OS](https://github.com/THANH-DAO-PTY-LTD/BIXSO-Sport-OS) | Community pickup games with a fair waitlist, check-in and results. |
| [BIXSO Social OS](https://github.com/THANH-DAO-PTY-LTD/BIXSO-Social-OS) | Connections and a trust ledger that moves only on independent receipts. |
| [BIXSO Academy OS](https://github.com/THANH-DAO-PTY-LTD/BIXSO-Academy-OS) | Learning evidence where AI gives feedback and people verify. |

Release news, questions and ideas: [r/BIXSO](https://www.reddit.com/r/BIXSO/).

## Work with BIXSO

Want this set up for your business, or shaped around how your team actually works? BIXSO provides business workflow advisory and implementation. See [bixso.ai](https://bixso.ai).
<!-- bixso-os-family:end -->

## License

[MIT](LICENSE) · Copyright (c) 2026 Thanh Dao Pty Ltd. See [docs/PROVENANCE.md](docs/PROVENANCE.md).

The software is provided under the MIT license. Nothing in that license or in this repository excludes, restricts or modifies any right or remedy you have under the Australian Consumer Law, or any other law, that cannot lawfully be excluded.

BIXSO and the BIXSO logo are trademarks of Thanh Dao Pty Ltd. The MIT license covers the code, not the names or logo; see [TRADEMARKS.md](TRADEMARKS.md).
