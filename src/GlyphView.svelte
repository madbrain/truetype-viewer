
<svg xmlns="http://www.w3.org/2000/svg" height="700" viewBox="{bounds.xMin - 100} {-100} {bounds.xMax + 400} {yOffset - bounds.yMin + 200}">
    
    <rect x="{bounds.xMin - 100}" y="{-100}" width="{bounds.xMax + 400}" height="{yOffset - bounds.yMin + 200}" fill="white" stroke="none" />

    <!-- <rect x="{bounds.xMin}" y="{yOffset - bounds.yMax}" width="{bounds.xMax}" height="{yOffset - bounds.yMin}" fill="none" stroke="green" /> -->

    {#each yGrid as i}
        <line x1="{bounds.xMin - 500}" y1="{yOffset - i * 64}"
            x2="{bounds.xMax + 500}" y2="{yOffset - i * 64}"
            fill="none" stroke="{i == 0 ? "red" : "gray"}" stroke-width="2px"/>
    {/each}
    {#each xGrid as i}
        <line x1="{i * 64}" y1="{-500}"
            x2="{i * 64}" y2="{yOffset - bounds.yMin + 500}"
            fill="none" stroke="{i == 0 ? "red" : "gray"}" stroke-width="2px"/>
    {/each}

    {#each contours as contour}
    <path d="{toPath(yOffset, contour)}" fill="none" stroke="blue" stroke-width="4px"/>
    {/each}
    {#each highlight as h}
    <circle cx="{glyphDefinition.points[h].x}" cy="{yOffset - glyphDefinition.points[h].y}" r="8" fill="red" stroke="none" />
    {/each}
    {#each glyphDefinition.points as point, i}
    <circle cx="{point.x}" cy="{yOffset - point.y}" r="4" fill="black" />
    <text x="{point.x+5}" y="{yOffset - point.y+5}" font-size="25">{i}</text>
    {/each}

    {#each pixels as point}
    <rect x="{point.x-32}" y="{yOffset - point.y - 32}" width="64" height="64" fill="black" opacity="0.5" />
    {/each}
    
</svg>

<script>
import { onMount } from 'svelte';
export let glyphDefinition;
export let highlight = [ ];
$: bounds = glyphDefinition.bounds;
$: yOffset = glyphDefinition.bounds.yMax;
$: contours = splitCountours(glyphDefinition);
$: xGrid = gridRange(bounds.xMin, bounds.xMax);
$: yGrid = gridRange(bounds.yMin, bounds.yMax);
$: pixels = scanLines(bounds, contours);

function splitCountours(glyphDefinition) {
    const result = [];
    let last = 0;
    glyphDefinition.endPtsOfContours.forEach(endPoint => {
        result.push(glyphDefinition.points.slice(last, endPoint+1));
        last = endPoint+1;
    });
    return result;
}

function gridRange(min, max) {
    return range(
        Math.trunc((min + Math.sign(min)*63) / 64),
        4 + Math.trunc((max + Math.sign(max)*63) / 64));
}

function range(min, max) {
    const result = [];
    for (let i = min; i < max; ++i) {
        result.push(i);
    }
    return result;
}

function toPath(yMax, points) {
    let result = "";
    let i = 0;
    while (i < points.length) {
        const { x, y, onCurve } = points[i];
        if (i == 0) {
            result += `M${x},${yMax - y}`;
        } else if (onCurve) {
            result += ` L${x},${yMax - y}`;
        } else {
            let next;
            if ((i+1) == points.length) {
                next = points[0];
            } else {
                next = points[i+1];
            }
            if (!next.onCurve) {
                // TODO if next is also off curve use middle point as on curve
                console.log("TODO double off curve");
            }
            result += ` Q${x},${yMax - y},${next.x},${yMax - next.y}`;
            i += 1;
        }
        i += 1;
    }
    result += " Z";
    return result;
}

function scanLines(bounds, contours) {
    let result = [];
    let yScan = Math.trunc(bounds.yMin / 64) * 64 - 32;
    while (yScan < bounds.yMax) {
        const inter = intersectContours(yScan, contours);
        result = result.concat(scanLine(yScan, inter))
        yScan += 64;
    }
    return result;
}

function scanLine(yScan, intersects) {
    const pixels = [];
    if (intersects.length > 0) {
        let x = Math.trunc((intersects[0] + 31) / 64) * 64 + 32;
        let i = 1;
        let inGlyph = true;
        while (i < intersects.length) {
            while (x <= intersects[i]) {
                if (inGlyph) {
                    pixels.push({x, y: yScan});
                }
                x += 64;
            }
            i++;
            inGlyph = !inGlyph;
        }
    }
    return pixels;
}

function intersectContours(scanY, contours) {
    let result = [];
    for (let points of contours) {
        result = result.concat(intersect(scanY, points));
    }
    result.sort((a, b) => a - b);

    // TODO filtering distinct points is not the correct solution
    const filtered = [];
    result.forEach((x, i) => {
        if (i == 0 || x != filtered[filtered.length-1]) {
            filtered.push(x);
        }
    });
    return filtered;
}

function intersect(scanY, points) {
    const result = [];
    let i = 0;
    while (i < points.length) {
        const { x, y, onCurve } = points[i];
        if (i > 0) {
            if (onCurve) {
                result.push(...intersectLine(scanY, points[i-1], {x, y}));
            } else {
                let next;
                if ((i+1) == points.length) {
                    next = points[0];
                } else {
                    next = points[i+1];
                }
                if (!next.onCurve) {
                    // TODO if next is also off curve use middle point as on curve
                    console.log("TODO double off curve");
                }
                result.push(...intersectQuad(i-1, scanY, points[i-1], {x, y}, next));
                i += 1;
            }
        }
        i += 1;
    }
    if (i == points.length) {
        result.push(...intersectLine(scanY, points[i-1], points[0]));
    }
    return result;
}

function intersectLine(scanY, p1, p2) {
    if ((p2.x - p1.x) != 0) {
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const a = (p2.y - p1.y) / (p2.x - p1.x);
        const scanX = (scanY - p1.y + a*p1.x) / a;
        if (minX <= scanX && scanX <= maxX) {
            return [scanX];
        }
    } else {
        // vertical line
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        if (minY <= scanY && scanY <= maxY) {
           return [p1.x];
        }
    }
    return [];
}

function lerp(a, b, t) {
    return a * (1 - t) + b * t;
}

function intersectQuad(i, scanY, p1, p2, p3) {
    const a = p1.y - 2*p2.y + p3.y;
    const b = (2 * (p2.y - p1.y)) / a;
    const c = (p1.y - scanY) / a;

    const roots = [];
    const delta = b*b - 4*c;
    if (delta > 0) {
        roots.push((-b + Math.sqrt(delta))/2);
        roots.push((-b - Math.sqrt(delta))/2);
    } else if (delta == 0) {
        roots.push(-b/2);
    }
    return roots
        .filter(t => t >= 0 && t <= 1)
        .map(t => lerp(lerp(p1.x, p2.x, t), lerp(p2.x, p3.x, t), t));
}
</script>