# ForgeOS Diagram Export Pack

Presentation-ready diagrams for the ForgeOS README, technical reviews, and stakeholder decks.

## Palette

| Role | Color | Use |
|---|---|---|
| Navy | `#0f172a` | Text and technical labels |
| Platform blue | `#dbeafe` / `#2563eb` | Product and system layers |
| Evaluator teal | `#ccfbf1` / `#0f766e` | Truth-model and adapter paths |
| Evidence green | `#dcfce7` / `#166534` | Validated or accepted states |
| Gate amber | `#ffedd5` / `#ea580c` | Roadmap gates and decision points |
| Risk coral | `#fee2e2` / `#dc2626` | Failure and caution states |

## Contents

- `src/01_system_architecture.mmd` - platform architecture
- `src/02_core_loop_lifecycle.mmd` - evaluation lifecycle sequence
- `src/03_phase_acceptance_gates.mmd` - staged acceptance path
- `src/04_industry_fit.mmd` - target-industry visual
- `src/05_investor_value_chain.mmd` - stakeholder value chain
- `svg/` - scalable exports for documents and slides
- `png/` - raster exports for presentation tools

## Regenerate SVG and PNG files

The source files are standard Mermaid. With Node.js available, run:

```bash
npx --yes @mermaid-js/mermaid-cli \
  -i docs/diagram-export-pack/src/01_system_architecture.mmd \
  -o docs/diagram-export-pack/svg/01_system_architecture.svg

npx --yes @mermaid-js/mermaid-cli \
  -i docs/diagram-export-pack/src/01_system_architecture.mmd \
  -o docs/diagram-export-pack/png/01_system_architecture.png \
  -b transparent
```

Repeat for the remaining files in `src/`. SVG is preferred for slide decks and print because it stays sharp at any size; PNG is useful for tools that do not accept SVG.

## Presentation guidance

- Use architecture and lifecycle diagrams for technical audiences.
- Use the value-chain diagram for executive or investor conversations.
- Use the acceptance-gates diagram when explaining why roadmap claims are staged.
- Keep the legend and phase status visible when exporting individual diagrams.
- Treat industry-fit values as illustrative communication aids until pilot evidence exists.