import { OrderPaymentAttempt as OrderPaymentAttemptEntity } from '../../src/entities/OrderPaymentAttempt';
import { OrderPaymentAttempt } from '../../src/models/OrderPaymentAttempt';

export function mockOrderPaymentAttemptFindByOrderAndKey(value: OrderPaymentAttemptEntity | null) {
  return jest.spyOn(OrderPaymentAttempt, 'findByOrderAndKey').mockResolvedValue(value);
}

export function mockOrderPaymentAttemptCreate() {
  return jest
    .spyOn(OrderPaymentAttempt, 'create')
    .mockImplementation(async (attempt) => attempt as OrderPaymentAttemptEntity);
}
