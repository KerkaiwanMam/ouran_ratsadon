# Database Schema

Database: SQLite (development), PostgreSQL (production)
ORM: Prisma

## Tables

### User
| Column       | Type     | Notes                        |
|--------------|----------|------------------------------|
| id           | String   | CUID, primary key            |
| email        | String   | Unique                       |
| name         | String   |                              |
| passwordHash | String?  | Null if Google OAuth only    |
| role         | Role     | GUEST, MEMBER, PRO, ADMIN    |
| createdAt    | DateTime |                              |
| updatedAt    | DateTime |                              |

### File
| Column       | Type       | Notes                              |
|--------------|------------|------------------------------------|
| id           | String     | CUID, primary key                  |
| userId       | String     | FK → User.id                       |
| filename     | String     |                                    |
| fileType     | String     | "pdf" or "xlsx"                    |
| status       | FileStatus | PROCESSING, DONE, ERROR            |
| parsedData   | String?    | JSON string of BudgetData          |
| fiscalYear   | String?    | e.g. "2567"                        |
| organization | String?    |                                    |
| uploadedAt   | DateTime   |                                    |
| updatedAt    | DateTime   |                                    |

### Subscription
| Column    | Type               | Notes                         |
|-----------|--------------------|-------------------------------|
| id        | String             | CUID, primary key             |
| userId    | String             | FK → User.id, unique          |
| plan      | Plan               | FREE, PRO                     |
| status    | SubscriptionStatus | ACTIVE, CANCELLED, EXPIRED    |
| startDate | DateTime           |                               |
| endDate   | DateTime?          | Null for unlimited            |
| createdAt | DateTime           |                               |
| updatedAt | DateTime           |                               |

## Enums

- **Role**: `GUEST`, `MEMBER`, `PRO`, `ADMIN`
- **FileStatus**: `PROCESSING`, `DONE`, `ERROR`
- **Plan**: `FREE`, `PRO`
- **SubscriptionStatus**: `ACTIVE`, `CANCELLED`, `EXPIRED`

## Relationships

- User → File: one-to-many
- User → Subscription: one-to-one

## Free plan limits

Enforced at the API level, not in the database:
- Max 3 file uploads per month per user with `plan = FREE`
