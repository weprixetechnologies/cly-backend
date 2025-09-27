<!-- -- PRODUCTS TABLE -->
CREATE TABLE products (
    productID       VARCHAR(50) PRIMARY KEY,
    productName     VARCHAR(255) NOT NULL,
    productPrice    DECIMAL(10,2) NOT NULL,
    sku             VARCHAR(100) UNIQUE,
    description     TEXT,
    boxQty          INT DEFAULT 0,
    packQty         INT DEFAULT 0,
    minQty          INT DEFAULT 1,
    categoryID      VARCHAR(50),
    categoryName    VARCHAR(255),
    featuredImages  TEXT,
    galleryImages   JSON,
    status          ENUM('active', 'inactive') DEFAULT 'active',
    syncStatus      ENUM('pending', 'synced', 'failed') DEFAULT 'pending',
    inventory       INT DEFAULT 0,
    createdAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

<!-- -- USERS TABLE -->
CREATE TABLE users (
    uid            VARCHAR(50) PRIMARY KEY,
    username       VARCHAR(100) UNIQUE NOT NULL,
    name           VARCHAR(255),
    photo          TEXT,
    emailID        VARCHAR(255),
    phoneNumber    VARCHAR(20),
    gstin          VARCHAR(15),
    outstanding    DECIMAL(10,2) DEFAULT 0.00,
    createdAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    lastLogin      DATETIME,
    status         ENUM('active', 'inactive', 'banned') DEFAULT 'active',
    password       VARCHAR(255) NOT NULL,
    cartID         VARCHAR(50),
    role           ENUM('user', 'admin', 'manager') DEFAULT 'user'
);

<!-- -- SESSIONS TABLE -->
CREATE TABLE sessions (
    sessionID      VARCHAR(100) PRIMARY KEY,
    refreshToken   TEXT NOT NULL,
    uid            VARCHAR(50) NOT NULL,
    expiry         DATETIME NOT NULL,
    createdAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    device         VARCHAR(255),
    FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
);

<!-- -- ORDERS TABLE -->
CREATE TABLE orders (
    orderID        VARCHAR(50) PRIMARY KEY,
    productID      VARCHAR(50) NOT NULL,
    productName    VARCHAR(255) NOT NULL,
    boxQty         INT DEFAULT 0,
    packQty        INT DEFAULT 0,
    units          INT DEFAULT 0,
    featuredImage  TEXT,
    uid            VARCHAR(50) NOT NULL,
    createdAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    orderStatus    ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE,
    FOREIGN KEY (productID) REFERENCES products(productID) ON DELETE CASCADE
);

<!-- -- CART ITEMS TABLE -->
CREATE TABLE cart_items (
    cartID         VARCHAR(50) NOT NULL,
    productID      VARCHAR(50) NOT NULL,
    productName    VARCHAR(255) NOT NULL,
    boxQty         INT DEFAULT 0,
    packQty        INT DEFAULT 0,
    units          INT DEFAULT 0,
    featuredImage  TEXT,
    uid            VARCHAR(50) NOT NULL,
    createdAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (cartID, productID),
    FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE,
    FOREIGN KEY (productID) REFERENCES products(productID) ON DELETE CASCADE
);

<!-- -- CATEGORIES TABLE -->
CREATE TABLE categories (
    categoryID     VARCHAR(50) PRIMARY KEY,
    categoryName   VARCHAR(255) UNIQUE NOT NULL,
    image          TEXT,
    productCount   INT DEFAULT 0,
    createdAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
