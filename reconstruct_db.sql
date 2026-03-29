-- Perfect Database Reconstruction Script for BiteSync
-- This script contains the COMPLETED schema including all financial and management columns.

CREATE DATABASE IF NOT EXISTS bitesync;
USE bitesync;

-- 1. tbl_userinfo
CREATE TABLE IF NOT EXISTS tbl_userinfo (
    UsrId INT AUTO_INCREMENT PRIMARY KEY,
    UsrEmail VARCHAR(255) NOT NULL UNIQUE,
    UsrPassword VARCHAR(255) NOT NULL,
    UsrPhone VARCHAR(10) DEFAULT NULL,
    UsrFullName VARCHAR(255) DEFAULT NULL,
    UsrRole VARCHAR(20) DEFAULT NULL,
    UsrStatus TINYINT(4) NOT NULL DEFAULT 1 COMMENT '1=Active, 0=Banned',
    UsrCreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UsrImagePath VARCHAR(255) DEFAULT NULL,
    UsrImageOriPath VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
    IsDefault TINYINT(1) DEFAULT 0,
    FOREIGN KEY (UsrId) REFERENCES tbl_userinfo(UsrId) ON DELETE CASCADE
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
    ShopLat DECIMAL(10, 8),
    ShopLng DECIMAL(11, 8),
    ShopAcceptRate DECIMAL(5, 2) DEFAULT 100.00,
    ShopCancelRate DECIMAL(5, 2) DEFAULT 0.00,
    ShopBalance DECIMAL(10, 2) DEFAULT 0.00,
    ShopTotalSettled DECIMAL(10, 2) DEFAULT 0.00,
    AdrId INT,
    FOREIGN KEY (UsrId) REFERENCES tbl_userinfo(UsrId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. tbl_rider
CREATE TABLE IF NOT EXISTS tbl_rider (
    RiderId INT AUTO_INCREMENT PRIMARY KEY,
    UsrId INT NOT NULL,
    RiderStatus VARCHAR(20) DEFAULT 'Offline',
    RiderVehicleType VARCHAR(100),
    RiderVehiclePlate VARCHAR(50),
    RiderVehicleColor VARCHAR(50),
    RiderBankName VARCHAR(100),
    RiderBankAccount VARCHAR(50),
    EmergencyPhone VARCHAR(20),
    RiderRatingAvg DECIMAL(3, 2) DEFAULT 0.00,
    RiderRatingCount INT DEFAULT 0,
    RiderAcceptRate DECIMAL(5, 2) DEFAULT 0.00,
    RiderCancelRate DECIMAL(5, 2) DEFAULT 0.00,
    RiderBalance DECIMAL(10, 2) DEFAULT 0.00,
    RiderTotalSettled DECIMAL(10, 2) DEFAULT 0.00,
    RiderCheckedAt DATETIME DEFAULT NULL,
    RiderLat DECIMAL(10, 8),
    RiderLng DECIMAL(11, 8),
    FOREIGN KEY (UsrId) REFERENCES tbl_userinfo(UsrId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
    RiderId INT DEFAULT NULL,
    AdrId INT DEFAULT NULL,
    OdrNote VARCHAR(500) DEFAULT NULL,
    OdrStatus TINYINT(4) NOT NULL DEFAULT 0 COMMENT '0=Pending, 1=WaitingPay, 6=Success, 7=Cancel',
    OdrNoteRider VARCHAR(255) DEFAULT NULL,
    OdrDistance DECIMAL(6, 2) DEFAULT NULL,
    OdrFoodPrice DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    OdrDelFee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    OdrPlatformFee DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Fixed 12 THB',
    OdrGrandTotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    OdrCreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    OdrUpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    RiderRating TINYINT(1) DEFAULT NULL,
    OdrCancelBy VARCHAR(50) DEFAULT NULL COMMENT 'customer or shop',
    OdrGP DECIMAL(10, 2) DEFAULT 0.00 COMMENT '25% commissions',
    OdrRiderFee DECIMAL(10, 2) DEFAULT 0.00 COMMENT '80% of delivery fee',
    OdrAdminFee DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'GP + DevShare + PlatFee',
    OdrSettled TINYINT(1) DEFAULT 0,
    OdrShopSettled TINYINT(1) DEFAULT 0,
    OdrRiderSettled TINYINT(1) DEFAULT 0,
    OdrRefundStatus TINYINT(4) NOT NULL DEFAULT 0 COMMENT '0=None, 1=Pending, 2=Refunded',
    OdrRefundSlip VARCHAR(255) DEFAULT NULL,
    FOREIGN KEY (UsrId) REFERENCES tbl_userinfo(UsrId),
    FOREIGN KEY (ShopId) REFERENCES tbl_shop(ShopId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. tbl_order_detail
CREATE TABLE IF NOT EXISTS tbl_order_detail (
    OdtId INT AUTO_INCREMENT PRIMARY KEY,
    OdrId INT NOT NULL,
    FoodId INT NOT NULL,
    OdtUnitPrice DECIMAL(10, 2) NOT NULL,
    OdtQty INT NOT NULL DEFAULT 1,
    FOREIGN KEY (OdrId) REFERENCES tbl_order(OdrId) ON DELETE CASCADE,
    FOREIGN KEY (FoodId) REFERENCES tbl_food(FoodId)
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
    OchId INT AUTO_INCREMENT PRIMARY KEY,
    OdrId INT NOT NULL,
    RiderId INT NOT NULL,
    OchCreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. tbl_payment
CREATE TABLE IF NOT EXISTS tbl_payment (
    PmtId INT AUTO_INCREMENT PRIMARY KEY,
    OdrId INT NOT NULL UNIQUE,
    PmtMethod VARCHAR(50) DEFAULT 'PromptPay',
    PmtSlipPath VARCHAR(255) DEFAULT NULL,
    PmtAmount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    PmtStatus TINYINT DEFAULT 0,
    PmtCreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (OdrId) REFERENCES tbl_order(OdrId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. tbl_settings
CREATE TABLE IF NOT EXISTS tbl_settings (
    SettingId INT AUTO_INCREMENT PRIMARY KEY,
    SettingKey VARCHAR(50) NOT NULL UNIQUE,
    SettingValue VARCHAR(255) DEFAULT NULL,
    SettingName VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed initial settings
INSERT IGNORE INTO tbl_settings (SettingKey, SettingValue, SettingName) VALUES 
('platform_fee', '12', 'ค่าธรรมเนียมบริการระบบ (บาท)'),
('gp_rate', '0.25', 'อัตราค่า GP ร้านค้า (0.25 = 25%)'),
('rider_share', '0.80', 'ส่วนแบ่งรายได้ไรเดอร์ (0.80 = 80%)');
