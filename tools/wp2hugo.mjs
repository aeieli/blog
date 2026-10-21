// 一次性迁移脚本：WordPress 导出的 posts.json → Hugo content/
// 用法：NODE_PATH=<含 turndown 的 node_modules> node tools/wp2hugo.mjs posts.json content
// posts.json 由 mariadb json_arrayagg 从 wp_posts 导出（已发布的 post/page，含分类与标签）
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(process.env.NODE_PATH + "/");
const TurndownService = require("turndown");
const { gfm } = require("turndown-plugin-gfm");

const [, , input, outDir] = process.argv;
const posts = JSON.parse(fs.readFileSync(input, "utf8"));

const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-", hr: "---" });
td.use(gfm);
// WP 的 <pre> 里常常不包 <code>，turndown 默认会当普通段落处理
td.addRule("bare-pre", {
  filter: (node) => node.nodeName === "PRE",
  replacement: (_c, node) => {
    const text = node.textContent.replace(/\n+$/, "");
    const fence = text.includes("```") ? "~~~" : "```";
    return `\n\n${fence}\n${text}\n${fence}\n\n`;
  },
});

const BLOCK = /^<\/?(p|h[1-6]|ul|ol|li|pre|blockquote|table|thead|tbody|tr|td|th|hr|div|figure|!--)/i;

// 简化版 wpautop：经典编辑器的正文靠空行分段、单换行即 <br>
function autop(html) {
  const saved = [];
  html = html.replace(/<pre[\s\S]*?<\/pre>/gi, (m) => `\u0000${saved.push(m) - 1}\u0000`);
  html = html
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((chunk) => {
      chunk = chunk.trim();
      if (!chunk || BLOCK.test(chunk) || /^\u0000\d+\u0000$/.test(chunk)) return chunk;
      return `<p>${chunk.replace(/\n/g, "<br>\n")}</p>`;
    })
    .join("\n\n");
  return html.replace(/\u0000(\d+)\u0000/g, (_m, i) => saved[i]);
}

function clean(html) {
  return html
    .replace(/\[caption[^\]]*\]([\s\S]*?)\[\/caption\]/g, "$1")
    .replace(/<!--\s*\/?wp:[\s\S]*?-->/g, "")
    .replace(/https?:\/\/(www\.)?aeieli\.com\/wp-content\//g, "/wp-content/");
}

const yaml = (v) => JSON.stringify(v); // JSON 字符串是合法 YAML 标量

fs.mkdirSync(path.join(outDir, "posts"), { recursive: true });
for (const p of posts) {
  const slug = decodeURIComponent(p.slug);
  const [d] = p.date.split(" ");
  const [y, m, day] = d.split("-");
  const url = p.type === "post" ? `/${y}/${m}/${day}/${slug}/` : `/${slug}/`;
  const body = td.turndown(autop(clean(p.content))).trim();

  const fm = [
    "---",
    `title: ${yaml(p.title)}`,
    `date: ${p.date.replace(" ", "T")}+09:00`,
    `lastmod: ${p.modified.replace(" ", "T")}+09:00`,
    `url: ${yaml(url)}`,
  ];
  if (p.cats?.length) fm.push(`categories: ${yaml(p.cats)}`);
  if (p.tags?.length) fm.push(`tags: ${yaml(p.tags)}`);
  if (p.excerpt) fm.push(`summary: ${yaml(p.excerpt)}`);
  fm.push(`wp_id: ${p.id}`, "---", "");

  const file = p.type === "post" ? path.join(outDir, "posts", `${d}-${p.id}.md`) : path.join(outDir, `page-${p.id}.md`);
  fs.writeFileSync(file, fm.join("\n") + "\n" + body + "\n");
}
console.log(`wrote ${posts.length} files`);
