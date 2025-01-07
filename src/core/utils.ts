import { i8, u16, u8 } from "./defs.types";

export const to_u8 = (value: number): u8 => {
  return value & 0xff;
};

/**
 *
 * @returns [msb, lsb]
 */
export const u16_to_u8 = (value: u16): [u8, u8] => {
  const msb = (value >> 8) & 0xff;
  const lsb = value & 0xff;
  return [msb, lsb];
};

export const to_u16 = (msb: u8, lsb: u8): u16 => (msb << 8) | lsb;

export const to_signed = (value: u8): i8 => {
  if (value < 0x80) return value; // positive number
  else return value - 0x100; // negative number
};

export const get_nth_bit = (value: number, n: number): number => {
  return (value >> n) & 1;
};

export const to_hex_string = (value: number, pad = 2) => {
  return value.toString(16).padStart(pad, "0");
};
