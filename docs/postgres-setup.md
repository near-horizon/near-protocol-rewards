# PostgreSQL Setup for Testing

## Prerequisites

- PostgreSQL installed locally
- `psql` command-line tool available
- Superuser access to PostgreSQL

## Manual Setup

If the automatic setup fails, you can run these commands manually:

```bash
# Connect as postgres superuser
psql -U postgres

# Create test user
CREATE USER test_user WITH PASSWORD 'test_password';

# Create test database
CREATE DATABASE near_rewards_test OWNER test_user;

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE near_rewards_test TO test_user;

# Exit psql
\q
```

## Troubleshooting

If PostgreSQL is not running:

```bash
# macOS
brew services start postgresql

# Ubuntu
sudo service postgresql start

# Windows
net start postgresql
```

If you can't connect as postgres user:

```bash
# macOS/Linux
sudo -u postgres psql

# Windows
runas /user:postgres "psql"
```
