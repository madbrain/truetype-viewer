
import { FontDefinition, TTFGlyphDescription, GlyphPoint, Rectangle } from "./truetype-reader";

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
    
    add(o: F26Dot6) {
        return new F26Dot6(this.value + o.value);
    }

    sub(o: F26Dot6) {
        return new F26Dot6(this.value - o.value);
    }

    div(o: F26Dot6) {
        return new F26Dot6(this.value * 64 / o.value);
    }

    abs() {
        return new F26Dot6(Math.abs(this.value));
    }

    floor() {
        return new F26Dot6(Math.floor(this.value / 64) * 64);
    }
}

// TODO change to RoundParameters presets
enum RoundingMode {
    GRID
}

class RoundParameters {
    readonly period: number;
    readonly phase: number;
    readonly threshold: number;
    constructor (n: number) {
        this.period = (n>>5) & 0x3;
        this.phase = (n>>3) & 0x3;
        this.threshold = n & 0x7;
    }
}

class GraphicsState {
    scanControlRule: number = 0;
    scanControl: number = 0;
    controlValueCutIn: number = 0; // TODO default 17/16 pixels
    roundingMode: RoundingMode = RoundingMode.GRID; // TODO replace with presets of RoundParameters
    roundParameters: RoundParameters;
}

class Evaluator {
    graphicsState = new GraphicsState();
    memory: Array<number> = [];
    stack: Array<number> = [];
    functionDefinitions = {};
    pc: number;
    instructions : Array<number>;
    callStack = [];
    glyph: ScaledGlyph;

    constructor(private cvt: Array<F26Dot6>) {}

    evaluate(instructions: Array<number>) {
        this.start(instructions, null);
        while (this.pc < this.instructions.length) {
            this.evaluateOne();
        }
    }

    start(instructions: Array<number>, glyph: ScaledGlyph) {
        this.pc = 0;
        this.instructions = instructions;
        this.glyph = glyph;
    }

