<?php

/**
 * Database configuration for MariaDB
 * Reads settings from environment variables or .env file.
 */

function loadEnv(string $path): void
{
    if (!file_exists($path)) {
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        error_log("seduclog: could not read .env file at $path");
        return;
    }
    foreach ($lines as $line) {
        if (str_starts_with(trim($line), '#')) {
            continue;
        }
        if (!str_contains($line, '=')) {
            continue;
        }
        [$name, $value] = array_map('trim', explode('=', $line, 2));
        if ($name !== '' && !isset($_ENV[$name]) && !isset($_SERVER[$name])) {
            putenv("$name=$value");
            $_ENV[$name] = $value;
        }
    }
}

loadEnv(dirname(__DIR__) . '/.env');

return [
    'driver'    => 'mysql',
    'host'      => getenv('DB_HOST')     ?: '127.0.0.1',
    'port'      => getenv('DB_PORT')     ?: '3306',
    'database'  => getenv('DB_DATABASE') ?: 'seduclog',
    'username'  => getenv('DB_USERNAME') ?: 'seduclog_user',
    'password'  => getenv('DB_PASSWORD') ?: '',
    'charset'   => 'utf8mb4',
    'collation' => 'utf8mb4_unicode_ci',
    'options'   => [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ],
];
