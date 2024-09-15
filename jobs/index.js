import { Queue, Worker } from "bullmq";
import { defaultQueueConfig, redisConnection } from "../config/queue.js";

import logger from "../config/logger.js";
import { service } from "../config/queueService.js";

export const queueName = "master-backend-queue";

export const queue = new Queue(queueName, {
  connection: redisConnection,
  defaultJobOptions: defaultQueueConfig,
});

export const handler = new Worker(
  queueName,
  async (job) => {
    console.log("the worker data is", job.data);
    const data = job.data;
    data?.map(async (item) => {
      await service(item);
    });
  },
  { connection: redisConnection }
);

// * Worker listerners

handler.on("completed", (job) => {
  logger.info({ job: job, message: "Job completed" });
  console.log(`the job ${job.id} is completed`);
});

handler.on("failed", (job, err) => {
  console.log(`the job ${job.id} is failed`);

  console.error(`The job ${job.id} has failed with error: ${err.message}`);
  console.error(err.stack);
});
