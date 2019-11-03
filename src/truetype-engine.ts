
import { FontDefinition } from "./truetype-reader";

enum RoundingMode {
    GRID
}

enum DistanceType {
    WHITE, BLACK, GRAY
}

function makeDistanceType(n: number) {
    if (n == 0) {
        return DistanceType.WHITE;
    } else if (n == 1) {
        return DistanceType.BLACK;
    } else {
        return DistanceType.GRAY;
    }
}

class F26Dot6 {
    constructor(public value: number) {}

    sub(o: F26Dot6) {
        return new F26Dot6(this.value - o.value);
    }
}

class GraphicsState {
    scanControlRule: number = 0;
    scanControl: number = 0;
    controlValueCutIn: number = 0; // TODO default 17/16 pixels
    roundingMode: RoundingMode = RoundingMode.GRID;
}

class Evaluator {
    graphicsState = new GraphicsState();
    memory: Array<number> = [];
    stack: Array<number> = [];
    functionDefinitions = {};
    pc: number;
    instructions : Array<number>;
    callStack = [];

    constructor(private originalCVT: Array<number>) {}

    evaluate(instructions: Array<number>) {
        this.pc = 0;
        this.instructions = instructions;
        while (this.pc < this.instructions.length) {
            this.evaluateOne();
        }
    }

    evaluateOne() {
        const opcode = this.instructions[this.pc++];
        if (opcode == 0x18) {
            // RTG[]
            this.graphicsState.roundingMode = RoundingMode.GRID;
        } else if (opcode == 0x1d) {
            // SCVTCI[]
            this.graphicsState.controlValueCutIn = this.stack.pop();
        } else if (opcode == 0x20) {
            // DUP[]
            this.stack.push(this.stack[this.stack.length-1]);
        } else if (opcode == 0x23) {
            // SWAP[]
            const n = this.stack.pop();
            const m = this.stack.pop();
            this.stack.push(n);
            this.stack.push(m);
        } else if (opcode == 0x2b) {
            // CALL[]
            const fn = this.stack.pop();
            this.callStack.push({ pc: this.pc, instructions: this.instructions });
            this.instructions = this.functionDefinitions[fn].instructions;
            this.pc = 0;
        } else if (opcode == 0x2c) {
            // FDEF[]
            const functionNumber = this.stack.pop();
            const startPc = this.pc;
            while (true) {
                const op = this.instructions[this.pc++];
                if (op == 0x2d) {
                    break;
                }
                // TODO be aware of multi bytes instructions
                // NPUSHB <n> <x>*n
                // PUSHB (n:opcode&7) <x>*(n+1)
                // PUSHW[](n:opcode&7) <x>*((n+1)*2)
            }
            this.functionDefinitions[functionNumber] = { instructions: this.instructions.slice(startPc, this.pc) };
        } else if (opcode == 0x40) {
            // NPUSHB[]
            const n = this.instructions[this.pc++];
            for (let i = 0; i < n; ++i) {
                this.stack.push(this.instructions[this.pc++]);
            }
        } else if (opcode == 0x42) {
            // WS[]
            const v = this.stack.pop();
            const l = this.stack.pop();
            this.memory[l] = v;
        } else if (opcode == 0x45) {
            // RCVT[]
            const n = this.stack.pop();
            this.stack.push(this.originalCVT[n]);
        } else if (opcode == 0x51) {
            // LTEQ[]
            const b = this.stack.pop();
            const a = this.stack.pop();
            this.stack.push(a <= b ? 1 : 0);
        } else if (opcode == 0x58) {
            // IF[]
            const condition = this.stack.pop();
            if (! condition) {
                throw "search for else or endf counting nested ifs"
            }
        } else if (opcode == 0x61) {
            // SUB[]
            const b = new F26Dot6(this.stack.pop());
            const a = new F26Dot6(this.stack.pop());
            this.stack.push(a.sub(b).value)
        } else if ((opcode & ~3) == 0x68) {
            // ROUND[]
            const distanceType = makeDistanceType(opcode & 3);
            const n = new F26Dot6(this.stack.pop());
            this.stack.push(this.round(n, distanceType).value);
        } else if (opcode == 0x85) {
            // SCANCTRL[]
            this.graphicsState.scanControl = this.stack.pop();
        } else if (opcode == 0x8d) {
            // SCANTYPE[]
            this.graphicsState.scanControlRule = this.stack.pop();
        } else if ((opcode & ~7) == 0xb0) {
            // PUSHB[]
            const n = (opcode & 7) + 1;
            for (let i = 0; i < n; ++i) {
                this.stack.push(this.instructions[this.pc++]);
            }
        } else if ((opcode & ~7) == 0xb8) {
            // PUSHW[]
            const n = (opcode & 7) + 1;
            for (let i = 0; i < n; ++i) {
                let value = this.instructions[this.pc] << 8 | this.instructions[this.pc+1];
                if (value & 0x8000) {
                    value -= 0x10000;
                }
                this.stack.push(value);
                this.pc += 2;
            }
        } else {
            throw `unknown opcode ${opcode.toString(16)}`;
        }
    }

    round(n: F26Dot6, distanceType: DistanceType): F26Dot6 {
        // TODO implement rounding
        return n;
    }
}

