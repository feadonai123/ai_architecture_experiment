import { OrderPayment as OrderPaymentEntity } from '../../src/entities/OrderPayment';
import { OrderPayment } from '../../src/models/OrderPayment';

export function mockOrderPaymentFindByOrderId(value: OrderPaymentEntity | null) {
  return jest.spyOn(OrderPayment, 'findByOrderId').mockResolvedValue(value);
}

export function mockOrderPaymentCreate(value?: OrderPaymentEntity) {
  return jest
    .spyOn(OrderPayment, 'create')
    .mockImplementation(async (payment) => value ?? (payment as OrderPaymentEntity));
}

export function mockOrderPaymentUpdate() {
  return jest.spyOn(OrderPayment, 'update').mockImplementation(async (payment) => payment);
}
