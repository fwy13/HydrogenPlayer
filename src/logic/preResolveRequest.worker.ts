import pLimit from "p-limit"

addEventListener("message", async ({ data }: { data: { m3u8: string[], index: number, limit: number } }) => {
  const limit = pLimit(1);
  const arrM3u8: string[] = [];
  await Promise.all(
    data.m3u8.map((m3u8, i) => {
      if (i < data.index && i > data.index + data.limit) return;
      limit(async () => {
        arrM3u8.push(m3u8);
        await fetch(m3u8.replaceAll("https://p21-ad-sg.ibyteimg.com/obj/ad-site-i18n-sg/", "https://p16-tiktok-ads-sg.tiktokcdn.com/obj/ad-site-i18n-sg/"));
      })
    })
  )
  postMessage({ m3u8: arrM3u8 });
})