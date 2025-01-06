import { u16, u8 } from "./defs.types";
import { u16_to_u8, to_u16 } from "./utils";

export class MMU {
  private mem: Uint8Array;
  constructor() {
    this.mem = new Uint8Array(0xffff);
  }

  read(addr: u16): u8 {
    return this.mem[addr];
  }
  read16(addr: u16): u16 {
    const lsb = this.read(addr);
    const msb = this.read(addr + 1);
    return to_u16(msb, lsb);
  }

  write(addr: u16, value: u8) {
    this.mem[addr] = value;
  }
  write16(addr: u16, value: u16 | [u8, u8]) {
    let lsb: u8, msb: u8;
    if (value instanceof Array) {
      lsb = value[1];
      msb = value[0];
    } else {
      const [_msb, _lsb] = u16_to_u8(value);
      msb = _msb;
      lsb = _lsb;
    }

    this.write(addr, lsb);
    this.write(addr + 1, msb);
  }

  load(rom: Uint8Array) {
    this.mem.set(rom, 0);
  }
}
