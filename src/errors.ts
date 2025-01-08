/**
 * Error thrown when a message fails to send.
 */
export class FailedMessagesError extends Error {
  /** Ids of messages that failed to send. */
  public failedMessages: string[];
  /**
   * @param failedMessages Ids of messages that failed to send.
   */
  constructor(failedMessages: string[]) {
    super(`Failed to send messages: ${failedMessages.join(", ")}`);
    this.failedMessages = failedMessages;
  }
}
