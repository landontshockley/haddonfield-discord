# Haddonfield.gg Discord updates

Free, hosted news automation for the Haddonfield.gg Discord server.

- Monitors original posts from `@HalloweenTVG` and `@IllFonic`.
- Generates one deduplicated RSS feed with post text, X links, and media previews.
- Refreshes through GitHub Actions every 10 minutes, with no computer required.
- Publishes the feed through GitHub Pages for Readybot to deliver to `#updates`.

The feed generator uses the public FxTwitter compatibility API and does not store Discord or X credentials.
