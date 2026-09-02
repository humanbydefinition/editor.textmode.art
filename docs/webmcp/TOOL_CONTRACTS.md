# WebMCP tool contracts

The host document owns tool registration. The cross-origin runner receives only
explicit validation, inspection, and export requests over its existing
`MessageChannel` protocol.

| Tool | Result boundary |
| --- | --- |
| `textmode_get_editor_state` | Compact revision, trust, runner, and diagnostic state. |
| `textmode_read_sketch` | Accepted source only; 256–1,000 UTF-16 code units per page. |
| `textmode_inspect_artwork` | Runtime summary or a requested region of at most 64 cells. |
| `textmode_stage_sketch` | Syntax-valid inert full replacement proposal. |
| `textmode_list_examples` | Catalog metadata, never example source. |
| `textmode_stage_example` | An inert proposal sourced from an exact catalog ID. |
| `textmode_prepare_export` | An in-memory artifact; download remains a user click. |
| `textmode_prepare_share` | Opens share UI; copying remains a user click. |

All content-bearing results are marked `untrustedContentHint`. Expected failures
use a structured result envelope and normal results are capped at 1,500
serialized characters. `baseRevision` is required for every staged mutation.

There is deliberately no agent-callable accept, execute, download, clipboard,
or generic runner-method tool.
