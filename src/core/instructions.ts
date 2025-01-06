import { InstructionFn } from "./defs.types";
import {
  createOutput,
  ld_xx_nn,
  noop,
  sp_nn,
  xor_n,
  bit_b_r,
  jr_cc_n,
  ld_r_n,
  ldh_c_a,
  inc_n,
  ld_n_r,
  ldh_n_a,
} from "./instruction-factory";
import { to_hex_string } from "./utils";

const CBInstructions: Record<number, InstructionFn | null> = {
  0x7c: (cpu) => bit_b_r(cpu, 7, "h"),
};

export const Instruction: Record<number, InstructionFn | null> = {
  0x0: (_) => noop(),
  0x0c: (cpu) => inc_n(cpu, "c"),
  0x0e: (cpu) => ld_r_n(cpu, "c", "#"),
  0x11: (cpu) => ld_xx_nn(cpu, "de"),
  0x1a: (cpu) => ld_r_n(cpu, "a", "de"),
  0x20: (cpu) => jr_cc_n(cpu, "nz"),
  0x21: (cpu) => ld_xx_nn(cpu, "hl"),
  0x31: (cpu) => {
    // LD SP, nn
    return sp_nn(cpu);
  },
  0x32: (cpu) => {
    const addr = cpu.get_reg_xx("hl");
    // console.log(
    //   `Writing ${to_hex_string(cpu.get_reg_x("a"))} to ${to_hex_string(addr)}`
    // );
    cpu.mmu.write(addr, cpu.get_reg_x("a"));
    const dec = addr - 1;
    cpu.set_reg_xx("hl", dec);
    return createOutput(8, `LD (HL-), A; ${to_hex_string(dec)}H`);
  },
  0x3e: (cpu) => ld_r_n(cpu, "a", "#"),
  0x77: (cpu) => ld_n_r(cpu, "hl", "a"),

  0xaf: (cpu) => {
    // XOR A
    xor_n(cpu, "a");
    return createOutput(4, "XOR A");
  },
  0xcb: (cpu) => {
    const opcode = cpu.fetch(); // get past the CB prefix
    const instruction = CBInstructions[opcode];
    if (!instruction)
      throw new Error(`Invalid CB instruction: ${to_hex_string(opcode)}`);
    const result = instruction(cpu);
    return { ...result, clock: result.clock + 4 };
  },
  0xe0: (cpu) => ldh_n_a(cpu),
  0xe2: (cpu) => ldh_c_a(cpu),
} as const;
