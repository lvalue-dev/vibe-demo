-- 볼륨이 이미 존재해도 DB가 없으면 생성
SELECT 'CREATE DATABASE stockguide'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'stockguide')\gexec
