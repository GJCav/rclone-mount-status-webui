"use strict";

function expand_units(value, units, factors) {
    let remain = value;
    let result = [];
    for (let i = 0; i < units.length; i++) {
        const unit = units[i];
        const factor = factors[i];
        let v = remain % factor;
        remain = Math.floor(remain / factor);
        result.push({value: Math.floor(v), unit});
        if (remain == 0) {
            break;
        }
    }

    // const last_idx = result.length - 1;
    // if (last_idx >= 1 && result[last_idx].value == 0) {
    //     result.pop();
    // }
    
    let result_str = result.reverse().map((e) => {
        return `${e.value}${e.unit}`;
    }).join(" ");
    return result_str;
}

function short_units(value, units, factors) {
    let i = 0;
    for (; i < units.length; i++) {
        const factor = factors[i];
        if (value < factor) {
            return `${value.toFixed(1)}${units[i]}`;
        }
        value /= factor;
    }

    return `${value.toFixed(1)}${units[i]}`;
}

export const second2hms = (seconds) => {
    const units = ["s", "m", "h", "d", "y"];
    const factors =    [60,  60,  24,  365];

    return expand_units(seconds, units, factors);
}

export const bytes2human = (bytes, mode="full") => {
    const units = ["B", "KB", "MB", "GB", "TB"];
    const factors =   [1024, 1024, 1024, 1024];

    if (mode == "short") {
        return short_units(bytes, units, factors);
    } else if (mode == "full") {
        return expand_units(bytes, units, factors);
    }
}

