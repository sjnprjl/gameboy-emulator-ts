import { CPU } from "./cpu";

export type i8 = number;
export type u8 = number;
export type u16 = number;
export type InstructionFn = (c: CPU) => { clock: number; pneumonic: string };
export type Reg8 = "a" | "b" | "c" | "d" | "e" | "h" | "l" | "f";
export type Reg16 = `${Reg8}${Reg8}` | "sp";