function decodeInstructions(instructions: Array<number>) {
    let pc = 0;
    while (pc < instructions.length) {
        const opcode = instructions[pc];
        let instr = `${pc}: ${opcode} `
        if ((opcode & ~1) == 0x00) {
            instr += (`SVTCA[${opcode & 1}]`);
        } else if ((opcode & ~1) == 0x02) {
            instr += (`SPVTCA[${opcode & 1}]`);
        } else if ((opcode & ~1) == 0x04) {
            instr += (`SFVTCA[${opcode & 1}]`);
        } else if (opcode == 0x0a) {
            instr += ("SPVFS[]")
        } else if (opcode == 0x0b) {
            instr += ("SFVFS[]")
        } else if (opcode == 0x10) {
            instr += ("SRP0[]")
        } else if (opcode == 0x11) {
            instr += ("SRP1[]")
        } else if (opcode == 0x12) {
            instr += ("SRP2[]")
        } else if (opcode == 0x14) {
            instr += ("SZP1[]")
        } else if (opcode == 0x17) {
            instr += ("SLOOP[]")
        } else if (opcode == 0x18) {
            instr += ("RTG[]")
        } else if (opcode == 0x1b) {
            instr += ("} else[]")
        } else if (opcode == 0x1c) {
            instr += ("JMPR[]")
        } else if (opcode == 0x1d) {
            instr += ("SCVTCI[]")
        } else if (opcode == 0x20) {
            instr += ("DUP[]")
        } else if (opcode == 0x21) {
            instr += ("POP[]")
        } else if (opcode == 0x23) {
            instr += ("SWAP[]")
        } else if (opcode == 0x25) {
            instr += ("CINDEX[]")
        } else if (opcode == 0x2a) {
            instr += ("LOOPCALL[]")
        } else if (opcode == 0x2b) {
            instr += ("CALL[]")
        } else if (opcode == 0x2c) {
            instr += ("FDEF[]")
        } else if (opcode == 0x2d) {
            instr += ("ENDF[]")
        } else if ((opcode & ~1) == 0x2e) {
            instr += (`MDAP[${opcode & 1}]`);
        } else if ((opcode & ~1) == 0x30) {
            instr += (`IUP[${opcode & 1}]`)
        } else if ((opcode & ~1) == 0x3e) {
            instr += (`MIAP[${opcode & 1}]`)
        } else if (opcode == 0x39) {
            instr += ("IP[]")
        } else if (opcode == 0x3c) {
            instr += ("ALIGNRP[]")
        } else if (opcode == 0x40) {
            pc += 1;
            const n = instructions[pc];
            //const data = list(instructions[pc+1:pc+n+1]);
            pc += n;
            instr += ("NPUSHB[]");
        } else if (opcode == 0x42) {
            instr += ("WS[]")
        } else if (opcode == 0x43) {
            instr += ("RS[]")
        } else if (opcode == 0x44) {
            instr += ("WCVTP[]")
        } else if (opcode == 0x45) {
            instr += ("RCVT[]")
        } else if ((opcode & ~1) == 0x46) {
            instr += (`GC[${opcode & 1}]`)
        } else if (opcode == 0x50) {
            instr += ("LT[]")
        } else if (opcode == 0x51) {
            instr += ("LTEQ[]")
        } else if (opcode == 0x53) {
            instr += ("GTEQ[]")
        } else if (opcode == 0x54) {
            instr += ("EQ[]")
        } else if (opcode == 0x56) {
            instr += ("ODD[]")
        } else if (opcode == 0x58) {
            instr += ("IF[]")
        } else if (opcode == 0x59) {
            instr += ("EIF[]")
        } else if (opcode == 0x60) {
            instr += ("ADD[]")
        } else if (opcode == 0x61) {
            instr += ("SUB[]")
        } else if (opcode == 0x62) {
            instr += ("DIV[]")
        } else if (opcode == 0x64) {
            instr += ("ABS[]")
        } else if (opcode == 0x66) {
            instr += ("FLOOR[]")
        } else if ((opcode & ~3) == 0x68) {
            instr += (`ROUND[${opcode & 3}]`)
        } else if (opcode == 0x76) {
            instr += ("SROUND[]")
        } else if (opcode == 0x78) {
            instr += ("JROT[]")
        } else if (opcode == 0x85) {
            instr += ("SCANCTRL[]")
        } else if (opcode == 0x8a) {
            instr += ("ROLL[]")
        } else if (opcode == 0x8d) {
            instr += ("SCANTYPE[]")
        } else if ((opcode & ~7) == 0xb0) {
            const n = (opcode & 7) + 1;
            // data = list(instructions[pc+1) {pc+n+1])
            instr += (`PUSHB[${n}]`)
            pc += n;
        } else if ((opcode & ~7) == 0xb8) {
            const n = (opcode & 7) + 1;
            //data = list(instructions[pc+1) {pc+n*2+1])  # TODO make words
            instr += (`PUSHW[${n}]`)
            pc += n * 2;
        } else if ((opcode & ~0x1F) == 0xC0) {
            instr += (`MDRP[${opcode & 0x1f}]`)
        } else if ((opcode & ~0x1F) == 0xE0) {
            instr += (`MIRP[${opcode & 0x1f}]`)
        } else {
            instr += `[${opcode.toString(16)}]`;
        }
        pc += 1;
        console.log(instr);
    }
}
    
export function make(fontDefinition: FontDefinition) {
    // decodeInstructions(fontDefinition.fpgm);
    const evaluator = new Evaluator(fontDefinition.cvt);
    evaluator.evaluate(fontDefinition.fpgm);
    // evaluator.evaluate(fontDefinition.prep);
    return {

    };
}
