export function throwMoreThan32Bit(what: string, size: number): void {
  throw new Error(
    `Unable to write ${size} as ${what}. ${what} must be smaller than ${0x100000000} (32bit).`,
  );
}
