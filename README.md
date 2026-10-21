# 洞悉码码家 · www.aeieli.com

Hugo 静态博客，主题 [PaperMod](https://github.com/adityatelange/hugo-PaperMod)（git submodule）。2026-10-21 从 WordPress 迁移而来，评论未迁移。

## 写文章

在 `content/posts/` 新建 Markdown：

```markdown
---
title: "标题"
date: 2026-10-21T12:00:00+09:00
categories: ["服务器技术"]
tags: ["docker"]
---

正文……
```

新文章不必写 `url`，默认生成 `/posts/<文件名>/`。迁移来的旧文章都用 `url` 固定了原 WordPress 地址（`/年/月/日/slug/`），**不要改**，否则外链和搜索引擎收录会失效。

## 本地预览 / 构建

```bash
git clone --recursive git@github.com:aeieli/blog.git   # 已 clone 的：git submodule update --init
podman run --rm --userns=keep-id --entrypoint hugo -v $PWD:/project:Z -w /project -p 1313:1313 \
  ghcr.io/gohugoio/hugo:v0.168.0 server --bind 0.0.0.0     # 预览 http://localhost:1313
podman run --rm --userns=keep-id --entrypoint hugo -v $PWD:/project:Z -w /project \
  ghcr.io/gohugoio/hugo:v0.168.0 --minify --gc             # 产物在 public/
```

## 目录

- `content/posts/` 文章；`content/categories/*/_index.md` 把分类固定到旧地址 `/category/<slug>/`
- `static/wp-content/uploads/` 沿用的旧上传文件（站点图标）
- `tools/wp2hugo.mjs` 一次性迁移脚本，留档备查
