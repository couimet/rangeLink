export interface ErrorFeedbackProvider {
  showErrorMessage(message: string): Promise<unknown>;
}
