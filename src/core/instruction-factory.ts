import { CPU } from "./cpu";
import { i8, Reg16, Reg8, u8 } from "./defs.types";
import {
  to_hex_string,
  to_u8,
  to_u16,
  u16_to_u8,
  get_nth_bit,
  to_signed,
} from "./utils";

export function createOutput(clock: number, pneumonic: string) {
  return { clock, pneumonic };
}

export function noop() {
  return createOutput(4, "NOP");
}

export function sp_nn(cpu: CPU) {
  // LD SP, nn
  const lsb = cpu.fetch();
  const msb = cpu.fetch();
  const nn = to_u16(msb, lsb);
  cpu.sp = nn;
  return createOutput(12, `LD SP, ${to_hex_string(nn)}H`);
}

export function xor_n(cpu: CPU, n: Reg8) {
  const a = cpu.read_reg_x("a");
  const n_reg = cpu.read_reg_x(n);

  const result = a ^ n_reg;
  cpu.set_reg_x("a", to_u8(result));
  cpu.reg_f = 0x0; // reset flags
  if (!result) cpu.f_z = 1;
}

export function ld_xx_nn(cpu: CPU, reg: Reg16) {
  const n1 = cpu.fetch();
  const n2 = cpu.fetch();
  const nn = to_u16(n2, n1);

  cpu.set_reg_xx(reg, nn);
  return createOutput(12, `LD ${reg}, ${to_hex_string(nn)}H`);
}

export function bit_b_r(cpu: CPU, b: u8, r: Reg8 | "hl") {
  let bit = 0;
  let cycle = 0;
  if (r == "hl") {
    const hl = cpu.get_reg_xx("hl");
    const byte = cpu.mmu.read(hl);
    bit = get_nth_bit(byte, b);
    cycle = 16;
  } else {
    bit = get_nth_bit(cpu.read_reg_x(r), b);
    cycle = 8;
  }

  if (!bit) cpu.f_z = 1;
  else cpu.f_z = 0;
  cpu.f_n = 0;
  cpu.f_h = 1;

  return createOutput(cycle, `BIT ${b}, ${r}; bit -> ${bit}`);
}

export function jr_cc_n(cpu: CPU, cc: "nz" | "z" | "nc" | "c") {
  const n = cpu.fetch();
  const signed = to_signed(to_u8(n));
  let cycle = 8;

  const operations = {
    nz: cpu.f_z == 0,
    z: cpu.f_z,
    nc: !cpu.f_c,
    c: cpu.f_c,
  };

  if (operations[cc]) {
    cpu.pc += signed;
    cycle = 12;
  }

  return createOutput(cycle, `JR ${cc}, ${to_hex_string(signed)}H`);
}

export function jr_n(cpu: CPU) {
  const n = to_signed(cpu.fetch());
  cpu.pc += n;
  return createOutput(12, `JR ${to_hex_string(n)}H`);
}

export function ld_r_n(
  cpu: CPU,
  reg: Reg8,
  n: Reg8 | "nn" | "bc" | "de" | "hl" | "#"
) {
  let cycle = 4;
  let nn: any = n;
  let value = 0;
  if (n === "#") {
    const n1 = cpu.fetch();
    value = n1;
    cpu.set_reg_x(reg, value);
    cycle = 8;
    nn = to_hex_string(n1);
  } else if (n === "nn") {
    const n1 = cpu.fetch();
    const n2 = cpu.fetch();
    nn = to_u16(n2, n1);
    value = cpu.mmu.read(nn);
    cpu.set_reg_x(reg, cpu.mmu.read(nn));
    cycle = 16;
    nn = `(${to_hex_string(nn)}H)`;
  } else if (["bc", "de", "hl"].includes(n)) {
    const addr = cpu.get_reg_xx(n as any);
    value = cpu.mmu.read(addr);
    cpu.set_reg_x(reg, value);
    cycle = 8;
    nn = `(${n})`;
  } else {
    value = cpu.read_reg_x(n as Reg8);
    cpu.set_reg_x(reg, value);
  }
  return createOutput(cycle, `LD ${reg}, ${nn}; value -> ${value}`);
}

