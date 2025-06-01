import Worker from "./preResolveRequest.worker?worker";

export function preResolveRequest({
  m3u8,
  map,
  limit
}: {
  m3u8: string[];
  map: Map<number, string>;
  limit: number
}) {
  const worker = new Worker();
  console.log(Object.keys(map))
}