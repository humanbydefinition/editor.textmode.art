# WebMCP security design

The browser agent and every tool input are untrusted. Sketch code, gallery
content, cell data, runtime diagnostics, and filenames are also untrusted when
returned to an agent. Tool metadata is static and never incorporates that
content.

The editor host remains the authority for accepted source, local persistence,
sharing, and browser downloads. Sketch execution remains in the existing
cross-origin sandbox; the iframe is not granted a `tools` permission and no
generic evaluation protocol is exposed. Incoming share payloads retain their
execution lock, which removes mutating tools and gates calls that race with
registration.

Validation is repeated in implementation rather than relying on JSON Schema.
Source, summaries, regions, artifacts, and filenames have hard limits. Prepared
exports are retained in memory for at most five minutes; their object URL is
revoked on replacement, close, expiry, and application disposal.