export function ld_n_r(cpu: CPU, n: Reg8 | "bc" | "hl" | "de" | "nn", r: Reg8) {
  const reg_value = cpu.read_reg_x(r);
  let cycle = 4;
  let nn: any = n;
  if (n === "nn") {
    const nn1 = cpu.fetch();
    const nn2 = cpu.fetch();
    nn = to_u16(nn2, nn1);
    cpu.mmu.write(nn, reg_value);
    cycle = 16;
  } else if (["hl", "de", "bc"].includes(n)) {
    const addr = cpu.get_reg_xx(n as any);
    cpu.mmu.write(addr, reg_value);
    cycle = 8;
    nn = `(${n})`;
  } else {
    cpu.set_reg_x(n as Reg8, reg_value);
  }

  return createOutput(cycle, `LD ${nn}, ${r}`);
}

// Load from accumulator (indirect 0xFF00+C)
export function ldh_c_a(cpu: CPU) {
  const c = cpu.read_reg_x("c");
  const addr = 0xff00 + c;
  cpu.mmu.write(addr, cpu.read_reg_x("a"));
  return createOutput(
    8,
    `LD (0xFF00+C), A; addr: ${to_hex_string(addr)}H - value: ${to_hex_string(
      cpu.read_reg_x("a")
    )}`
  );
}

export function ldh_a_n(cpu: CPU) {
  const n = cpu.fetch();
  const addr = 0xff00 + n;
  const value = cpu.mmu.read(addr);
  cpu.set_reg_x("a", value);
  return createOutput(12, `LD A, (0xFF00+${to_hex_string(n)}H)`);
}

export function ldh_n_a(cpu: CPU) {
  const n = cpu.fetch();
  const addr = 0xff00 + n;
  cpu.mmu.write(addr, cpu.read_reg_x("a"));
  return createOutput(12, `LD (0xFF00+${to_hex_string(n)}H), A`);
}

export function inc_nn(cpu: CPU, nn: "bc" | "de" | "hl") {
  const value = cpu.get_reg_xx(nn) + 1;
  cpu.set_reg_xx(nn, value);
  return createOutput(8, `INC ${nn}`);
}

export function inc_n(cpu: CPU, n: Reg8 | "hl") {
  let value = undefined;
  let cycle = 4;
  if (n === "hl") {
    value = cpu.mmu.read(cpu.get_reg_xx("hl"));
    cycle = 12;
  } else {
    value = cpu.read_reg_x(n);
  }
  value = to_u8(++value);
  if (!value) cpu.f_z = 1;
  else cpu.f_z = 0;
  cpu.f_n = 0;
  if (value & 0x10) cpu.f_h = 1;
  else cpu.f_h = 0;

  if (n === "hl") {
    cpu.mmu.write(cpu.get_reg_xx("hl"), value);
  } else {
    cpu.set_reg_x(n, value);
  }

  return createOutput(cycle, `INC ${n}; value -> ${to_hex_string(value)}`);
}

export function dec_n(cpu: CPU, n: Reg8 | "hl") {
  let value = undefined;
  let cycle = 4;
  if (n === "hl") {
    value = cpu.mmu.read(cpu.get_reg_xx("hl"));
    cycle = 12;
  } else {
    value = cpu.read_reg_x(n);
  }
  value = to_u8(--value);
  if (!value) cpu.f_z = 1;
  else cpu.f_z = 0;
  cpu.f_n = 1;
  if (value & 0x10) cpu.f_h = 1;
  else cpu.f_h = 0;

  if (n === "hl") {
    cpu.mmu.write(cpu.get_reg_xx("hl"), value);
  } else {
    cpu.set_reg_x(n, value);
  }

  return createOutput(cycle, `DEC ${n}; value -> ${to_hex_string(value)}`);
}

export function call_u16(cpu: CPU) {
  const n1 = cpu.fetch();
  const n2 = cpu.fetch();
  const nn = to_u16(n2, n1); // jump to nn
  const [msb, lsb] = u16_to_u8(cpu.pc); // current program counter
  cpu.mmu.write(--cpu.sp, msb);
  cpu.mmu.write(--cpu.sp, lsb);

  cpu.pc = nn; // goto nn

  return createOutput(
    24,
    `CALL ${to_hex_string(nn)}H; goto ${to_hex_string(cpu.pc)}H`
  );
}

