export function formatNumber(int: number) {
  return int < 10 ? `0${Math.floor(int)}` : `${Math.floor(int)}`;
}