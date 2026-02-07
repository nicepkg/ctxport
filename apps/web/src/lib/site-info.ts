// ---------- Basic Site Config ----------
export const siteConfig = {
  name: "ctxport",
  description:
    "AI Context Bundle for seamless context migration between AI tools.",
  url: "https://ctxport.xiaominglab.com",
  locale: "en_US",
};

// ---------- GitHub Config ----------
export const githubConfig = {
  username: "nicepkg",
  repo: "ctxport",
  get url() {
    return `https://github.com/${this.username}/${this.repo}`;
  },
  get docsBase() {
    return `${this.url}/tree/main/apps/web`;
  },
  get issuesUrl() {
    return `${this.url}/issues/new?labels=feedback,documentation&template=feedback.md`;
  },
};

// ---------- Author Config ----------
export const authorConfig = {
  name: "Jinming Yang",
  website: "https://github.com/2214962083",
  email: "2214962083@qq.com",
  github: `https://github.com/${githubConfig.username}`,
};

// ---------- Social Links Config ----------
// Set href to empty string "" to hide a social link
export const socialLinksConfig = {
  github: {
    label: "GitHub",
    href: `https://github.com/${githubConfig.username}`,
  },
  bilibili: {
    label: "Bilibili",
    href: "https://space.bilibili.com/83540912",
  },
  douyin: {
    label: "Douyin",
    href: "https://www.douyin.com/user/79841360454",
    handle: "葬爱非主流小明",
  },
  twitter: {
    label: "X (Twitter)",
    href: "https://x.com/jinmingyang666",
  },
};

// ---------- Footer Config ----------
export const footerConfig = {
  links: [
    {
      label: "Jinming Yang",
      href: authorConfig.website,
    },
    {
      label: githubConfig.username,
      href: authorConfig.github,
    },
    {
      label: "About Author",
      href: authorConfig.github,
    },
    {
      label: "Privacy",
      href: "/en/docs/privacy",
    },
    {
      label: "Terms",
      href: "/en/docs/terms",
    },
  ],
  copyright: {
    holder: siteConfig.name,
    license: "MIT",
  },
};

// ---------- Banner Config ----------
export const bannerConfig = {
  storageKey: `${siteConfig.name.toLowerCase().replace(/\s+/g, "-")}-banner`,
};
