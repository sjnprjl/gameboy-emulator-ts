import { CPU } from "./core/cpu";
import { MMU } from "./core/mmu";
import { dmg_boot_rom } from "./roms/roms";

console.log("gameboy emulator typescript");

const mmu = new MMU();
mmu.load(dmg_boot_rom);
const cpu = new CPU(mmu);

cpu.run();
