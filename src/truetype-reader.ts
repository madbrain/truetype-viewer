
class DataStream {
    private data: Uint8Array;
    private index = 0;
    
    constructor(data: Uint8Array) {
        this.data = data;
    }

    readByte() {
        const data = this.data[this.index] & 0xFF;
        this.index += 1
        return data;
    }

    readBytes(amount: number): Array<number> {
        const result = [];
        for (let i = 0; i < amount; ++i) {
            result.push(this.data[this.index + i]);
        }
        this.index += amount;
        return result;
    }

    atEnd() {
        return this.index == this.data.length;
    }

    position() {
        return this.index;
    }

    seek(position: number) {
        this.index = position;
    }

    skip(amount: number) {
        this.index += amount;
    }

    readFixed() {
        return this.readInt(4) / 0x10000;
    }

    readFWord() {
        const v = this.readInt16();
        if (v & 0x8000) {
            return v - 0x10000;
        }
        return v;
    }

    readLongDateTime() {
        let data = this.readInt32() << 32;
        data |= this.readInt32();
        return data;
    }

    readString(size: number) {
        let result = "";
        for (let i = 0; i < size; ++i) {
            result += String.fromCharCode(this.data[this.index + i]);
        }
        this.index += size
        return result;
    }

    readInt32() {
        return this.readInt(4);
    }

    readInt16() {
        return this.readInt(2);
    }

    readInt(size: number) {
        let value = 0;
        for (let i = 0; i < size; ++i) {
            value = (value << 8) | (this.data[this.index] & 0xFF);
            this.index += 1;
        }
        return value;
    }
}

interface Span {
    start: number;
    end: number;
}

function mergeSpan(a: Span, b: Span) {
    return { start: Math.min(a.start, b.start), end: Math.max(a.end, b.end) };
}

class BaseTree {
    label: string = "";
    children = [];
    span: Span;

    field(name: string, value) {
        this.children.push({ label: `${name}: ${value}`});
        this[name] = value;
    }

    fieldSpan(name: string, stream: DataStream, getter: () => any) {
        const start = stream.position();
        const value = getter();
        const end = stream.position();
        this.children.push({ label: `${name}: ${value}`, span: {start, end}});
        this[name] = value;
        return value;
    }

    computeSpan() {
        let span = null;
        this.children.forEach(c => {
            if (c.span) {
                if (span) {
                    span = mergeSpan(span, c.span);
                } else {
                    span = c.span;
                }
            }
        })
        if (span) {
            this.span = span;
        }
    }

    composite(name: string, children) {
        this.children.push({ label: name, children });
    }
}

class TTFOffsetSubtable extends BaseTree {
    scalerType: number;
    numTables: number;
    searchRange: number;
    entrySelector: number;
    rangeShift: number;
    constructor(stream: DataStream) {
        super();
        this.label = "Offset Subtable";
        this.fieldSpan("scalerType", stream, () => stream.readInt32());
        this.fieldSpan("numTables", stream, () => stream.readInt16());
        this.fieldSpan("searchRange", stream, () => stream.readInt16());
        this.fieldSpan("entrySelector", stream, () => stream.readInt16());
        this.fieldSpan("rangeShift", stream, () => stream.readInt16());
        this.computeSpan();
    }
}

class TTFTableDirectoryEntry extends BaseTree {
    tag: string;
    checkSum: number;
    offset: number;
    length: number;
    constructor(stream: DataStream) {
        super();
        this.fieldSpan("tag", stream, () => stream.readString(4));
        this.fieldSpan("checkSum", stream, () => stream.readInt32());
        this.fieldSpan("offset", stream, () => stream.readInt32());
        this.fieldSpan("length", stream, () => stream.readInt32());
        this.computeSpan();
        this.label = this.tag;
    }
}

class TTFHeadTable extends BaseTree {
    version: number;
    fontRevision: number;
    checkSumAdjustment: number;
    magic: number;
    flags: number;
    unitsPerEm: number;
    created: number;
    modified: number;
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
    macStyle: number;
    lowestRecPPEM: number;
    fontDirectionHint: number;
    indexToLocFormat: number;
    glyphDataFormat: number;

