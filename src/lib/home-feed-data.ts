/**
 * Home feed shapes and static defaults. When backend endpoints are ready,
 * implement fetchHomeFeed() against your API and return the same shapes.
 */

export type FeedMode = "live" | "trending";
export type Platform = "tiktok" | "x";
export type BannerLogo = "tiktok" | "x" | "youtube" | "instagram" | "telegram" | "reddit";

export type HomeFeedTickerItem = {
  actor: string;
  side: string;
  amount: string;
  proposal: string;
};

export type HomeFeedTrendItem = {
  id: string;
  symbol: string;
  subtitle: string;
  title: string;
  slug: string;
  platform: Platform;
  creator: string;
  followers: string;
  badges: string[];
  age: string;
  price: string;
  volume: string;
  ath: string;
  drawdown: string;
  drawdownPositive?: boolean;
  thumbLabel: string;
  thumbClassName: string;
};

export type HomeFeedData = {
  tickers: HomeFeedTickerItem[];
  trends: HomeFeedTrendItem[];
  bannerSlots: readonly {
    className: string;
    size: "lg" | "md" | "sm";
    tilt: string;
  }[];
  bannerFrames: BannerLogo[][];
  bannerLogoOptions: BannerLogo[];
  bannerStars: readonly {
    left: string;
    top: string;
    size: "sm" | "md" | "lg";
    delay: string;
  }[];
};

export const DEFAULT_HOME_FEED: HomeFeedData = {
  tickers: [
    { actor: "Aor..dqe", side: "VOTED", amount: "YES", proposal: "#12" },
    { actor: "4x4..MfP", side: "VOTED", amount: "NO", proposal: "#9" },
    { actor: "2tg..UvY", side: "CREATED", amount: "NEW", proposal: "#15" },
  ],
  trends: [
    {
      id: "bankroll",
      symbol: "BANKROLL",
      subtitle: "Got A Lotta Zeroes",
      title: "The Bankroll Dance has become TikTok's new viral reaction template",
      slug: "Dufz..pump",
      platform: "tiktok",
      creator: "@highlandcows_radranch_tn",
      followers: "4.3K followers",
      badges: ["EN", "JP"],
      age: "11h",
      price: "$2.85K",
      volume: "$64K",
      ath: "$30K",
      drawdown: "-40.75%",
      thumbLabel: "BANK",
      thumbClassName: "from-[#17ff52] via-[#8eea52] to-[#ffe15c]",
    },
    {
      id: "secret",
      symbol: "Secret",
      subtitle: "The Secret To A Long Life",
      title: "People are sharing their secrets to a long life on Twitter",
      slug: "FJn2..pump",
      platform: "x",
      creator: "@DailyTurkic",
      followers: "85.4K followers",
      badges: ["G7", "OC"],
      age: "13h",
      price: "$18.64K",
      volume: "$736K",
      ath: "$18K",
      drawdown: "-51.34%",
      thumbLabel: "LIFE",
      thumbClassName: "from-[#e5e5e5] via-[#c3b19d] to-[#8d6d53]",
    },
    {
      id: "cortisol",
      symbol: "CORTISOL",
      subtitle: "Cortisol Level",
      title: "Gen Z Illustrate High and Low Cortisol Level In Different Situations",
      slug: "9AyL..pump",
      platform: "x",
      creator: "@2049driver",
      followers: "197.5K followers",
      badges: ["FR", "KR", "MX"],
      age: "16h",
      price: "$133.39K",
      volume: "$12K",
      ath: "$185K",
      drawdown: "-9.56%",
      thumbLabel: "CORT",
      thumbClassName: "from-[#f8ef98] via-[#91d16d] to-[#ff5a63]",
    },
    {
      id: "sinister",
      symbol: "SINISTER",
      subtitle: "Sinister walk",
      title: "People Are Recreating Jordan Barrett's 'Sinister Walk'",
      slug: "H9CR..pump",
      platform: "tiktok",
      creator: "@averageerandfan",
      followers: "163 followers",
      badges: ["EV", "2P"],
      age: "17h",
      price: "$19.25K",
      volume: "$19K",
      ath: "$23K",
      drawdown: "+8.19%",
      drawdownPositive: true,
      thumbLabel: "WALK",
      thumbClassName: "from-[#dde8f9] via-[#bcc9d4] to-[#f35656]",
    },
    {
      id: "breakmyshi",
      symbol: "BREAKMYSHI",
      subtitle: "soyoujustgonbreakmyshi",
      title: "A TV-Smashing Meltdown Has Became a New Viral TikTok Song",
      slug: "H8Ei..pump",
      platform: "tiktok",
      creator: "@tvgirl5673",
      followers: "1.3K followers",
      badges: ["P9", "J2", "L4"],
      age: "1d",
      price: "$5.98K",
      volume: "$7K",
      ath: "$32K",
      drawdown: "-28.62%",
      thumbLabel: "TV",
      thumbClassName: "from-[#78e2ff] via-[#9f78ff] to-[#ff6ba4]",
    },
  ],
  bannerSlots: [
    { className: "left-[10%] top-[20%]", size: "lg", tilt: "-4deg" },
    { className: "left-[20%] top-[49%]", size: "md", tilt: "-10deg" },
    { className: "left-[33%] top-[22%]", size: "md", tilt: "0deg" },
    { className: "left-[46%] top-[52%]", size: "sm", tilt: "-4deg" },
    { className: "left-[56%] top-[20%]", size: "md", tilt: "8deg" },
    { className: "left-[68%] top-[48%]", size: "md", tilt: "-10deg" },
    { className: "left-[80%] top-[22%]", size: "md", tilt: "-6deg" },
  ],
  bannerFrames: [
    ["reddit", "instagram", "x", "youtube", "telegram", "tiktok", "reddit"],
    ["instagram", "x", "youtube", "telegram", "tiktok", "reddit", "instagram"],
    ["telegram", "reddit", "instagram", "x", "youtube", "telegram", "tiktok"],
  ],
  bannerLogoOptions: ["tiktok", "x", "youtube", "instagram", "telegram", "reddit"],
  bannerStars: [
    { left: "7%", top: "18%", size: "sm", delay: "0s" },
    { left: "16%", top: "70%", size: "md", delay: "0.4s" },
    { left: "24%", top: "28%", size: "lg", delay: "0.7s" },
    { left: "31%", top: "58%", size: "sm", delay: "1.1s" },
    { left: "39%", top: "22%", size: "sm", delay: "0.2s" },
    { left: "47%", top: "64%", size: "md", delay: "0.9s" },
    { left: "55%", top: "32%", size: "sm", delay: "1.3s" },
    { left: "63%", top: "69%", size: "lg", delay: "0.5s" },
    { left: "71%", top: "36%", size: "sm", delay: "1.5s" },
    { left: "79%", top: "23%", size: "md", delay: "0.8s" },
    { left: "87%", top: "63%", size: "sm", delay: "1.2s" },
  ],
};

export function trendMatchesMode(item: HomeFeedTrendItem, mode: FeedMode): boolean {
  if (mode === "live") return true;
  return ["cortisol", "sinister", "secret", "breakmyshi", "bankroll"].includes(item.id);
}

/**
 * Replace the body with `fetch(url).then(r => r.json())` once your home feed API exists.
 */
export async function fetchHomeFeed(): Promise<HomeFeedData> {
  return DEFAULT_HOME_FEED;
}
