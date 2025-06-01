
export function formatQuality(wxh: number) {
  const qualitys = [
    { wxh: 1920, name: "FHD" },
    { wxh: 1280, name: "HD" },
    { wxh: 854, name: "SD" },
  ];
  return qualitys.find((quality) => quality.wxh === wxh)?.name;
}