    constructor(stream: DataStream) {
        super();
        this.label = "Table head";
        this.fieldSpan("version", stream, () => stream.readFixed());
        this.fieldSpan("fontRevision", stream, () => stream.readFixed());
        this.fieldSpan("checkSumAdjustment", stream, () => stream.readInt32());
        this.fieldSpan("magic", stream, () => stream.readInt32());
        if (this.magic != 0x5F0F3CF5) {
            throw "bad magic in head";
        }
        this.fieldSpan("flags", stream, () => stream.readInt16());
        this.fieldSpan("unitsPerEm", stream, () => stream.readInt16());
        this.fieldSpan("created", stream, () => stream.readLongDateTime());
        this.fieldSpan("modified", stream, () => stream.readLongDateTime());
        this.fieldSpan("xMin", stream, () => stream.readFWord());
        this.fieldSpan("yMin", stream, () => stream.readFWord());
        this.fieldSpan("xMax", stream, () => stream.readFWord());
        this.fieldSpan("yMax", stream, () => stream.readFWord());
        this.fieldSpan("macStyle", stream, () => stream.readInt16());
        this.fieldSpan("lowestRecPPEM", stream, () => stream.readInt16());
        this.fieldSpan("fontDirectionHint", stream, () => stream.readInt16());
        this.fieldSpan("indexToLocFormat", stream, () => stream.readInt16());
        this.fieldSpan("glyphDataFormat", stream, () => stream.readInt16());
        this.computeSpan();
    }
}

class TTFNameTable extends BaseTree {
    format: number;
    count: number;
    stringOffset: number;
    names: Array<{id: number, value: string}>;

    constructor(stream: DataStream) {
        super();
        const s = stream.position();
        this.label = "Table name";
        this.fieldSpan("format", stream, () => stream.readInt16());
        this.fieldSpan("count", stream, () => stream.readInt16());
        this.fieldSpan("stringOffset", stream, () => stream.readInt16());

        const records = [];
        for (let i = 0; i < this.count; ++i) {
            const platformID = stream.readInt16();
            const platformSpecificID = stream.readInt16();
            const languageID = stream.readInt16();
            const nameID = stream.readInt16();
            const length = stream.readInt16();
            const offset = stream.readInt16();
            records.push({platformID, platformSpecificID, languageID, nameID, length, offset});
        }
        this.names = records.filter(record => record.platformID == 1).map(record => {
            stream.seek(s + this.stringOffset + record.offset);
            return { id: record.nameID, value: stream.readString(record.length) };
        });
        this.composite("Name Records", records.map(({platformID, platformSpecificID, languageID, nameID, length, offset}, i) => ({ label: `${i}`, children: [
            {label: `platformID: ${platformID}`},
            {label: `platformSpecificID: ${platformSpecificID}`},
            {label: `languageID: ${languageID}`},
            {label: `nameID: ${nameID}`},
            {label: `length: ${length}`},
            {label: `offset: ${offset}`}
        ]})));
        this.composite("Names", this.names.map(({id, value}) => ({ label: `${nameID2label(id)}: ${value}` })));
        this.computeSpan();
    }

    get(id: number) {
        const record = this.names.find(record => record.id == id);
        if (record) {
            return record.value;
        }
        return "";
    }
}

function nameID2label(id: number) {
    if (id == 0) {
        return "Copyright";
    }
    if (id == 1) {
        return "Font Family";
    }
    if (id == 2) {
        return "Font Subfamily";
    }
    if (id == 3) {
        return "Unique Subfamily Identification";
    }
    if (id == 4) {
        return "Full Font Name";
    }
    if (id == 5) {
        return "Version";
    }
    if (id == 6) {
        return "PostScript Name";
    }
    if (id == 7) {
        return "Trademark notice";
    }
    return `unknown[${id}]`;
}

