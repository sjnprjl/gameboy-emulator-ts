import { u16, u8 } from "./defs.types";

export const to_u8 = (value: number): u8 => {
  return value & 0xff;
};

export const to_u16 = (value: number): u16 => {
  return value & 0xffff;
};

export const u16_to_u8 = (value: u16): [u8, u8] => {
  const msb = value >> 8;
  const lsb = value & 0xff;
  return [msb, lsb];
};

export const get_nth_bit = (value: number, n: number): number => {
  return (value >> n) & 1;
};