export function ret(cpu: CPU) {
  const c = cpu.mmu.read(cpu.sp++);
  const p = cpu.mmu.read(cpu.sp++);
  const pc = to_u16(p, c);
  cpu.pc = pc;

  return createOutput(16, `RET; go back to ${to_hex_string(cpu.pc)}H`);
}

export function push_nn(cpu: CPU, nn: Reg16) {
  const r1 = nn[0] as Reg8;
  const r2 = nn[1] as Reg8;
  const v1 = cpu.read_reg_x(r1);
  const v2 = cpu.read_reg_x(r2);

  cpu.mmu.write(--cpu.sp, v1);
  cpu.mmu.write(--cpu.sp, v2);

  return createOutput(16, `PUSH ${nn}`);
}

export function pop_nn(cpu: CPU, nn: Reg16) {
  const r1 = nn[0] as Reg8;
  const r2 = nn[1] as Reg8;
  const v2 = cpu.mmu.read(cpu.sp++);
  const v1 = cpu.mmu.read(cpu.sp++);
  cpu.set_reg_x(r1, v1);
  cpu.set_reg_x(r2, v2);
  return createOutput(12, `POP ${nn}`);
}

export function rl_n(cpu: CPU, n: Reg8, cycle = 8) {
  let value = cpu.read_reg_x(n);
  const carry = get_nth_bit(value, 7);
  value = to_u8(value << 1) | cpu.f_c;

  if (!value) cpu.f_z = 1;
  else cpu.f_z = 0;
  cpu.f_n = 0;
  cpu.f_h = 0;
  cpu.f_c = carry;

  cpu.set_reg_x(n, value);
  return createOutput(cycle, `RL ${n}; value -> ${to_hex_string(value)}`);
}

export function rlc_n(cpu: CPU, n: Reg8) {
  let value = cpu.read_reg_x(n);
  const carry = get_nth_bit(value, 7);
  value = to_u8(value << 1);

  if (!value) cpu.f_z = 1;
  else cpu.f_z = 0;
  cpu.f_n = 0;
  cpu.f_h = 0;
  cpu.f_c = carry;
  cpu.set_reg_x(n, value);
  return createOutput(4, `RLC ${n}; value -> ${to_hex_string(value)}`);
}

export function ld_hli_a(cpu: CPU) {
  const addr = cpu.get_reg_xx("hl");
  cpu.mmu.write(addr, cpu.read_reg_x("a"));
  cpu.set_reg_xx("hl", addr + 1);

  return createOutput(
    8,
    `LD (HLI), A; addr: ${to_hex_string(addr)}H - hl: ${to_hex_string(
      cpu.get_reg_xx("hl")
    )}H`
  );
}

export function ld_hld_a(cpu: CPU) {
  const addr = cpu.get_reg_xx("hl");
  cpu.mmu.write(addr, cpu.read_reg_x("a"));
  cpu.set_reg_xx("hl", addr - 1);

  return createOutput(
    8,
    `LD (HLD), A; addr: ${to_hex_string(addr)}H - hl: ${to_hex_string(
      cpu.get_reg_xx("hl")
    )}H`
  );
}

export function cp_a_n(cpu: CPU, n: Reg8 | "#" | "hl") {
  let value = 0;
  let cycle = 4;
  if (n === "#") {
    value = cpu.fetch();
    cycle = 8;
  } else if (n === "hl") {
    value = cpu.mmu.read(cpu.get_reg_xx("hl"));
    cycle = 8;
  } else {
    value = cpu.read_reg_x(n as Reg8);
  }

  const A = cpu.read_reg_x("a");
  if (A == value) cpu.f_z = 1;
  else cpu.f_z = 0;
  cpu.f_n = 1;

  if (A < value) cpu.f_c = 1;
  else cpu.f_c = 0;

  if ((A & 0xf) - (value & 0xf) < 0) cpu.f_h = 1;
  else cpu.f_h = 0;

  return createOutput(
    cycle,
    `CP A, ${n == "#" ? to_hex_string(value) + "H" : `(${n})`}`
  );
}