class TTFMaxpTable extends BaseTree {
    version: number;
    numGlyphs: number;
    maxPoints: number;
    maxContours: number;
    maxComponentPoints: number;
    maxComponentContours: number;
    maxZones: number;
    maxTwilightPoints: number;
    maxStorage: number;
    maxFunctionDefs: number;
    maxInstructionDefs: number;
    maxStackElements: number;
    maxSizeOfInstructions: number;
    maxComponentElements: number;
    maxComponentDepth: number;

    constructor(stream: DataStream) {
        super();
        this.label = "Table maxp";
        this.fieldSpan("version", stream, () => stream.readFixed());
        this.fieldSpan("numGlyphs", stream, () => stream.readInt16());
        this.fieldSpan("maxPoints", stream, () => stream.readInt16());
        this.fieldSpan("maxContours", stream, () => stream.readInt16());
        this.fieldSpan("maxComponentPoints", stream, () => stream.readInt16());
        this.fieldSpan("maxComponentContours", stream, () => stream.readInt16());
        this.fieldSpan("maxZones", stream, () => stream.readInt16());
        this.fieldSpan("maxTwilightPoints", stream, () => stream.readInt16());
        this.fieldSpan("maxStorage", stream, () => stream.readInt16());
        this.fieldSpan("maxFunctionDefs", stream, () => stream.readInt16());
        this.fieldSpan("maxInstructionDefs", stream, () => stream.readInt16());
        this.fieldSpan("maxStackElements", stream, () => stream.readInt16());
        this.fieldSpan("maxSizeOfInstructions", stream, () => stream.readInt16());
        this.fieldSpan("maxComponentElements", stream, () => stream.readInt16());
        this.fieldSpan("maxComponentDepth", stream, () => stream.readInt16());
        this.computeSpan();
    }
}

class TTFCmapTable extends BaseTree {
    version: number;
    numberSubtables: number;
    glyphIndexArray: number[];

    constructor(stream: DataStream) {
        super();
        this.label = "Table cmap";
        const startOfTable = stream.position();
        this.field("version", stream.readInt16());
        this.field("numberSubtables", stream.readInt16());
        const subTables = [];
        for (let i = 0; i < this.numberSubtables; ++i) {
            const platformID = stream.readInt16();
            const platformSpecificID = stream.readInt16();
            const offset = stream.readInt32();
            subTables.push({platformID, platformSpecificID, offset});
        }
        this.composite("Subtables headers", subTables.map(({platformID, platformSpecificID, offset}, i) => ({ label: `${i}`, children: [
            {label: `platformID: ${platformID}`},
            {label: `platformSpecificID: ${platformSpecificID}`},
            {label: `offset: ${offset}`}
        ]})));

        subTables.forEach(({platformID, platformSpecificID, offset}) => {
            stream.seek(startOfTable + offset)
            const format = stream.readInt16();
            const length = stream.readInt16();
            if (format == 0) {
                const language = stream.readInt16();
                this.glyphIndexArray = stream.readBytes(256);
                this.composite(`Subtable ${platformID}/${platformSpecificID}`, [
                    {label: `format: ${format}`},
                    {label: `length: ${length}`},
                    {label: `language: ${language}`},
                    {label: "glyph indexes", children: this.glyphIndexArray.map((v, i) => ({label: `${i}: ${v}`}))}
                ]);
            } else if (format == 4) {
                this.composite(`Subtable ${platformID}/${platformSpecificID}`, [
                    {label: `format: ${format}`},
                    {label: `length: ${length}`}
                ]);
            }
        });
    }

    glyphIndex(char: string) {
        return this.glyphIndexArray[char.charCodeAt(0)];
    }
}

class TTFLocaTable extends BaseTree {
    public offsets: Array<number> = [];
    constructor(stream: DataStream, size: number, isShort: boolean) {
        super();
        this.label = "Table loca";
        if (isShort) {
            for (let i = 0; i < (size+1); ++i) {
                this.offsets.push(stream.readInt16()*2)
            }
        } else {
            for (let i = 0; i < (size+1); ++i) {
                this.offsets.push(stream.readInt32())
            }
        }
        this.children = this.offsets.map((v, i) => ({ label: `${i}: ${v}`}))
    }

