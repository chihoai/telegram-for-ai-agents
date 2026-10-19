# Replace the Chiho OpenAI package

The OpenAI package name is the registered app identity, not the companion
Claude plugin name. Download the currently published release ZIP from the
existing Chiho AI listing before building an update. Never upload a preview
package as a replacement for that listing.

```sh
node scripts/build-chiho-openai-replacement.mjs \
  --published-zip=/absolute/path/to/published-release.zip \
  --output=/absolute/path/to/new-package \
  --version=2.0.3 \
  --icon=/absolute/path/to/chiho-logo.svg
```

This preserves the registered listing name, branding, assets and existing
skills, and updates the CRM skill for the stable production MCP endpoint. It
preserves the published package's MCP declarations and server names. The
legacy published ZIP has no MCP declaration because its connection is managed
in the portal. Adding a declaration is rejected as adding or replacing a server,
even when the URL matches. Public submission rejects the
`.app.json` mapping used by installed OpenAI packages, so the builder removes
it. Supply the existing square Chiho logo if the downloaded ZIP lacks one. It does not update the Claude
package, its marketplace release, or any user's OAuth configuration.

ZIP the contents of the new directory, including hidden files. Keep the
backend source SHA, immutable image digest, contract digest and actual
staging/production qualification evidence in a separate release record.
Never include credentials or private customer evidence in the ZIP.

The generated skill requires `https://api.chiho.ai/mcp` and explicit
`chiho.crm.extended` consent for new tools. Verify that the existing portal
registration uses this exact URL. A package with an existing server declaration
must already use this URL; the builder refuses versioned endpoint migrations.
A URL declaration alone does not establish the portal's resulting configuration. OpenAI's current documented
flow requires Support for an existing MCP URL change. A legacy review form
can retain a different submitted URL from the published configuration shown
in the new management page. Verify both before replacement, and verify the
replacement's actual MCP URL and authenticated scan before submitting.

Only one package review can be active. Prepare and qualify the complete
replacement first, then cancel the old review and upload the new version.
Cancellation leaves the published version live. If the portal cannot change
the pending MCP target, keep the replacement as a draft and request the
supported endpoint change; do not create a duplicate listing or redirect
the published endpoint to work around it.

Scanner authentication and tool approval are separate checks. Reconnect the
scanner when required, confirm a fresh scan on the intended resource, and
inspect each held tool. Source annotation changes or a successful scan do
not establish approval. Profile metadata helps a client identify its OAuth
connection; the customer's interactive chat and existing scheduled task
still need verification after publication.

Official procedure: https://developers.openai.com/plugins/deploy/submission

## Unofficial Telegram application

Use `--product=unofficial-telegram` with the existing application ZIP. This
preserves `app-6ab152391f98819183a9b12b90771477`, its icon and listing copy,
and declares one remote MCP in `.mcp.json`, reusing the existing app's OAuth
configuration without an authentication override. Omitting the declaration
causes the current portal to classify this unpublished application as skills-only.
The separate Chiho AI package behavior above remains unchanged.

The default target is the stable `https://telegram-mcp.chiho.ai/mcp` endpoint,
whose catalog exposes separate message-action operations and `get_profile`.
An upload cannot migrate an existing registration: the portal rejects a URL
that differs from its current server, and the connection form's URL is read-only.
Request the registered URL change from OpenAI support before uploading the
stable-target package. Do not overwrite or redirect the pinned v2 service.

For the application registered to v2, explicitly pass
`--registered-resource=https://telegram-mcp.chiho.ai/mcp/v2`. After the v2
backend repair is deployed, both resources expose profile discovery and the
same independently named message-operation tools. They share one instruction
template with the exact selected resource inserted at build time. The obsolete
generic-dispatch skill is removed. Only the two known Unofficial Telegram
resources are accepted; arbitrary hosts or another product's resource are
rejected. An instruction update must follow its matching backend deployment.

```sh
node scripts/build-chiho-openai-replacement.mjs \
  --product=unofficial-telegram \
  --published-zip=/absolute/path/to/existing-telegram-draft.zip \
  --registered-resource=https://telegram-mcp.chiho.ai/mcp/v2 \
  --output=/absolute/path/to/telegram-package \
  --version=1.2.0
```

After support migrates the registration, build an incremented stable package
without the v2 override, reconnect with explicit consent, and verify a fresh
authenticated stable scan. Inspect the four generic list-tool review holds
separately; correct packaging and endpoint discovery do not constitute approval.
