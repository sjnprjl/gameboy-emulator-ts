import { u8 } from "./defs.types";
import { get_nth_bit } from "./utils";

export class CPU {
  private a: u8 = 0;
  private b: u8 = 0;
  private c: u8 = 0;
  private d: u8 = 0;
  private e: u8 = 0;
  private h: u8 = 0;
  private l: u8 = 0;
  private f_z: u8 = 0;
  private f_n: u8 = 0;
  private f_h: u8 = 0;
  private f_c: u8 = 0;
  private clock = 0;

  constructor() {}

  set_reg_x(reg: "a" | "b" | "c" | "d" | "e" | "h" | "l" | "f", value: u8) {
    if (reg === "f") this.reg_f = value;
    else this[reg] = value;
  }

  get reg_f(): u8 {
    return (
      (this.f_z << 7) | (this.f_n << 6) | (this.f_h << 5) | (this.f_c << 4)
    );
  }

  set reg_f(value: u8) {
    this.f_z = get_nth_bit(value, 7);
    this.f_n = get_nth_bit(value, 6);
    this.f_h = get_nth_bit(value, 5);
    this.f_c = get_nth_bit(value, 4);
  }
}
