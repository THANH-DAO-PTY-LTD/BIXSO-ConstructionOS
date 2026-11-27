# BIXSO ConstructionOS

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

Open an [issue](https://github.com/THANH-DAO-PTY-LTD/BIXSO-ConstructionOS/issues) if a rate, take-off rule or stage check does not match how you build. See [CONTRIBUTING](CONTRIBUTING.md) and the [security policy](SECURITY.md).

## License

[MIT](LICENSE) · Copyright (c) 2026 Thanh Dao Pty Ltd. See [docs/PROVENANCE.md](docs/PROVENANCE.md).

The software is provided under the MIT license. Nothing in that license or in this repository excludes, restricts or modifies any right or remedy you have under the Australian Consumer Law, or any other law, that cannot lawfully be excluded.
