#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";

const sources = [
  ["HalloweenTVG", "Halloween: The Game", "🎃 Halloween: The Game — New Post"],
  ["IllFonic", "IllFonic", "🔪 IllFonic — New Post"],
];

const xmlEscape = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const htmlEscape = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const cdata = (value) => String(value).replaceAll("]]>", "]]]]><![CDATA[>");

async function fetchPosts(handle) {
  const response = await fetch(
    `https://api.fxtwitter.com/2/profile/${handle}/statuses?count=30`,
    { headers: { "user-agent": "Haddonfield.gg feed generator/1.0" } },
  );
  if (!response.ok) throw new Error(`Could not load @${handle}: HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.code !== 200 || !Array.isArray(payload.results)) {
    throw new Error(`Unexpected response while loading @${handle}`);
  }
  return payload.results;
}

function firstImage(post) {
  const media = post.media || {};
  if (media.photos?.length) return media.photos[0].url;
  if (media.videos?.length) return media.videos[0].thumbnail_url;
  return null;
}

function rssItem({ post, displayName, heading }) {
  const handle = post.author.screen_name;
  const link = `https://x.com/${handle}/status/${post.id}`;
  const text = htmlEscape(post.text || "Post contains media.").replaceAll("\n", "<br>");
  let description = `<strong>${htmlEscape(displayName)} (@${htmlEscape(handle)})</strong><br><br>`
    + `${text}<br><br>🔗 <a href="${htmlEscape(link)}">View on X</a>`;
  const image = firstImage(post);
  let mediaTags = "";
  if (image) {
    description += `<br><br><img src="${htmlEscape(image)}">`;
    mediaTags = `<enclosure url="${xmlEscape(image)}" type="image/jpeg"/>`
      + `<media:thumbnail url="${xmlEscape(image)}"/>`;
  }
  return `<item>`
    + `<title>${xmlEscape(heading)}</title>`
    + `<link>${xmlEscape(link)}</link>`
    + `<guid isPermaLink="true">${xmlEscape(link)}</guid>`
    + `<pubDate>${new Date(Number(post.created_timestamp) * 1000).toUTCString()}</pubDate>`
    + `<dc:creator>@${xmlEscape(handle)}</dc:creator>`
    + `<description><![CDATA[${cdata(description)}]]></description>`
    + mediaTags
    + `</item>`;
}

async function buildFeed() {
  const timelines = await Promise.all(sources.map(([handle]) => fetchPosts(handle)));
  const unique = new Map();

  sources.forEach(([handle, displayName, heading], index) => {
    for (const post of timelines[index]) {
      if (post.type !== "status") continue;
      if (String(post.author?.screen_name || "").toLowerCase() !== handle.toLowerCase()) continue;
      if (post.replying_to) continue;
      if (!unique.has(String(post.id))) unique.set(String(post.id), { post, displayName, heading });
    }
  });

  const items = [...unique.values()]
    .sort((a, b) => Number(b.post.created_timestamp) - Number(a.post.created_timestamp))
    .slice(0, 50)
    .map(rssItem)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" `
    + `xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">`
    + `<channel><title>Haddonfield.gg X Updates</title>`
    + `<link>https://x.com/HalloweenTVG</link>`
    + `<description>New original posts from Halloween: The Game and IllFonic.</description>`
    + `<language>en-us</language><ttl>10</ttl>${items}</channel></rss>\n`;
}

await mkdir("docs", { recursive: true });
await writeFile("docs/feed.xml", await buildFeed(), "utf8");
