/**
 * Player와 통신용
 * HybridApp 호출을 위한 싱글턴 매니저
 * Author: 김태신
 * Date: 2025-02-21
 */

declare global {
    interface Window {
        HybridApp?: any;
        onCompleteRecordSound: (id: string) => void;
        onExternalOnExit: () => void;
    }
}

export class ExternalMgr {
    private _status: number = 0;

    private static _handle: ExternalMgr;

    static get handle(): ExternalMgr {
        if (ExternalMgr._handle === undefined) {
            ExternalMgr._handle = new ExternalMgr();
        }
        return ExternalMgr._handle;
    }

    /**
     * 지정된 순번( nMenu )의 메뉴로 페이지 전환
     * 메뉴 순번 : 0, 1, 2, 3
     * @param {number} $n 이동할 메뉴 순번
     * @returns {number} 이동하였으면 true 아니면 false
     */
    public setMenu($n: number): boolean {
        if (window.HybridApp) {
            const bool = window.HybridApp.setMenu($n);
            return bool;
        }

        return false;
    }

    /**
     * 다음 메뉴 페이지로 전환
     */
    public nextMenu(): void {
        if (window.HybridApp) {
            window.HybridApp.nextMenu();
        }
    }

    /**
     * 플레이어에 저장된 현재 메뉴의 학습 진행상태를 가져온다.
     * 멤버 변수 _status에 값을 대입해 놓는다.
     * @returns {number} 0 : 미진행 / 1 : 진행중 / 2 : 진행완료
     */
    public getNowStatus(): number {
        if (window.HybridApp) {
            this._status = window.HybridApp.getNowStatus();
        }

        return this._status;
    }

    get status(): number {
        return this._status;
    }

    /**
     * 현재 활성화 메뉴 학습 완료시 호출
     * 단원별 학습완료는 각 메뉴별 학습완료를 기준으로 플레이어에서 처리
     */
    public completeContents(): void {
        if (window.HybridApp) {
            window.HybridApp.completeContents();
        }
    }

    public yesno($msg: string, $funcYes: string, $funcNo: string): void {
        if (window.HybridApp) {
            window.HybridApp.yesno($msg, $funcYes, $funcNo);
        }
    }

    /**
     * MP3 녹음을 시작한다.
     * ID 명은 중지시 파일명으로 저장된다.
     * @param {string} $id 생성시 지정할 ID(key)값
     */
    public startRecordMP3($id: string): void {
        if (window.HybridApp) {
            window.HybridApp.startRecordMP3($id);
        }
    }

    /**
     * 진행중인 녹음을 중지하고 MP3 파일로 저장된다.
     */
    public stopRecordMP3(): void {
        if (window.HybridApp) {
            window.HybridApp.stopRecordMP3();
        }
    }

    /**
     * 생성한 사운드를 재생한다.
     * @param {string} $id 생성시 지정한 ID(key)값
     * @param {boolean} $loop 반복 재생 여부
     * @param {number} $volume 볼륨 (0~1)
     * @param {string} $callback 재생 완료 호출하는 콜백함수명
     */
    public playSound(
        $id: string,
        $loop: boolean,
        $volume: number,
        $callback: string
    ): void {
        if (window.HybridApp) {
            window.HybridApp.playSound($id, $loop, $volume, $callback);
        }
    }

    /**
     * 재생중인 사운드를 일시 정지한다.
     * @param {string} $id 생성시 지정한 ID(key)값
     */
    public pauseSound($id: string): void {
        if (window.HybridApp) {
            window.HybridApp.pauseSound($id);
        }
    }

    /**
     * 재생할 사운드의 헤더 타임을 변경한다.
     * @param {string} $id 생성시 지정한 ID(key)값
     * @param {number} $ms 변경시킬 재생시간의 밀리초 단위 숫자
     */
    public seekSound($id: string, $ms: number): void {
        if (window.HybridApp) {
            window.HybridApp.seekSound($id, $ms);
        }
    }

    /**
     * 앱을 종료한다.
     * @param {boolean} $bool true면 확인 팝업 노출 / false는 바로 종료
     */
    public exit($bool: boolean): void {
        if (window.HybridApp) {
            window.HybridApp.exit($bool);
        }
    }

