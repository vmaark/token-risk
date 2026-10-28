import { CHAINS } from "../discovery/chains.ts";
import { isAddress } from "../discovery/rpc.ts";
import type { TokenInput } from "../discovery/types.ts";
const legacyAddresses: Record<string, string> = {
  wsteth: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
  steth: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
};
export function initialInput(href: string): TokenInput | null {
  const params = new URL(href).searchParams,
    chainId = Number(params.get("chainId")),
    address = params.get("address");
  if (CHAINS[chainId] && isAddress(address))
    return { chainId, address: address.toLowerCase() };
  const legacy = legacyAddresses[params.get("asset") || ""];
  return legacy ? { chainId: 1, address: legacy } : null;
}
export function tokenUrl(href: string, input: TokenInput) {
  const url = new URL(href);
  url.searchParams.delete("asset");
  url.searchParams.set("chainId", String(input.chainId));
  url.searchParams.set("address", input.address.toLowerCase());
  return url;
}
