-- seduclog initial database schema
-- MariaDB / MySQL compatible

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `entregas` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `descricao`    VARCHAR(255) NOT NULL,
  `destinatario` VARCHAR(255) NOT NULL,
  `endereco`     TEXT,
  `status`       ENUM('pendente','em_transito','entregue','cancelado') NOT NULL DEFAULT 'pendente',
  `criado_em`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
