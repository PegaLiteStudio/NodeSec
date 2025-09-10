type TaskFn = () => Promise<void>;
type PositionCallback = (position: number) => void;

interface QueueTask {
    id: string;
    type: "theme" | "apk";
    fn: TaskFn;
    onPositionChange?: PositionCallback;
}

class CompileQueueManager {
    private queue: QueueTask[] = [];
    private running: QueueTask | null = null;

    addTask(id: string, type: "theme" | "apk", fn: TaskFn, onPositionChange?: PositionCallback) {
        const task: QueueTask = { id, type, fn, onPositionChange };
        this.queue.push(task);

        // notify its initial position if it's queued (not running immediately)
        if (onPositionChange) {
            const pos = this.getPosition(id);
            if (pos > 0) {
                onPositionChange(pos);
            }
        }

        this.runNext().catch(err => console.error("Queue runNext error:", err));
        return this.getPosition(id);
    }

    getPosition(id: string): number {
        if (this.running?.id === id) {
            return 0; // currently running
        }
        const index = this.queue.findIndex(t => t.id === id);
        return index === -1 ? -1 : index + 1;
    }

    private async runNext() {
        if (this.running) return; // already processing

        const task = this.queue.shift();
        if (!task) return;

        this.running = task;
        console.log(`[QUEUE] Starting ${task.type} task: ${task.id}`);

        // notify the task that it's now running
        if (task.onPositionChange) {
            task.onPositionChange(0);
        }

        // update positions for waiting tasks
        this.emitPositions();

        try {
            await task.fn();
            console.log(`[QUEUE] Finished ${task.type} task: ${task.id}`);
        } catch (err) {
            console.error(`[QUEUE] Failed ${task.type} task: ${task.id}`, err);
        } finally {
            this.running = null;
            this.emitPositions(); // update queue after finishing
            this.runNext().catch(err => console.error("Queue runNext error:", err));
        }
    }

    private emitPositions() {
        this.queue.forEach((task, index) => {
            if (task.onPositionChange) {
                task.onPositionChange(index + 1);
            }
        });
    }
}

export const compileQueueManager = new CompileQueueManager();
