<?php

/**
 * seduclog – applicativo de acompanhamento e gerenciamento de entregas
 * Application entry point (front controller)
 */

declare(strict_types=1);

// Load database configuration (bootstraps .env as a side-effect)
$dbConfig = require __DIR__ . '/config/database.php';

// Basic PDO connection helper
function getConnection(array $config): PDO
{
    $dsn = sprintf(
        '%s:host=%s;port=%s;dbname=%s;charset=%s',
        $config['driver'],
        $config['host'],
        $config['port'],
        $config['database'],
        $config['charset']
    );
    try {
        return new PDO($dsn, $config['username'], $config['password'], $config['options']);
    } catch (PDOException $e) {
        error_log('Database connection failed: ' . $e->getMessage());
        throw new RuntimeException('Database connection failed. Please check server configuration.');
    }
}

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>seduclog – Gerenciamento de Entregas</title>
</head>
<body>
    <h1>seduclog</h1>
    <p>Applicativo de acompanhamento e gerenciamento de entregas.</p>
</body>
</html>
