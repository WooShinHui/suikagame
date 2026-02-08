export interface IRGB {
    r: number;
    g: number;
    b: number;
}

/**
 * HEX 컬러를 RGB 컬러로 바꿔준다.
 * '#FFFFFF' -> {r:255, g:255, b:255};
 * @param $hex
 */
export function getHexToRgb($hex: string): IRGB {
    const r = parseInt($hex.substring(1, 3), 16);
    const g = parseInt($hex.substring(3, 5), 16);
    const b = parseInt($hex.substring(5, 7), 16);
    return { r: r, g: g, b: b };
}
