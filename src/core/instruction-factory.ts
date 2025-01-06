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

  const operations = {
    nz: !cpu.f_z,
    z: cpu.f_z,
    nc: !cpu.f_c,
    c: cpu.f_c,
  };

  if (operations[cc]) cpu.pc += signed;

  return createOutput(8, `JR ${cc}, ${to_hex_string(signed)}H`);
}

export function ld_r_n(
  cpu: CPU,
  reg: Reg8,
  n: Reg8 | "nn" | "bc" | "de" | "hl" | "#"
) {
  let cycle = 4;
  let nn: any = n;
  if (n === "#") {
    const n1 = cpu.fetch();
    cpu.set_reg_x(reg, n1);
    cycle = 8;
    nn = n1;
  } else if (n === "nn") {
    const n1 = cpu.fetch();
    const n2 = cpu.fetch();
    nn = to_u16(n2, n1);
    cpu.set_reg_x(reg, cpu.mmu.read(nn));
    cycle = 16;
    nn = `(${to_hex_string(nn)}H)`;
  } else if (["bc", "de", "hl"].includes(n)) {
    const addr = cpu.get_reg_xx(n as any);
    const value = cpu.mmu.read(addr);
    cpu.set_reg_x(reg, value);
    cycle = 8;
    nn = `(${n})`;
  } else {
    cpu.set_reg_x(reg, cpu.read_reg_x(n as Reg8));
  }
  return createOutput(cycle, `LD ${reg}, ${nn}`);
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

export function ldh_n_a(cpu: CPU) {
  const n = cpu.fetch();
  const addr = 0xff00 + n;
  cpu.mmu.write(addr, cpu.read_reg_x("a"));
  return createOutput(12, `LD (0xFF00+${to_hex_string(n)}H), A`);
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
