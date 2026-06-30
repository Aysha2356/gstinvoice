-- Reference schema (Sequelize will auto-create/alter these via `npm run db:sync`
-- in the backend, so running this file manually is optional).

CREATE DATABASE IF NOT EXISTS gst_invoice_db;
USE gst_invoice_db;

CREATE TABLE IF NOT EXISTS Users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  companyName VARCHAR(255),
  companyGSTIN VARCHAR(50),
  companyAddress VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  logoUrl VARCHAR(255),
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS Clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  gstin VARCHAR(50),
  address VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  email VARCHAR(255),
  userId INT NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoiceNumber VARCHAR(100) NOT NULL,
  invoiceDate DATE NOT NULL,
  dueDate DATE NOT NULL,
  placeOfSupply VARCHAR(100),
  notes TEXT,
  terms TEXT,
  subtotal DECIMAL(12,2) DEFAULT 0,
  sgstTotal DECIMAL(12,2) DEFAULT 0,
  cgstTotal DECIMAL(12,2) DEFAULT 0,
  cessTotal DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  status ENUM('draft','sent','paid','overdue') DEFAULT 'draft',
  userId INT NOT NULL,
  clientId INT,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (clientId) REFERENCES Clients(id)
);

CREATE TABLE IF NOT EXISTS InvoiceItems (
  id INT AUTO_INCREMENT PRIMARY KEY,
  description VARCHAR(255) NOT NULL,
  hsnSac VARCHAR(50),
  qty DECIMAL(10,2) DEFAULT 1,
  rate DECIMAL(10,2) DEFAULT 0,
  sgstPct DECIMAL(5,2) DEFAULT 0,
  cgstPct DECIMAL(5,2) DEFAULT 0,
  cessPct DECIMAL(5,2) DEFAULT 0,
  amount DECIMAL(12,2) DEFAULT 0,
  invoiceId INT NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (invoiceId) REFERENCES Invoices(id) ON DELETE CASCADE
);
