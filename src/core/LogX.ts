class LogX {
    private _wrap: HTMLDivElement;
    private _textarea: HTMLTextAreaElement;

    private bDrag: boolean;

    private dx: number;
    private dy: number;

    constructor() {
        this.bDrag = false;
        this._wrap = document.createElement('div') as HTMLDivElement;
        this._textarea = document.createElement(
            'textarea'
        ) as HTMLTextAreaElement;

        this._wrap.style.position = 'absolute';

        this._textarea.style.width = '194px';
        this._textarea.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this._textarea.style.color = 'white';

        const drager = document.createElement('div') as HTMLDivElement;
        drager.style.width = '200px';
        drager.style.height = '40px';
        drager.style.background = 'black';
        drager.addEventListener('mousedown', ($e: MouseEvent) => {
            this.onDown($e);
        });

        window.addEventListener('mouseup', () => {
            this.onUp();
        });

        window.addEventListener('mousemove', ($e: MouseEvent) => {
            this.onMove($e);
        });
        this._wrap.appendChild(drager);

        this._textarea.rows = 10;
        this._wrap.appendChild(this._textarea);

        document.body.appendChild(this._wrap);

        this._wrap.style.top = `${100}px`;
    }

    public showLog($log: any) {
        if (typeof $log === 'string' || typeof $log === 'number') {
            this._textarea.value += `${$log}\n`;
            return;
        }
    }

    private onDown($e): void {
        const sx = $e.clientX;
        const sy = $e.clientY;

        const bound = this._wrap.getBoundingClientRect();

        this.dx = sx - bound.x;
        this.dy = sy - bound.y;

        this.bDrag = true;
    }

    private onUp(): void {
        this.bDrag = false;
    }

    private onMove($e: MouseEvent): void {
        if (this.bDrag) {
            const px = $e.clientX - this.dx;
            const py = $e.clientY - this.dy;

            this._wrap.style.left = `${px}px`;
            this._wrap.style.top = `${py}px`;
        }
    }
}

export default LogX;
