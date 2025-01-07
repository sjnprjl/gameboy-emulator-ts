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
  call_u16,
  push_nn,
  rl_n,
  rlc_n,
  pop_nn,
  dec_n,
  ld_hli_a,
  ld_hld_a,
  inc_nn,
  ret,
  cp_a_n,
  jr_n,
  ldh_a_n,
} from "./instruction-factory";
import { to_hex_string } from "./utils";

const CBInstructions: Record<number, InstructionFn | null> = {
  0x00: (cpu) => rlc_n(cpu, "b"),
  0x01: (cpu) => rlc_n(cpu, "c"),
  0x02: (cpu) => rlc_n(cpu, "d"),
  0x03: (cpu) => rlc_n(cpu, "e"),
  0x04: (cpu) => rlc_n(cpu, "h"),
  0x05: (cpu) => rlc_n(cpu, "l"),
  0x10: (cpu) => rl_n(cpu, "b"),
  0x11: (cpu) => rl_n(cpu, "c"),
  0x12: (cpu) => rl_n(cpu, "d"),
  0x17: (cpu) => rl_n(cpu, "a"),
  0x7c: (cpu) => bit_b_r(cpu, 7, "h"),
};

export const Instruction: Record<number, InstructionFn | null> = {
  0x0: (_) => noop(),
  0x04: (cpu) => inc_n(cpu, "b"),
  0x05: (cpu) => dec_n(cpu, "b"),
  0x06: (cpu) => ld_r_n(cpu, "b", "#"),
  0x0c: (cpu) => inc_n(cpu, "c"),
  0x0d: (cpu) => dec_n(cpu, "c"),
  0x0e: (cpu) => ld_r_n(cpu, "c", "#"),
  0x11: (cpu) => ld_xx_nn(cpu, "de"),
  0x13: (cpu) => inc_nn(cpu, "de"),
  0x17: (cpu) => rl_n(cpu, "a", 4),
  0x18: (cpu) => jr_n(cpu),
  0x1a: (cpu) => ld_r_n(cpu, "a", "de"),
  0x1e: (cpu) => ld_r_n(cpu, "e", "#"),
  0x20: (cpu) => jr_cc_n(cpu, "nz"),
  0x21: (cpu) => ld_xx_nn(cpu, "hl"),
  0x22: (cpu) => ld_hli_a(cpu),
  0x23: (cpu) => inc_nn(cpu, "hl"),
  0x28: (cpu) => jr_cc_n(cpu, "z"),
  0x2e: (cpu) => ld_r_n(cpu, "l", "#"),
  0x31: (cpu) => {
    // LD SP, nn
    return sp_nn(cpu);
  },
  0x32: (cpu) => ld_hld_a(cpu),
  //   0x32: (cpu) => {
  //     const addr = cpu.get_reg_xx("hl");
  //     // console.log(
  //     //   `Writing ${to_hex_string(cpu.get_reg_x("a"))} to ${to_hex_string(addr)}`
  //     // );
  //     cpu.mmu.write(addr, cpu.get_reg_x("a"));
  //     const dec = addr - 1;
  //     cpu.set_reg_xx("hl", dec);
  //     return createOutput(8, `LD (HL-), A; ${to_hex_string(dec)}H`);
  //   },
  0x3d: (cpu) => dec_n(cpu, "a"),
  0x3e: (cpu) => ld_r_n(cpu, "a", "#"),
  0x4f: (cpu) => ld_r_n(cpu, "c", "a"),
  0x57: (cpu) => ld_r_n(cpu, "d", "a"),
  0x67: (cpu) => ld_r_n(cpu, "h", "a"),
  0x68: (cpu) => ld_r_n(cpu, "l", "d"),
  0x77: (cpu) => ld_n_r(cpu, "hl", "a"),
  0x7b: (cpu) => ld_r_n(cpu, "a", "e"),

  //   0xae: (cpu) => cp_a_n(cpu, "e"),

  0xaf: (cpu) => {
    // XOR A
    xor_n(cpu, "a");
    return createOutput(4, "XOR A");
  },
  0xc1: (cpu) => pop_nn(cpu, "bc"),
  0xc5: (cpu) => push_nn(cpu, "bc"),
  0xc9: (cpu) => ret(cpu),
  0xcb: (cpu) => {
    const opcode = cpu.fetch(); // get past the CB prefix
    const instruction = CBInstructions[opcode];
    if (!instruction)
      throw new Error(`Invalid CB instruction: ${to_hex_string(opcode)}`);
    const result = instruction(cpu);
    return { ...result, clock: result.clock + 4 };
  },
  0xcd: (cpu) => call_u16(cpu),
  0xe0: (cpu) => ldh_n_a(cpu),
  0xe2: (cpu) => ldh_c_a(cpu),
  0xea: (cpu) => ld_n_r(cpu, "nn", "a"),
  0xf0: (cpu) => ldh_a_n(cpu),
  0xfe: (cpu) => cp_a_n(cpu, "#"),
} as const;
