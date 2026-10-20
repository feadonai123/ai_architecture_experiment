export function mockPaymentIds(transactionId: string, eventId: string) {
  return jest.fn().mockReturnValueOnce(transactionId).mockReturnValueOnce(eventId);
}
