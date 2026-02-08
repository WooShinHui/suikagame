param(
    [string]$inputFile,  # 수정할 HTML 파일 경로
    [string]$outputFile   # 수정된 내용을 저장할 파일 경로
)

# HTML 파일을 읽어서 경로 앞의 '/'를 제거
(Get-Content $inputFile) | ForEach-Object { $_ -replace '"/', '"' } | Set-Content $outputFile