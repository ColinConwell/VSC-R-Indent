# Publishing RStudio Indent

This guide reflects registry documentation checked September 20, 2026. The repository is prepared as version **0.2.0**, but no listing has been created or uploaded. Metadata is not proof of publisher ownership or verification.

## Identity and Destinations

| Field | Release Candidate Value |
|---|---|
| Package | `rstudio-indent` |
| Display Name | RStudio Indent |
| Extension ID | `ColinConwell.rstudio-indent` |
| Developer | Colin Conwell |
| Public Contact | `colinconwell@gmail.com` |
| Additional Contact | `conwell@mit.edu` |
| Source and Issues | `https://github.com/ColinConwell/VSC-R-Indent` |
| License | GPL-3.0-only, with the existing GPL v3 license text |

Publish the same VSIX to **Visual Studio Marketplace** for VS Code and **Open VSX** for downstream editors. Positron's default P3M gallery serves the Open VSX catalog. Cursor uses its own marketplace proxy and security screening around Open VSX content, so an Open VSX publication does not guarantee immediate search visibility. Check public registry and catalog metadata in the browser after publishing. There is no separate Cursor/Positron package format required here. Sources: [Positron galleries](https://positron.posit.co/extensions.html), [Cursor extensions](https://prod.cursor.com/help/customization/extensions).

## Information and Access Colin Still Needs

