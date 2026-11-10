# ReaUI Designer plugin

Generate and revise editable `.reaui` design files from UI page requests. The
plugin includes the ReaUI MCP server and CLI runtime, so it does not fetch npm
packages on startup. Node.js 22.18+ is required.

The MCP server uses its launch working directory as its design workspace. Pass
relative paths to its tools. It validates designs before packaging and can
render a standalone `preview.html` for inspection.

The `reaui-design` skill contains the design workflow, protocol summary,
templates, and repair guide. `reaui://protocol` is the authoritative full
contract for the bundled runtime.
