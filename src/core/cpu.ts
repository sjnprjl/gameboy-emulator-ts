import { Reg16, Reg8, u16, u8 } from "./defs.types";
import { Instruction } from "./instructions";
import { MMU } from "./mmu";
import { get_nth_bit, to_hex_string, to_u16, u16_to_u8 } from "./utils";

export class CPU {
  private a: u8 = 0;
  private b: u8 = 0;
  private c: u8 = 0;
  private d: u8 = 0;
  private e: u8 = 0;
  private h: u8 = 0;
  private l: u8 = 0;
  public f_z: u8 = 0;
  public f_n: u8 = 0;
  public f_h: u8 = 0;
  public f_c: u8 = 0;
  private clock = 0;
  public pc: u16 = 0;
  private _sp: u16 = 0;
  private halt = false;

  constructor(public mmu: MMU) {}

  fetch() {
    return this.mmu.read(this.pc++);
  }

  set_reg_x(reg: "a" | "b" | "c" | "d" | "e" | "h" | "l" | "f", value: u8) {
    if (reg === "f") this.reg_f = value;
    else this[reg] = value;
  }

  get_reg_x(reg: Reg8): u8 {
    if (reg === "f") return this.reg_f;
    return this[reg];
  }

  get_reg_xx(reg: "hl" | "de" | "bc" | "af"): u16 {
    const r1 = reg[0] as Reg8;
    const r2 = reg[1] as Reg8;
    const v1 = this.read_reg_x(r1);
    const v2 = this.read_reg_x(r2);
    return to_u16(v1, v2);
  }

  set_reg_xx(reg: Reg16, value: u16) {
    const [msb, lsb] = u16_to_u8(value);
    const r1 = reg[0] as Reg8;
    const r2 = reg[1] as Reg8;
    this.set_reg_x(r1, msb);
    this.set_reg_x(r2, lsb);
  }

  read_reg_x(reg: "a" | "b" | "c" | "d" | "e" | "h" | "l" | "f"): u8 {
    if (reg === "f") return this.reg_f;
    return this[reg];
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

  get sp() {
    return this._sp;
  }
  set sp(value: u16) {
    this._sp = value;
  }

  run() {
    let i = 0;
    const until = 6 * 0x3000;
    while (i < until &&  !this.halt) {
      this.cycle();
      i++;
    }
    console.log(i, until);
  }

  cycle() {
    // fetch
    let current_pc = this.pc;
    const opcode = this.fetch();
    // decode;
    const instruction = Instruction[opcode];

    if (!instruction)
      throw new Error(`Invalid opcode: ${to_hex_string(opcode)}`);

    // execute
    const { clock, pneumonic } = instruction(this);
    this.clock += clock;
    console.log(`${to_hex_string(current_pc, 4)}: ${pneumonic}`);
  }
}
