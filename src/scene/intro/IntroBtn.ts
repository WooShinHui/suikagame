import DomX from '../../core/DomX';
import { EVT_HUB, G_EVT } from '../../events/EVT_HUB';
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';

export class IntroBtn {
    constructor(container: HTMLElement) {
        this.container = container;
        this.currentUserId = localStorage.getItem('guest_user_id');
    }

    private rankingBtn: HTMLButtonElement;
    private guideBtn: HTMLButtonElement;
    private container: HTMLElement;
    private currentUserId: string = '';
    private isClicked: boolean = false;

    public create() {
        this.guideBtn = document.createElement('button');
        Object.assign(this.guideBtn.style, {
            position: 'absolute',
            width: '80px',
            height: '80px',
            zIndex: '200',
            left: '63px',
            top: '40px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            backgroundImage: `url("/assets/images/btn_question_s.png")`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
        });
        this.guideBtn.addEventListener('pointerdown', () => {
            this.guideBtn.style.backgroundImage = `url("/assets/images/btn_question_n.png")`;
        });
        this.guideBtn.addEventListener('pointerleave', () => {
            this.guideBtn.style.backgroundImage = `url("/assets/images/btn_question_s.png")`;
        });
        this.guideBtn.addEventListener('pointerup', () => {
            this.guideBtn.style.backgroundImage = `url("/assets/images/btn_question_s.png")`;
        });
        this.guideBtn.addEventListener('pointercancel', () => {
            this.guideBtn.style.backgroundImage = `url("/assets/images/btn_question_s.png")`;
        });
        this.guideBtn.onclick = () => {
            console.log('링크 연결');
            window.open('https://gamma.app/docs/-fnoox3bpettikfl?mode=doc');
        };

        this.rankingBtn = document.createElement('button');
        Object.assign(this.rankingBtn.style, {
            position: 'absolute',
            width: '80px',
            height: '80px',
            zIndex: '200',
            left: '169px',
            top: '40px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            backgroundImage: `url("/assets/images/btn_ranking_s.png")`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
        });
        this.rankingBtn.addEventListener('mousedown', () => {
            this.rankingBtn.style.backgroundImage = `url("/assets/images/btn_ranking_n.png")`;
        });
        this.rankingBtn.addEventListener('mouseleave', () => {
            this.rankingBtn.style.backgroundImage = `url("/assets/images/btn_ranking_s.png")`;
        });
        this.rankingBtn.addEventListener('mouseup', () => {
            this.rankingBtn.style.backgroundImage = `url("/assets/images/btn_ranking_s.png")`;
        });
        this.rankingBtn.onclick = () => {
            EVT_HUB_SAFE.emit(G_EVT.PLAY.REQUEST_RANK_LOAD, {
                mode: 'START',
                userId: this.currentUserId,
            });
        };

        this.container.appendChild(this.guideBtn);
        this.container.appendChild(this.rankingBtn);
    }
}
