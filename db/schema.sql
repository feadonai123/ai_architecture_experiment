CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  stock INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY,
  cart_id UUID NOT NULL REFERENCES carts (id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products (id),
  quantity INTEGER NOT NULL,
  CONSTRAINT cart_items_cart_product_unique UNIQUE (cart_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users (id),
  status SMALLINT NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_payments (
  order_id UUID PRIMARY KEY REFERENCES orders (id) ON DELETE CASCADE,
  status SMALLINT NOT NULL DEFAULT 0,
  payment_details JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrates installations created before numeric statuses. The checks prevent
-- silently changing an unrecognized status into NULL or an incorrect value.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders'
      AND column_name = 'status' AND data_type = 'character varying'
  ) THEN
    IF EXISTS (SELECT 1 FROM orders WHERE status NOT IN ('PENDING', 'PAYMENT_PENDING')) THEN
      RAISE EXCEPTION 'Cannot migrate orders.status: unknown status value';
    END IF;
    ALTER TABLE orders ALTER COLUMN status TYPE SMALLINT
      USING CASE status WHEN 'PENDING' THEN 0 WHEN 'PAYMENT_PENDING' THEN 1 END;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_payments'
      AND column_name = 'status' AND data_type = 'character varying'
  ) THEN
    IF EXISTS (SELECT 1 FROM order_payments WHERE status <> 'PENDING') THEN
      RAISE EXCEPTION 'Cannot migrate order_payments.status: unknown status value';
    END IF;
    ALTER TABLE order_payments ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE order_payments ALTER COLUMN status TYPE SMALLINT
      USING CASE status WHEN 'PENDING' THEN 0 END;
  END IF;

  ALTER TABLE order_payments ALTER COLUMN status SET DEFAULT 0;
END $$;

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products (id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL
);
