export const userMock = {
  id: 'user-1',
};

export const productsMock = [
  {
    id: 'product-1',
    name: 'Tea',
    price: 100,
    stock: 10,
  },
  {
    id: 'product-5',
    name: 'Cake',
    price: 50,
    stock: 5,
  },
];

export const createOrderInputMock = {
  userId: userMock.id,
  items: [
    { productId: productsMock[0].id, quantity: 2 },
    { productId: productsMock[1].id, quantity: 1 },
  ],
};