    /**
     * Base64 인코딩된 이미지 데이터를 png 또는 jpg로 변환하여 저장한다.
     * 저장이 성공되면 이미지 경로를 $reject 함수로 반환한다.
     * @param $strFile 저장할 파일 이름
     * @param $strBase64 URL문자열(Canvas.toDataURL("image/png")) - Base64 인코딩 된 이미지 데이터
     * @param $reject 저장 성공시 경로를 반환 받는 콜백 함수
     */
    public saveBase64ImgToPng(
        $strFile: string,
        $strBase64: string,
        $reject: Function
    ): void {
        if (window.HybridApp) {
            window.HybridApp.saveBase64ImgToPng($strFile, $strBase64);
            window.HybridApp.onImageSaved = ($strAbsolutePath: string) => {
                $reject($strAbsolutePath);
            };
        }
    }

    /**
     * 손글씨, 필기를 인식한다.
     * @param $type kor(한글,숫자,특수문자), eng(영어)
     * @param $jsonData  {"data":[{"filePath":"/storage/emulated/0/CJHP_TEST/1.png"},"filePath":"/storage/emulated/0/CJHP_TEST/2.png"}]}
     * @param $resolve 인식 성공시 값을 넘겨 받는 콜백 함수
     * @param $reject 인식 실패시 값을 넘겨 받는 콜백 함수
     */
    public convertCharacterCJ(
        $type: string,
        $jsonData: string,
        $resolve: Function,
        $reject: Function
    ): void {
        if (window.HybridApp) {
            window.HybridApp.onConvertResultsCharacterCJ = (
                $result: string
            ) => {
                console.log('@ 필기인식: 성공 ' + $result);
                $resolve($result);
            };

            window.HybridApp.onErrorCharacterCJ = ($result: string) => {
                console.log('필기인식: 실패 ' + $result);
                $reject($result);
            };

            window.HybridApp.convertCharacterCJ($type, $jsonData);
        }
    }

    /**
     * 카메라 화면을 보여준다
     * 카메라는 html 화면보다 아래 레이어에 보여진다.
     * @param $strCameraFacing 카메라 전면, 후면 선택 (front or back)
     * @param $x 카메라가 x값
     * @param $y  카메라의 y값
     * @param $wdith 카메라 너비
     * @param $height 카메라 높이이
     */
    public startCameraPreview(
        $strCameraFacing: string,
        $x: number,
        $y: number,
        $width: number,
        $height: number
    ): void {
        if (window.HybridApp) {
            window.HybridApp.startCameraPreview(
                $strCameraFacing,
                $x,
                $y,
                $width,
                $height
            );
        }
    }

    /**
     * 카메라 화면을 보여주는 것을 중지한다.
     */
    public stopCameraPreview(): void {
        if (window.HybridApp) window.HybridApp.stopCameraPreview();
    }

    /**
     * 전체 화면크기로 영상을 재생한다.
     * 영상 재생시 Web영역은 화면상에서 보이지 않도록 설정된다
     * @param $path 영상의 경로 ( CDN상의 상대경로 )
     * @param $controllerMode 영상콘트롤러 설정값 ( “auto” 자동숨김, “always” 항상보여짐, “none” 없음 )
     * @param $returnURL 영상재생 완료 후, 재생할 Html 컨텐츠 url ( zip파일내의 상대경로 )
     */
    public playMovie(
        $path: string,
        $controllerMode: string,
        $returnURL: string
    ): void {
        if (window.HybridApp) {
            window.HybridApp.playMovie($path, $controllerMode, $returnURL);
        }
    }

    /**
     * 플레이어 로드 후 학습 이어하기를 선택해서 들어왔는지를 확인한다.
     * 이 함수는 해당 파일이 처음 로드 되는 시점에서만 이어하기 클릭 여부 ( TRUE / FALSE )를 반환한다.
     * @returns
     */
    public isContinueStudy(): boolean {
        let bool = false;
        if (window.HybridApp) {
            bool = window.HybridApp.isContinueStudy();
        }

        return bool;
    }
}
