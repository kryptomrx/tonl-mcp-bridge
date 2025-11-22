-- TONL SDK Demo Database
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  age INTEGER,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO users (name, email, age, active) VALUES
  ('Alice Johnson', 'alice@example.com', 25, true),
  ('Bob Smith', 'bob@example.com', 30, true),
  ('Charlie Davis', 'charlie@example.com', 35, false),
  ('Diana Wilson', 'diana@example.com', 28, true),
  ('Eve Martinez', 'eve@example.com', 32, true),
  ('Frank Brown', 'frank@example.com', 45, false),
  ('Grace Lee', 'grace@example.com', 29, true),
  ('Henry Taylor', 'henry@example.com', 38, true),
  ('Iris Anderson', 'iris@example.com', 27, true),
  ('Jack White', 'jack@example.com', 41, false);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  category VARCHAR(100)
);

INSERT INTO products (name, price, stock, category) VALUES
  ('Laptop', 999.99, 50, 'Electronics'),
  ('Mouse', 29.99, 200, 'Electronics'),
  ('Keyboard', 79.99, 150, 'Electronics'),
  ('Monitor', 299.99, 75, 'Electronics'),
  ('Desk', 399.99, 30, 'Furniture');