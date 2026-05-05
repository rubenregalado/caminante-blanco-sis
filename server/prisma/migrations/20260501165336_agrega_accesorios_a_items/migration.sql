-- AlterTable
ALTER TABLE `items_orden` ADD COLUMN `tamano` VARCHAR(50) NULL,
    ADD COLUMN `tipo_accesorio` VARCHAR(50) NULL,
    ADD COLUMN `tipo_item` VARCHAR(20) NOT NULL DEFAULT 'tenis';
