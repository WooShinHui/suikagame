/**
 * 비트맵을 하나의 비트맵으로 합친다.
 * [가][나][다]=>[가나다]
 */
export function combinedBitmap($arr: Array<createjs.Bitmap>): createjs.Bitmap {
    const len = $arr.length;
    let h: number = 0;
    let mc = new createjs.MovieClip();
    let arr_x: Array<number> = [];
    let arr_h: Array<number> = [];
    let px: number = 0;
    for (const bitmap of $arr) {
        const bounds = bitmap.getBounds();
        h = Math.max(h, bounds.height);
        arr_x.push(px);
        arr_h.push(bounds.height);
        px += bounds.width >> 0;
    }

    for (let i = 0; i < len; i++) {
        $arr[i].x = arr_x[i];
        $arr[i].y = h / 2 - arr_h[i] / 2;
        mc.addChild($arr[i]);
    }

    mc.cache(0, 0, px, h);
    const bitmap = new createjs.Bitmap(mc.cacheCanvas);
    mc.uncache();
    return bitmap;
}

export function getMinimumBounds($bitmap: createjs.Bitmap): any {
    const image = $bitmap.image;
    const width = image.width;
    const height = image.height;

    // 임시 canvas 생성
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 이미지 그리기
    ctx.drawImage(image, 0, 0);

    // 픽셀 데이터 가져오기
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // 알파 유효 픽셀 범위 탐색
    let minX = width,
        minY = height,
        maxX = 0,
        maxY = 0;
    let found = false;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const alpha = data[i + 3]; // 알파 값

            if (alpha !== 0) {
                found = true;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (!found) {
        return null; // 알파 있는 픽셀이 없음
    }

    return {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
    };
}

export function isBitmapFullyTransparent($bitmap: createjs.Bitmap): boolean {
    const image = $bitmap.image;
    const width = image.width;
    const height = image.height;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // 모든 픽셀의 알파값이 0인지 확인
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] !== 0) {
            return false; // 알파값이 0이 아닌 픽셀이 있음
        }
    }

    return true; // 모든 픽셀이 완전 투명
}
