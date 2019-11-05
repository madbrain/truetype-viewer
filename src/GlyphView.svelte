
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
    
</svg>

<script>
export let glyphDefinition;
export let highlight = [ ];
$: bounds = glyphDefinition.bounds;
$: yOffset = glyphDefinition.bounds.yMax;
$: contours = splitCountours(glyphDefinition);
$: xGrid = gridRange(bounds.xMin, bounds.xMax);
$: yGrid = gridRange(bounds.yMin, bounds.yMax);

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
            // TODO if next is also off curve use middle point as on curve
            if ((i+1) == points.length) {
                next = points[0];
            } else {
                next = points[i+1];
            }
            result += ` Q${x},${yMax - y},${next.x},${yMax - next.y}`;
            i += 1;
        }
        i += 1;
    }
    result += " Z";
    return result;
}
</script>