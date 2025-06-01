export function processQuality(m3u8s: string[]) {
  const m3u8After: string[] = []
  m3u8s.map((m3u8) => {
    m3u8After.push(`data:application/vnd.apple.mpegurl;base64,${btoa(m3u8.replaceAll(
      "https://p21-ad-sg.ibyteimg.com/obj/ad-site-i18n-sg/",
      "https://p16-tiktok-ads-sg.tiktokcdn.com/obj/ad-site-i18n-sg/"
    ))}`);
  })
  return m3u8After;
}