    evaluateOne() {
        const opcode = this.instructions[this.pc++];
        
        if (opcode == 0x10) {
            // SRP0[]
            const p = this.stack.pop();
            // TODO
        } else if (opcode == 0x11) {
            // SRP1[]
            const p = this.stack.pop();
            // TODO
        } else if (opcode == 0x12) {
            // SRP2[]
            const p = this.stack.pop();
            // TODO
        } else if (opcode == 0x14) {
            // SZP1[]
            const n = this.stack.pop();
            // TODO
        } else if (opcode == 0x18) {
            // RTG[]
            this.graphicsState.roundingMode = RoundingMode.GRID;
        } else if (opcode == 0x1b) {
            // ELSE[]
            console.log("skip else");
            let ifCount = 0;
            while (true) {
                const pos = this.skipTo([ 0x58, 0x59, 0x1b ]);
                if (pos == 0) {
                    console.log("nested++");
                    ifCount++;
                } else if (ifCount == 0) {
                    console.log("to", pos);
                    break;
                } else {
                    console.log("nested--");
                    ifCount--;
                }
            }
        } else if (opcode == 0x1d) {
            // SCVTCI[]
            this.graphicsState.controlValueCutIn = this.stack.pop();
        } else if (opcode == 0x20) {
            // DUP[]
            this.stack.push(this.stack[this.stack.length-1]);
        } else if (opcode == 0x21) {
            // POP[]
            this.stack.pop();
        } else if (opcode == 0x23) {
            // SWAP[]
            const n = this.stack.pop();
            const m = this.stack.pop();
            this.stack.push(n);
            this.stack.push(m);
        } else if (opcode == 0x25) {
            // CINDEX[]
            const n = this.stack.pop();
            this.stack.push(this.stack[this.stack.length-n]);
        } else if (opcode == 0x2a) {
            // LOOPCALL[]
            const fn = this.stack.pop();
            const count = this.stack.pop();
            this.callStack.push({ pc: this.pc, instructions: this.instructions, count: count - 1, fn });
            this.instructions = this.functionDefinitions[fn].instructions;
            this.pc = 0;
            console.log(`LOOPCALL ${fn} ${count}`);
        } else if (opcode == 0x2b) {
            // CALL[]
            const fn = this.stack.pop();
            this.callStack.push({ pc: this.pc, instructions: this.instructions, count: 0 });
            this.instructions = this.functionDefinitions[fn].instructions;
            this.pc = 0;
            console.log(`CALL ${fn}`);
        } else if (opcode == 0x2c) {
            // FDEF[]
            const functionNumber = this.stack.pop();
            const startPc = this.pc;
            this.skipTo([ 0x2d ]);
            this.functionDefinitions[functionNumber] = { instructions: this.instructions.slice(startPc, this.pc) };
        } else if (opcode == 0x2d) {
            // ENDF[]
            const { fn, count, pc, instructions } = this.callStack.pop();
            if (count == 0) {
                this.instructions = instructions;
                this.pc = pc;
                console.log(`ENDF`);
            } else {
                this.callStack.push({ pc, instructions, count: count - 1, fn });
                this.instructions = this.functionDefinitions[fn].instructions;
                this.pc = 0;
                console.log(`RECALL ${fn}`);
            }
        } else if ((opcode & ~1) == 0x2e) {
            // MDAP[]
            const roundValue = (opcode & 1) == 1;
            const p = this.stack.pop();
            console.log(`[MDAP] move direct and ${roundValue ? "round" : "do not round"} point ${p}`);
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
        } else if (opcode == 0x43) {
            // RS[]
            const l = this.stack.pop();
            this.stack.push(this.memory[l]);
        } else if (opcode == 0x44) {
            // WCVTP[]
            const v = new F26Dot6(this.stack.pop());
            const l = this.stack.pop();
            console.log(`CVT[${l}] = ${v.value/64}`);
            this.cvt[l] = v;
        } else if (opcode == 0x45) {
            // RCVT[]
            const n = this.stack.pop();
            this.stack.push(this.cvt[n].value);
        } else if ((opcode & ~1) == 0x46) {
            // GC[]
            const useCurrentPosition = (opcode & 1) == 0;
            const p = this.stack.pop();
            console.log(`get ${useCurrentPosition ? "current" : "original"} position of ${p}`);
            this.stack.push(0); // TODO
        } else if (opcode == 0x51) {
            // LTEQ[]
            const b = this.stack.pop();
            const a = this.stack.pop();
            this.stack.push(a <= b ? 1 : 0);
        } else if (opcode == 0x53) {
            // GTEQ[]
            const b = this.stack.pop();
            const a = this.stack.pop();
            this.stack.push(a >= b ? 1 : 0);
        } else if (opcode == 0x54) {
            // EQ[]
            const b = this.stack.pop();
            const a = this.stack.pop();
            this.stack.push(a == b ? 1 : 0);
        } else if (opcode == 0x56) {
            // ODD[]
            const a = new F26Dot6(this.stack.pop());
            this.stack.push(this.round(a, DistanceType.GRAY).value == 64 ? 1 : 0);
        } else if (opcode == 0x58) {
            // IF[]
            const condition = this.stack.pop();
            if (! condition) {
                console.log("skip if block");
                let ifCount = 0;
                while (true) {
                    const pos = this.skipTo([ 0x58, 0x59, 0x1b ]);
                    if (pos == 0) {
                        console.log("nested++");
                        ifCount++;
                    } else if (ifCount == 0) {
                        console.log("to", pos);
                        break;
                    } else {
                        console.log("nested--");
                        ifCount--;
                    }
                }
            }
        } else if (opcode == 0x59) {
            // EIF[]
        } else if (opcode == 0x60) {
            // ADD[]
            const b = new F26Dot6(this.stack.pop());
            const a = new F26Dot6(this.stack.pop());
            this.stack.push(a.add(b).value)
        } else if (opcode == 0x61) {
            // SUB[]
            const b = new F26Dot6(this.stack.pop());
            const a = new F26Dot6(this.stack.pop());
            this.stack.push(a.sub(b).value)
        } else if (opcode == 0x62) {
            // DIV[]
            const b = new F26Dot6(this.stack.pop());
            const a = new F26Dot6(this.stack.pop());
            this.stack.push(a.div(b).value)
        } else if (opcode == 0x64) {
            // ABS[]
            const a = new F26Dot6(this.stack.pop());
            this.stack.push(a.abs().value)
        } else if (opcode == 0x66) {
            // FLOOR[]
            const a = new F26Dot6(this.stack.pop());
            this.stack.push(a.floor().value)
        } else if ((opcode & ~3) == 0x68) {
            // ROUND[]
            const distanceType = makeDistanceType(opcode & 3);
            const n = new F26Dot6(this.stack.pop());
            this.stack.push(this.round(n, distanceType).value);
        } else if (opcode == 0x76) {
            // SROUND[]
            this.graphicsState.roundParameters = new RoundParameters(this.stack.pop());
        } else if (opcode == 0x78) {
            // JROT[]
            const condition = this.stack.pop();
            const offset = this.stack.pop();
            if (condition) {
                this.pc += offset - 1;
            }
        } else if (opcode == 0x85) {
            // SCANCTRL[]
            this.graphicsState.scanControl = this.stack.pop();
        } else if (opcode == 0x8a) {
            // ROLL[]
            const n = this.stack.pop();
            const m = this.stack.pop();
            const p = this.stack.pop();
            this.stack.push(m);
            this.stack.push(n);
            this.stack.push(p);
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
        } else if ((opcode & ~0x1F) == 0xC0) {
            // MDRP[]
            const options = opcode & 0x1f;
            const p = this.stack.pop();
            console.log(`[MDRP] move direct relative point ${p}`);
        } else if ((opcode & ~0x1F) == 0xE0) {
            // MIRP[]
            const options = opcode & 0x1f;
            const cvt = this.cvt[this.stack.pop()];
            const p = this.stack.pop();
            console.log(`[MIRP] move relative point ${p} by ${cvt.value / 64}`);
        } else {
            throw `unknown opcode ${opcode.toString(16)}`;
        }
    }