    size(index: number) {
        return this.offsets[index+1] - this.offsets[index]
    }
}

class TTFHheaTable extends BaseTree {
    numOfLongHorMetrics: number;
    constructor(stream: DataStream) {
        super();
        this.label = "Table hhea";
        this.fieldSpan("version", stream, () => stream.readFixed());
        this.fieldSpan("ascent", stream, () => stream.readFWord());
        this.fieldSpan("descent", stream, () => stream.readFWord());
        this.fieldSpan("lineGap", stream, () => stream.readFWord());
        this.fieldSpan("advanceWidthMax", stream, () => stream.readFWord());
        this.fieldSpan("minLeftSideBearing", stream, () => stream.readFWord());
        this.fieldSpan("minRightSideBearing", stream, () => stream.readFWord());
        this.fieldSpan("xMaxExtent", stream, () => stream.readFWord());
        this.fieldSpan("caretSlopeRise", stream, () => stream.readInt16());
        this.fieldSpan("caretSlopeRun", stream, () => stream.readInt16());
        this.fieldSpan("caretOffset", stream, () => stream.readFWord());
        stream.skip(4*2);
        this.fieldSpan("metricDataFormat", stream, () => stream.readInt16());
        this.fieldSpan("numOfLongHorMetrics", stream, () => stream.readInt16());
        this.computeSpan();
    }
}

export interface Metrics {
    advanceWidth: number,
    leftSideBearing: number
}

class TTFHmtxTable extends BaseTree {
    numOfLongHorMetrics: number;
    metrics: Metrics[] = [];
    constructor(stream: DataStream, size: number) {
        super();
        this.label = "Table hmtx";
        for (let i = 0; i < size; ++i) {
            const advanceWidth = stream.readInt16();
            const leftSideBearing = stream.readFWord();
            this.metrics.push({ advanceWidth, leftSideBearing});
        }
        this.children = this.metrics.map((v, i) => ({
            label: `${i}`,
            children: [
                { label: `advanceWidth: ${v.advanceWidth}`},
                { label: `leftSideBearing: ${v.leftSideBearing}`}
            ]
        }));
        // TODO read remaining leftSideBearings
    }
}

class TTFCvtTable extends BaseTree {
    entries = [];
    constructor(stream: DataStream, size: number) {
        super();
        this.label = "Table cvt";
        for (let i = 0; i < size / 2; ++i) {
            this.entries.push(stream.readFWord());
        }
        this.children = this.entries.map((v, i) => ({
            label: `${i}: ${v}`,
        }));
    }
}

class TTFHintTable extends BaseTree {
    instructions: Array<number>;
    constructor(stream: DataStream, name: string, size: number) {
        super();
        this.label = `Table ${name}`;
        this.instructions = stream.readBytes(size);
    }
}

export interface Rectangle {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
}

export interface GlyphPoint {
    x: number;
    y: number;
    onCurve: boolean;
}

export class TTFGlyphDescription {
    bounds: Rectangle;
    instructions: Array<number>;
    points: GlyphPoint[] = [];
    endPtsOfContours: number[];

