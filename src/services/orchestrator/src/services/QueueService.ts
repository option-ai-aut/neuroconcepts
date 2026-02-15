/**
 * QueueService — In-memory async job queue.
 * Currently processes jobs in-process, designed to be swapped to SQS later.
 *
 * Features:
 * - Named queues for different job types
 * - Retry logic with exponential backoff
 * - Job stats tracking
 * - Concurrent processing limits
 */

export interface QueueJob {
  id: string;
  queue: string;
  payload: any;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  processedAt?: Date;
  error?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

type JobHandler = (payload: any) => Promise<void>;

class QueueServiceImpl {
  private handlers = new Map<string, JobHandler>();
  private jobs: QueueJob[] = [];
  private processing = new Map<string, number>(); // queue -> active count
  private concurrencyLimit = 3;
  private stats = { enqueued: 0, processed: 0, failed: 0, retried: 0 };
  private processInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Process pending jobs every 2 seconds
    this.processInterval = setInterval(() => this.processAll(), 2000);
  }

  /**
   * Register a handler for a named queue
   */
  registerHandler(queue: string, handler: JobHandler) {
    this.handlers.set(queue, handler);
    console.log(`📋 Queue handler registered: ${queue}`);
  }

  /**
   * Enqueue a job
   */
  async enqueue(
    queue: string,
    payload: any,
    options?: { maxAttempts?: number }
  ): Promise<string> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.jobs.push({
      id,
      queue,
      payload,
      attempts: 0,
      maxAttempts: options?.maxAttempts ?? 3,
      createdAt: new Date(),
      status: 'pending',
    });
    this.stats.enqueued++;

    // Try to process immediately (fire-and-forget)
    setImmediate(() => this.processQueue(queue));

    return id;
  }

  /**
   * Process all pending jobs across all queues
   */
  private async processAll() {
    const queues = new Set(
      this.jobs.filter((j) => j.status === 'pending').map((j) => j.queue)
    );
    for (const queue of queues) {
      this.processQueue(queue).catch(() => {});
    }
  }

  /**
   * Process pending jobs for a specific queue
   */
  private async processQueue(queue: string) {
    const handler = this.handlers.get(queue);
    if (!handler) return;

    const activeCount = this.processing.get(queue) || 0;
    if (activeCount >= this.concurrencyLimit) return;

    const pendingJobs = this.jobs.filter(
      (j) => j.queue === queue && j.status === 'pending'
    );

    for (const job of pendingJobs.slice(
      0,
      this.concurrencyLimit - activeCount
    )) {
      job.status = 'processing';
      this.processing.set(queue, (this.processing.get(queue) || 0) + 1);

      this.executeJob(job, handler).finally(() => {
        this.processing.set(
          queue,
          Math.max(0, (this.processing.get(queue) || 1) - 1)
        );
      });
    }
  }

  /**
   * Execute a single job with retry logic
   */
  private async executeJob(job: QueueJob, handler: JobHandler) {
    job.attempts++;

    try {
      await handler(job.payload);
      job.status = 'completed';
      job.processedAt = new Date();
      this.stats.processed++;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`📋 Queue job ${job.id} (${job.queue}) failed:`, errMsg);

      if (job.attempts < job.maxAttempts) {
        // Retry with exponential backoff
        const delay = Math.min(30000, 1000 * Math.pow(2, job.attempts));
        job.status = 'pending';
        this.stats.retried++;
        console.log(
          `📋 Retrying job ${job.id} in ${delay}ms (attempt ${job.attempts}/${job.maxAttempts})`
        );

        setTimeout(() => {
          this.processQueue(job.queue).catch(() => {});
        }, delay);
      } else {
        job.status = 'failed';
        job.error = errMsg;
        this.stats.failed++;
        console.error(
          `📋 Job ${job.id} permanently failed after ${job.maxAttempts} attempts`
        );
      }
    }

    // Cleanup old completed/failed jobs (keep last 100)
    this.cleanupOldJobs();
  }

  private cleanupOldJobs() {
    const terminal = this.jobs.filter(
      (j) => j.status === 'completed' || j.status === 'failed'
    );
    if (terminal.length > 100) {
      const toRemove = terminal.slice(0, terminal.length - 100);
      this.jobs = this.jobs.filter((j) => !toRemove.includes(j));
    }
  }

  // ─── Predefined Queue Names ─────────────────────────

  static readonly QUEUES = {
    AI_CHAT: 'ai-chat',
    EMAIL_SEND: 'email-send',
    PDF_GENERATE: 'pdf-generate',
    IMAGE_PROCESS: 'image-process',
    EMBEDDING: 'embedding',
    LEAD_ENRICHMENT: 'lead-enrichment',
    AUTO_CLICK: 'auto-click',
    SENTIMENT: 'sentiment-analysis',
  } as const;

  // ─── Stats ───────────────────────────────────────────

  getStats() {
    const pending = this.jobs.filter((j) => j.status === 'pending').length;
    const processing = this.jobs.filter(
      (j) => j.status === 'processing'
    ).length;
    return { ...this.stats, pending, processing, backend: 'in-memory' };
  }

  /** Get jobs for a specific queue */
  getQueueJobs(queue: string, limit = 20): QueueJob[] {
    return this.jobs.filter((j) => j.queue === queue).slice(-limit);
  }

  destroy() {
    if (this.processInterval) clearInterval(this.processInterval);
    this.jobs = [];
  }
}

// Singleton export
export const QueueService = new QueueServiceImpl();
export default QueueService;
