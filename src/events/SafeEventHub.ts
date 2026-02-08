type EventListener = (e?: any) => void;

class SafeEventHub {
    private events = new Map<string, Set<EventListener>>();
    private debug = true;

    on(type: string, listener: EventListener) {
        if (!this.events.has(type)) this.events.set(type, new Set());
        this.events.get(type)!.add(listener);
    }

    off(type: string, listener: EventListener) {
        this.events.get(type)?.delete(listener);
    }

    emit(type: string, data?: any) {
        if (this.debug) {
            console.log(`%c[EVT] ${type}`, 'color:#4FC3F7;font-weight:600');
        }

        this.events.get(type)?.forEach((fn) => fn({ type, data }));
    }

    once(type: string, listener: EventListener) {
        const wrapper: EventListener = (e) => {
            listener(e);
            this.off(type, wrapper);
        };
        this.on(type, wrapper);
    }

    clear() {
        this.events.clear();
    }
}

export const EVT_HUB_SAFE = new SafeEventHub();