    round(n: F26Dot6, distanceType: DistanceType): F26Dot6 {
        // TODO implement rounding
        return new F26Dot6(Math.trunc(n.value / 64) * 64);
    }

    skipTo(opcodes: Array<number>) {
        while (true) {
            const op = this.instructions[this.pc++];
            const posIndex = opcodes.indexOf(op);
            if (posIndex >= 0) {
                return posIndex;
            } else if ((op & ~7) == 0xb0) {
                // PUSHB[]
                const n = (op & 7) + 1;
                this.pc += n;
            } else if ((op & ~7) == 0xb8) {
                // PUSHW[]
                const n = (op & 7) + 1;
                this.pc += n * 2;
            } else if (op == 0x40) {
                // NPUSHB[]
                const n = this.instructions[this.pc++];
                this.pc += n;
            }
        }
    }
}

function decodeInstructions(instructions: Array<number>, initialPc: number, count: number) {
    let pc = initialPc;
    while (pc < instructions.length && count-- > 0) {
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
            instr += ("ELSE[]")
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

export interface ScaledGlyph {
    bounds: Rectangle,
    endPtsOfContours: Array<number>,
    points: Array<GlyphPoint>
}

function scaleGlyph(glyphDefinition: TTFGlyphDescription, scale: number): ScaledGlyph {
    return {
        bounds: {
            xMin: scaleNumber(glyphDefinition.bounds.xMin, scale).value,
            yMin: scaleNumber(glyphDefinition.bounds.yMin, scale).value,
            xMax: scaleNumber(glyphDefinition.bounds.xMax, scale).value,
            yMax: scaleNumber(glyphDefinition.bounds.yMax, scale).value
        },
        endPtsOfContours: glyphDefinition.endPtsOfContours,
        points: glyphDefinition.points.map(p => ({
            x: scaleNumber(p.x, scale).value,
            y: scaleNumber(p.y, scale).value,
            onCurve: p.onCurve
        })).concat(
            { x: 0, y: 0, onCurve: false },
            { x: scaleNumber(glyphDefinition.metrics.advanceWidth, scale).value, y: 0, onCurve: false})
    }
}

function scaleNumber(v: number, scale: number) {
    return new F26Dot6(Math.ceil(v * 64 * scale));
}

export function make(fontDefinition: FontDefinition, glyph: string, pointSize: number, resolution: number) {
    const scale = fontDefinition.scale(pointSize, resolution);
    const evaluator = new Evaluator(fontDefinition.cvt.map(v => scaleNumber(v, scale)));
    const glyphDefinition = fontDefinition.getGlyph(glyph);
    evaluator.evaluate(fontDefinition.fpgm);
    evaluator.evaluate(fontDefinition.prep);
    let scaledGlyph = null;
    if (glyphDefinition) {
        scaledGlyph = scaleGlyph(glyphDefinition, scale);
        evaluator.start(glyphDefinition.instructions, scaledGlyph);
    }
    return {
        glyphDefinition: scaledGlyph,
        step() {
            decodeInstructions(evaluator.instructions, evaluator.pc, 1);
            evaluator.evaluateOne();
        }
    };
}
