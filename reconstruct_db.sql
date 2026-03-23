-- Safe Migration Script for BiteSync
-- This script adds missing columns and tables without deleting existing data.

CREATE DATABASE IF NOT EXISTS bitesync;
USE bitesync;

-- 1. tbl_userinfo
CREATE TABLE IF NOT EXISTS tbl_userinfo (
    UsrId INT AUTO_INCREMENT PRIMARY KEY,
    UsrRole VARCHAR(50) NOT NULL,
    UsrFullName VARCHAR(255) NOT NULL,
    UsrEmail VARCHAR(255) NOT NULL,
    UsrPhone VARCHAR(20) NOT NULL,
    UsrPassword VARCHAR(255) NOT NULL,
    UsrImagePath VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add missing columns to tbl_userinfo if they don't exist
ALTER TABLE tbl_userinfo ADD COLUMN IF NOT EXISTS UsrImagePath VARCHAR(255) DEFAULT NULL;

-- 2. tbl_address
CREATE TABLE IF NOT EXISTS tbl_address (
    AdrId INT AUTO_INCREMENT PRIMARY KEY,
    UsrId INT NULL,
    HouseNo VARCHAR(50),
    Village VARCHAR(100),
    Road VARCHAR(100),
    Soi VARCHAR(100),
    Moo VARCHAR(50),
    SubDistrict VARCHAR(100),
    District VARCHAR(100),
    Province VARCHAR(100),
    Zipcode VARCHAR(10),
    AdrLat DECIMAL(10, 8),
    AdrLng DECIMAL(11, 8),
    IsDefault TINYINT(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. tbl_shop
CREATE TABLE IF NOT EXISTS tbl_shop (
    ShopId INT AUTO_INCREMENT PRIMARY KEY,
    UsrId INT NOT NULL,
    ShopName VARCHAR(255) NOT NULL,
    ShopPhone VARCHAR(20),
    ShopCatType VARCHAR(100),
    ShopStatus TINYINT(1) DEFAULT 1,
    ShopLogoPath VARCHAR(255),
    ShopBannerPath VARCHAR(255),
    ShopLogoOriPath VARCHAR(255),
    ShopBannerOriPath VARCHAR(255),
    ShopPrepTime INT DEFAULT 30,
    AdrId INT,
    ShopLat DECIMAL(10, 8),
    ShopLng DECIMAL(11, 8),
    FOREIGN KEY (UsrId) REFERENCES tbl_userinfo(UsrId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add missing columns to tbl_shop
ALTER TABLE tbl_shop ADD COLUMN IF NOT EXISTS ShopLogoOriPath VARCHAR(255) AFTER ShopBannerPath;
ALTER TABLE tbl_shop ADD COLUMN IF NOT EXISTS ShopBannerOriPath VARCHAR(255) AFTER ShopLogoOriPath;
ALTER TABLE tbl_shop ADD COLUMN IF NOT EXISTS ShopPrepTime INT DEFAULT 30 AFTER ShopBannerOriPath;
ALTER TABLE tbl_shop ADD COLUMN IF NOT EXISTS ShopLat DECIMAL(10, 8) AFTER AdrId;
ALTER TABLE tbl_shop ADD COLUMN IF NOT EXISTS ShopLng DECIMAL(11, 8) AFTER ShopLat;

-- 4. tbl_rider
CREATE TABLE IF NOT EXISTS tbl_rider (
    RiderId INT AUTO_INCREMENT PRIMARY KEY,
    UsrId INT NOT NULL,
    RiderVehicleType VARCHAR(100),
    RiderVehiclePlate VARCHAR(50),
    RiderVehicleColor VARCHAR(50),
    RiderBankName VARCHAR(100),
    RiderBankAccount VARCHAR(50),
    EmergencyPhone VARCHAR(20),
    RiderRatingAvg FLOAT DEFAULT 0,
    RiderRatingCount INT DEFAULT 0,
    RiderBalance DECIMAL(10, 2) DEFAULT 0,
    RiderStatus VARCHAR(20) DEFAULT 'Offline',
    RiderLat DECIMAL(10, 8),
    RiderLng DECIMAL(11, 8),
    FOREIGN KEY (UsrId) REFERENCES tbl_userinfo(UsrId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add missing columns to tbl_rider
ALTER TABLE tbl_rider ADD COLUMN IF NOT EXISTS RiderVehicleType VARCHAR(100) AFTER UsrId;
ALTER TABLE tbl_rider ADD COLUMN IF NOT EXISTS RiderVehicleColor VARCHAR(50) AFTER RiderVehiclePlate;
ALTER TABLE tbl_rider ADD COLUMN IF NOT EXISTS RiderBankName VARCHAR(100) AFTER RiderVehicleColor;
ALTER TABLE tbl_rider ADD COLUMN IF NOT EXISTS RiderBankAccount VARCHAR(50) AFTER RiderBankName;
ALTER TABLE tbl_rider ADD COLUMN IF NOT EXISTS EmergencyPhone VARCHAR(20) AFTER RiderBankAccount;
ALTER TABLE tbl_rider ADD COLUMN IF NOT EXISTS RiderLat DECIMAL(10, 8) AFTER RiderStatus;
ALTER TABLE tbl_rider ADD COLUMN IF NOT EXISTS RiderLng DECIMAL(11, 8) AFTER RiderLat;

-- 5. tbl_menu_category
CREATE TABLE IF NOT EXISTS tbl_menu_category (
    CatId INT AUTO_INCREMENT PRIMARY KEY,
    CatName VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. tbl_food
CREATE TABLE IF NOT EXISTS tbl_food (
    FoodId INT AUTO_INCREMENT PRIMARY KEY,
    FoodName VARCHAR(255) NOT NULL,
    CatId INT,
    FoodPrice DECIMAL(10, 2) NOT NULL,
    FoodDetail TEXT,
    FoodStatus TINYINT(1) DEFAULT 1,
    FoodImagePath VARCHAR(255),
    ShopId INT NOT NULL,
    FoodPrepTime INT DEFAULT 30,
    FOREIGN KEY (ShopId) REFERENCES tbl_shop(ShopId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. tbl_addon
CREATE TABLE IF NOT EXISTS tbl_addon (
    AddonId INT AUTO_INCREMENT PRIMARY KEY,
    FoodId INT NOT NULL,
    AddonName VARCHAR(255) NOT NULL,
    AddonPrice DECIMAL(10, 2) NOT NULL,
    AddonStatus TINYINT(1) DEFAULT 1,
    FOREIGN KEY (FoodId) REFERENCES tbl_food(FoodId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. tbl_order
CREATE TABLE IF NOT EXISTS tbl_order (
    OdrId INT AUTO_INCREMENT PRIMARY KEY,
    UsrId INT NOT NULL,
    ShopId INT NOT NULL,
    AdrId INT,
    RiderId INT DEFAULT NULL,
    OdrStatus INT DEFAULT 1,
    OdrFoodPrice DECIMAL(10, 2),
    OdrDelFee DECIMAL(10, 2),
    OdrGrandTotal DECIMAL(10, 2),
    OdrCreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    RiderRating FLOAT DEFAULT NULL,
    FOREIGN KEY (UsrId) REFERENCES tbl_userinfo(UsrId),
    FOREIGN KEY (ShopId) REFERENCES tbl_shop(ShopId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add missing columns to tbl_order
ALTER TABLE tbl_order ADD COLUMN IF NOT EXISTS RiderRating FLOAT DEFAULT NULL AFTER OdrCreatedAt;

-- 9. tbl_order_detail
CREATE TABLE IF NOT EXISTS tbl_order_detail (
    OdrId INT NOT NULL,
    FoodId INT NOT NULL,
    OdtUnitPrice DECIMAL(10, 2) NOT NULL,
    OdtQty INT NOT NULL,
    FOREIGN KEY (OdrId) REFERENCES tbl_order(OdrId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. tbl_review
CREATE TABLE IF NOT EXISTS tbl_review (
    ReviewId INT AUTO_INCREMENT PRIMARY KEY,
    FoodId INT NOT NULL,
    UsrId INT NOT NULL,
    OdrId INT NOT NULL,
    ReviewScore INT NOT NULL,
    ReviewText TEXT,
    ReviewAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ReviewImg1 VARCHAR(255),
    ReviewImg2 VARCHAR(255),
    ReviewImg3 VARCHAR(255),
    FOREIGN KEY (FoodId) REFERENCES tbl_food(FoodId),
    FOREIGN KEY (UsrId) REFERENCES tbl_userinfo(UsrId),
    FOREIGN KEY (OdrId) REFERENCES tbl_order(OdrId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. tbl_order_cancel_history
CREATE TABLE IF NOT EXISTS tbl_order_cancel_history (
    OdrId INT NOT NULL,
    RiderId INT NOT NULL,
    CancelledAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (OdrId, RiderId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