    constructor(stream: DataStream, public metrics: Metrics) {
        const numberOfContours = stream.readInt16();
        this.bounds = {
            xMin: stream.readFWord(),
            yMin: stream.readFWord(),
            xMax: stream.readFWord(),
            yMax: stream.readFWord()
        };
        if (numberOfContours >= 0) {
            this.endPtsOfContours = []
            for (let i = 0; i < numberOfContours; ++i) {
                this.endPtsOfContours.push(stream.readInt16());
            }
            const instructionLength = stream.readInt16();
            this.instructions = stream.readBytes(instructionLength);
            const flags = []
            while (flags.length <= this.endPtsOfContours[this.endPtsOfContours.length-1]) {
                const flag = stream.readByte()
                flags.push(flag)
                if (flag & (1 << 3)) {
                    const len = stream.readByte();
                    for (let i = 0; i < len; ++i) {
                        flags.push(flag);
                    }
                }
            }
            const xCoordinates = [];
            for (let flag of flags) {
                let x = 0;
                if (flag & (1 << 1)) {
                    x = stream.readByte();
                    if (!(flag & (1 << 4))) {
                        x = - x;
                    }
                } else {
                    if (flag & (1 << 4)) {
                        x = 0;
                    } else {
                        x = stream.readFWord();
                    }
                }
                xCoordinates.push(x);
            }
            const yCoordinates = [];
            for (let flag of flags) {
                let y = 0;
                if (flag & (1 << 2)) {
                    y = stream.readByte()
                    if (!(flag & (1 << 5))) {
                        y = - y;
                    }
                } else {
                    if (flag & (1 << 5)) {
                        y = 0;
                    } else {
                        y = stream.readFWord();
                    }
                }
                yCoordinates.push(y);
            }
            let x = 0
            let y = 0
            for (let i = 0; i < xCoordinates.length; ++i) {
                x += xCoordinates[i];
                y += yCoordinates[i];
                this.points.push({x, y, onCurve: (flags[i] & 1) == 1});
            }
        } else {
            throw "composite glyph";
        }
    }
}

export interface FontDefinition {
    tree: BaseTree;
    cvt: Array<number>;
    fpgm: Array<number>;
    prep: Array<number>;
    scale(pointSize, resolution): number;
    getGlyph(char: string): any;
}

export function read(buffer: ArrayBuffer) {
    const byteBuffer = new Uint8Array(buffer);
    const stream = new DataStream(byteBuffer);
    const header = new TTFOffsetSubtable(stream);

    const tableDirectoryNode = {
        label: "Table Directory",
        children: []
    };
    const tableDirectory = {}
    for (let i = 0; i < header.numTables; ++i) {
        const tableDirEntry = new TTFTableDirectoryEntry(stream);
        tableDirectory[tableDirEntry.tag] = tableDirEntry;
        tableDirectoryNode.children.push(tableDirEntry);
    }

    stream.seek(tableDirectory["head"].offset);
    const head = new TTFHeadTable(stream);

    stream.seek(tableDirectory["name"].offset);
    const name = new TTFNameTable(stream);

    stream.seek(tableDirectory["maxp"].offset);
    const maxp = new TTFMaxpTable(stream);

    stream.seek(tableDirectory["cmap"].offset)
    const cmap = new TTFCmapTable(stream)

    stream.seek(tableDirectory["loca"].offset)
    const loca = new TTFLocaTable(stream, maxp.numGlyphs, head.indexToLocFormat == 0);
    
    stream.seek(tableDirectory["hhea"].offset)
    const hhea = new TTFHheaTable(stream);

    stream.seek(tableDirectory["hmtx"].offset)
    const hmtx = new TTFHmtxTable(stream, hhea.numOfLongHorMetrics);

    stream.seek(tableDirectory["cvt "].offset)
    const cvt = new TTFCvtTable(stream, tableDirectory["cvt "].length);

    stream.seek(tableDirectory["fpgm"].offset)
    const fpgm = new TTFHintTable(stream, "fpgm", tableDirectory["fpgm"].length);
    
    stream.seek(tableDirectory["prep"].offset)
    const prep = new TTFHintTable(stream, "prep", tableDirectory["prep"].length);
    
    const tree = {
        label: "TrueType Font",
        children: [ header, tableDirectoryNode, head, name, maxp, cmap, loca, hhea, hmtx, cvt, fpgm, prep ]
    }

    return {
        buffer: byteBuffer,
        tree,
        cvt: cvt.entries,
        names: name,
        fpgm: fpgm.instructions,
        prep: prep.instructions,
        scale(pointSize, resolution) {
            return pointSize * resolution / (72 * head.unitsPerEm);
        },
        getGlyph(char) {
            const glyphIndex = cmap.glyphIndex(char);
            if (loca.size(glyphIndex) > 0) {
                stream.seek(tableDirectory["glyf"].offset + loca.offsets[glyphIndex]);
                return new TTFGlyphDescription(stream, hmtx.metrics[glyphIndex]);
            }
            return null;
        }
    };
}