- A Microsoft account with access to the Marketplace publisher **ColinConwell**, or creation of that publisher if available. The identifier must match the manifest; a matching GitHub username does not establish ownership.
- An Eclipse account linked through the Open VSX sign-in flow, acceptance of the Publisher Agreement, and access to the **ColinConwell** namespace. Request verified namespace ownership as appropriate. Complete account/contract steps yourself. [Open VSX publishing](https://github.com/eclipse-openvsx/openvsx/wiki/Publishing-Extensions)
- An authentication method for each registry. For the first Open VSX release, an access token is required; it is distinct from GitHub and Microsoft tokens. Microsoft allows a signed-in dashboard upload, so local first publication does not require putting a PAT into this repository.
- Confirmation that the existing R-derived icon may be redistributed, and that its source/license attribution is sufficient. No artwork ownership is inferred from the file being in Git. The existing license text is preserved; confirm the SPDX interpretation and contributions before release.
- Final acceptance of the release candidate's behavior in your manual test. The original manual script is unchanged and replayed automatically; broader RStudio parity is not established.
- Optional later: a personally controlled public domain for publisher verification. A Gmail/MIT email address or GitHub profile is not proof of DNS control. Verified badges are distinct from ordinary publication.

Do not paste tokens into an issue, commit, command argument, or chat. Use a password manager, registry login prompt, environment-injected secret, or trusted publishing. The extension itself needs no credentials, external services, R binary, or payment account.

## Prepare the Exact Release Artifact

1. Review the working-tree changes, commit the intended source/docs/lockfile, and run the GitHub Actions workflow. The workflow only builds/tests/uploads artifacts; it never publishes.
2. Run `npm ci`, `npm test`, `npm run test:performance`, and the container browser tests from [Testing](TESTING.md). Record browser and headless results in [Release Status](RELEASE-STATUS.md).
3. Confirm `package.json`, `package-lock.json`, changelog, contact information, license, README, and icon. Keep the same extension ID on both registries. If the publisher identifier is unavailable, update it consistently and rerun identity tests before creating either listing.
4. Run `npm run build:vsix`. Inspect `artifacts/rstudio-indent.vsix`; only compiled runtime code, manifest, README, changelog, license, and icon should ship. The package check rejects test/developer files and missing or wrongly cased imports.
5. Create a source tag matching the accepted version and a corresponding source release. GPL-covered source must remain available with distributed binaries. Confirm repository links resolve on the published branch before uploading the VSIX.
6. Keep a checksum of the accepted VSIX and upload that same file to both registries. Do not build two different artifacts under the same version. Replace the README's unpublished-candidate sentence when preparing the public release, before building the final artifact.

## Visual Studio Marketplace

Create or access the publisher at the [publisher management portal](https://marketplace.visualstudio.com/manage). For a first release, upload the reviewed VSIX using **New Extension → Visual Studio Code**. Inspect the resulting description, screenshots/icon, author, license, and compatibility metadata; verify the public listing and downloadable VSIX metadata. [Microsoft publication documentation](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

For CLI publication, the pinned `@vscode/vsce` supports publishing an already built file:

```sh
npx vsce publish --packagePath artifacts/rstudio-indent.vsix
```

That command publishes publicly; it is not a dry run. Authenticate first with the appropriate registry method. Legacy PAT setup uses Marketplace **Manage** scope and all-accessible-organizations, but Microsoft's current documentation says global Azure DevOps PATs retire **December 1, 2026**. Prefer the portal for initial manual upload and an identity-based setup for repeat releases. [Authentication changes](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#secure-automated-publishing-to-visual-studio-marketplace)

For GitHub Actions, current `vsce` documents `--oidc` with a Marketplace trusted publishing policy tied to the repository/workflow and `id-token: write`. Confirm the policy is available for your publisher, configure a protected release environment, then add a dedicated publication workflow. If unavailable, use Microsoft's documented Entra identity route (`--azure-credential`). Do not assume merely enabling Actions grants publisher access. [vsce trusted publishing](https://github.com/microsoft/vscode-vsce#trusted-publishing)

Microsoft's verified-publisher badge additionally requires an eligible domain and a track record; the documentation currently specifies six months for both extension publication and domain registration. It is not a prerequisite to publish. [Publisher verification](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#verify-a-publisher)

## Open VSX

Follow the registry account/agreement steps, create the namespace, and request ownership verification. With an Open VSX token injected as `OVSX_PAT` into the local shell, the currently checked CLI version is 1.2.0:

```sh
npx --yes ovsx@1.2.0 create-namespace ColinConwell
npx --yes ovsx@1.2.0 publish artifacts/rstudio-indent.vsix
```

Skip namespace creation if it already exists and you have authorized access. These commands change public registry state. Namespace creation and verified ownership are separate steps. After upload, check the version, README, source/license metadata, installation, and any registry scanning result. [Open VSX publishing steps](https://github.com/eclipse-openvsx/openvsx/wiki/Publishing-Extensions)

After at least one active release exists, configure Open VSX trusted publishing for the extension and release workflow. This requires namespace ownership and the Publisher Agreement. Subsequent Actions jobs can use `ovsx publish --trusted-publishing` with `id-token: write`; protect the configured environment because the registry registration itself is not restricted to one branch/tag. [Trusted publishing requirements](https://github.com/eclipse-openvsx/openvsx/wiki/Trusted-Publishing)

## Cursor, Positron, and Follow-Up Releases

Inspect the public registry/catalog endpoints in a browser and confirm the published version. Do not launch native clients to verify discovery under the current testing policy. Cursor's proxy screening and organization settings can delay/block availability. Positron can also use a custom organizational gallery. If a listing is absent, distinguish registry publication from client distribution before republishing or changing identity.

Cursor has a separate optional verification process: a website on your own domain linking the Open VSX listing, a corresponding homepage in the listing, consistent IDs across marketplaces, and a request in its verification forum. The present GitHub homepage is sufficient metadata for an ordinary release, but does not meet that optional website requirement. [Cursor verification](https://prod.cursor.com/help/customization/extensions#how-do-i-get-my-extension-verified)

For each update, increment the version, document behavior changes, rerun the release checks, and publish the identical artifact to both registries. Keep the older source tag and VSIX available. If a release regresses, publish a higher patch version containing the repair; do not assume an existing version can be overwritten. Users of the old local `ColinConwell.vsc-r-indent` prototype need to disable/remove that extension themselves before installing the new ID. Keep `rIndent.*` settings compatible.
