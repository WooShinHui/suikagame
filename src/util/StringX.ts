/**
 * 문자열에서 특정 키워드 기준으로 잘라서 배열화한다.
 * $text : "오늘은 날씨가 좋지만 내일은 날씨가 흐리다."
 * $keyworld : "날씨"
 * $returns : ['오늘은 ', '날씨', '가 좋지만 내일은 ', '날씨', '가 흐리다.']
 * @param $text
 * @param $keyword
 * @returns
 */
export function keywordSplit($text: string, $keyword: string): Array<string> {
    const parts = $text.split($keyword);
    const result = [];
    for (let i = 0; i < parts.length; i++) {
        if (parts[i]) result.push(parts[i]);
        if (i < parts.length - 1) result.push($keyword);
    }
    return result;
}

export function keywordSpanSplit(
    $text: string,
    $keyword: string,
    $class: string
): string {
    const parts = $text.split($keyword);
    let result = '';
    for (let i = 0; i < parts.length; i++) {
        if (parts[i]) result += parts[i];
        if (i < parts.length - 1)
            result += `<span class="${$class}">${$keyword}</span>`;
    }
    return result;
}
