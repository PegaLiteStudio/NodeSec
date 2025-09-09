// queue/CompileQueueManager.ts
type TaskFn = () => Promise<void>;

class CompileQueueManager {
    private queue: { id: string; type: "theme" | "apk"; fn: TaskFn }[] = [];
    private running = false;

    addTask(id: string, type: "theme" | "apk", fn: TaskFn) {
        this.queue.push({ id, type, fn });
        this.runNext().catch(err => console.error("Queue runNext error:", err));
    }

    private async runNext() {
        if (this.running) return; // Already processing
        const task = this.queue.shift();
        if (!task) return;

        this.running = true;
        console.log(`[QUEUE] Starting ${task.type} task: ${task.id}`);

        try {
            await task.fn();
            console.log(`[QUEUE] Finished ${task.type} task: ${task.id}`);
        } catch (err) {
            console.error(`[QUEUE] Failed ${task.type} task: ${task.id}`, err);
        } finally {
            this.running = false;
            this.runNext().catch(err => console.error("Queue runNext error:", err));
        }
    }
}

// Export singleton
export const compileQueueManager = new CompileQueueManager();
