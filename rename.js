const fs = require('fs');
const path = require('path');

// package.json 파일 경로
const packageJsonPath = './package.json';

// package.json 읽기
fs.readFile(packageJsonPath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading package.json:', err);
        return;
    }

    const packageJson = JSON.parse(data);

    // source 값 추출
    const oldSource = packageJson.source;

    // 새 source 값 (여기에 변경하고 싶은 값 입력)
    const newSource = 'intro.html'; // 예시로 새 파일 이름

    // source 값 변경
    packageJson.source = newSource;

    // 스크립트에서 oldSource 값을 newSource로 교체
    for (const scriptKey in packageJson.scripts) {
        if (packageJson.scripts.hasOwnProperty(scriptKey)) {
            packageJson.scripts[scriptKey] = packageJson.scripts[
                scriptKey
            ].replace(new RegExp(oldSource, 'g'), newSource);
        }
    }

    // 변경된 내용을 다시 package.json에 저장
    fs.writeFile(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2),
        'utf8',
        (err) => {
            if (err) {
                console.error('Error writing to package.json:', err);
            } else {
                console.log(
                    `Successfully updated package.json with new source: ${newSource}`
                );
            }
        }
    );

    // 파일 이름 변경
    const oldFilePath = path.join(__dirname, oldSource);
    const newFilePath = path.join(__dirname, newSource);

    // 파일 이름이 변경되었는지 확인하고, 변경
    fs.rename(oldFilePath, newFilePath, (err) => {
        if (err) {
            console.error('Error renaming file:', err);
        } else {
            console.log(`Successfully renamed ${oldSource} to ${newSource}`);
        }
    });
});
