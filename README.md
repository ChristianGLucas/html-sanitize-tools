# html-sanitize-tools

Composable [Axiom](https://axiomide.com) nodes for sanitizing untrusted HTML/SVG
markup — built for the Axiom marketplace.

This is the **security-sanitization** counterpart to
[html-tools](https://github.com/ChristianGLucas/html-tools) (which parses and
*extracts* structured data from HTML). This package instead cleans untrusted
markup down to a safe subset — the two are natural flow-neighbors: sanitize
first, then extract, or vice versa. Both use a plain `html` string field for
the document, so a `SanitizeHtml` output pipes directly into an
`html-tools` node's input.

Thin, honest wrappers around two independent, mature, permissively-licensed
libraries, each running **headless — no real browser, offline, deterministic**:

- **[DOMPurify](https://github.com/cure53/DOMPurify)** (dual-licensed
  `MPL-2.0 OR Apache-2.0` — consumed here under **Apache-2.0**), run over a
  fresh, throwaway [jsdom](https://github.com/jsdom/jsdom) (MIT) window per
  call. DOM-based, understands SVG and MathML namespaces, and carries
  DOMPurify's DOM-clobbering defenses.
- **[sanitize-html](https://github.com/apostrophecms/sanitize-html)** (MIT) —
  a pure Node/htmlparser2-based sanitizer with **no DOM or jsdom dependency at
  all**, for callers who don't want jsdom's footprint or who want a second,
  independently-implemented engine to cross-check against.

The full transitive dependency tree of both engines (jsdom's CSS/HTML parsing
stack, htmlparser2, everything) was verified permissive end to end — MIT,
BSD-2/3-Clause, ISC, Apache-2.0, MIT-0, CC0-1.0, and BlueOak-1.0.0 only. No
GPL/LGPL/AGPL/MPL-only dependency anywhere in the tree.

## Use it from your agent or app

Every node in this package is a **live, auto-scaling API endpoint** on the
[Axiom](https://axiomide.com) marketplace — call it from an AI agent or your own
code, with nothing to self-host.

**📦 See it on the marketplace:**
https://dev.axiomide.com/marketplace/christiangeorgelucas/html-sanitize-tools@0.1.0

**Hook it up to an AI agent (MCP).** Add Axiom's hosted MCP server to any MCP
client and every node becomes a typed tool your agent can call — search the
catalog, inspect a schema, and invoke it directly.

```bash
# Claude Code
claude mcp add --transport http axiom https://api.axiomide.com/mcp \
  --header "Authorization: Bearer $AXIOM_API_KEY"
```

Claude Desktop, Cursor, or any config-based client:

```json
{
  "mcpServers": {
    "axiom": {
      "type": "http",
      "url": "https://api.axiomide.com/mcp",
      "headers": { "Authorization": "Bearer YOUR_AXIOM_API_KEY" }
    }
  }
}
```

**Call it from the CLI.**

```bash
axiom invoke christiangeorgelucas/html-sanitize-tools/SanitizeHtml --input '{ ... }'
```

**Call it over HTTP.**

```bash
curl -X POST https://api.axiomide.com/invocations/v1/nodes/christiangeorgelucas/html-sanitize-tools/0.1.0/SanitizeHtml \
  -H "Authorization: Bearer $AXIOM_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{ ... }'
```

> Input/output schema for each node is on the marketplace page above, or via
> `axiom inspect node christiangeorgelucas/html-sanitize-tools/SanitizeHtml`.

### Get started free

Install the CLI:

```bash
# macOS / Linux — Homebrew
brew install axiomide/tap/axiom

# macOS / Linux — install script
curl -fsSL https://raw.githubusercontent.com/AxiomIDE/axiom-releases/main/install.sh | sh
```

**Windows:** download the `windows/amd64` `.zip` from the
[releases page](https://github.com/AxiomIDE/axiom-releases/releases), unzip it,
and put `axiom.exe` on your `PATH`.

Then `axiom version` to verify, `axiom login` (GitHub or Google) to authenticate,
and create an API key under **Console → API Keys**. Docs and sign-up at
**[axiomide.com](https://axiomide.com)**.

## Nodes

| Node | Input → Output | What it does |
|------|----------------|--------------|
| **SanitizeHtml** | `SanitizeQuery → SanitizeResult` | Sanitize HTML/SVG/MathML via DOMPurify. Strips `<script>`/event-handler attributes/`javascript:` URLs/anything outside the allow-list; returns cleaned markup + a report of everything removed. |
| **SanitizeHtmlLite** | `SanitizeQuery → SanitizeResult` | The same contract via sanitize-html — pure Node, no jsdom. Does not support SVG/MathML/whole-document mode (structured error if requested). |
| **AuditHtml** | `AuditQuery → AuditResult` | Report-only: what sanitizing this HTML *would* remove, via DOMPurify, without ever returning modified markup — for pipelines that gate/flag on safety rather than silently accepting altered content. |
| **ValidateAttribute** | `AttributeQuery → AttributeResult` | Check whether a single tag/attribute/value triple would survive DOMPurify's default rules, without sanitizing a whole document. |

`SanitizeQuery` carries a configurable allow-list (tags, attributes, URI
schemes, SVG/MathML toggles, forbid-lists, whole-document mode); `Report`
lists every removed element/attribute plus a `was_modified` flag.

## Security notes

- **Bounded input.** Every node rejects input over 2 MiB on the raw string,
  before any parsing — malformed/oversized input returns a structured error,
  never a crash.
- **No network, no script execution.** jsdom windows are constructed with no
  external resource loading; nothing in this package fetches a URL.
- **Two independently-implemented engines**, each verified against a table of
  OWASP-style XSS vectors (script tags, event handlers, `javascript:`/`data:`
  URLs, SVG/SMIL-based vectors) with hand-written safety-property assertions —
  not sanitizer-vs-sanitizer comparison.
- **Real, documented differences between the two engines' defaults** (e.g.
  sanitize-html's default allow-list excludes `<img>`; DOMPurify's does not)
  are intentional — each engine's own vetted defaults are used as-is rather
  than reconciled into a false equivalence.
- **`style` attribute content is NOT CSS-sanitized by SanitizeHtml.**
  DOMPurify keeps a kept tag's `style` attribute verbatim (it doesn't parse
  CSS), so e.g. `background:url(javascript:alert(1))` inside a `style` value
  passes through unmodified. This is not exploitable in any current browser —
  `javascript:` URLs inside CSS `url()` were a browser bug that no shipping
  browser has had in well over a decade — but if you don't trust the CSS
  itself (e.g. exfiltration-via-attribute-selector concerns), pass
  `forbid_attributes: ["style"]`. SanitizeHtmlLite (sanitize-html) instead
  strips the whole `style` attribute by default — a real, intentional
  difference between the two engines' defaults, not a bug in either one.

## License

MIT. See [LICENSE](LICENSE).
