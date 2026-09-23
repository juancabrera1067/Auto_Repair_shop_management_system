IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [AspNetRoles] (
        [Id] nvarchar(450) NOT NULL,
        [Name] nvarchar(256) NULL,
        [NormalizedName] nvarchar(256) NULL,
        [ConcurrencyStamp] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetRoles] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [AspNetUsers] (
        [Id] nvarchar(450) NOT NULL,
        [FullName] nvarchar(150) NOT NULL,
        [Active] bit NOT NULL,
        [UserName] nvarchar(256) NULL,
        [NormalizedUserName] nvarchar(256) NULL,
        [Email] nvarchar(256) NULL,
        [NormalizedEmail] nvarchar(256) NULL,
        [EmailConfirmed] bit NOT NULL,
        [PasswordHash] nvarchar(max) NULL,
        [SecurityStamp] nvarchar(max) NULL,
        [ConcurrencyStamp] nvarchar(max) NULL,
        [PhoneNumber] nvarchar(max) NULL,
        [PhoneNumberConfirmed] bit NOT NULL,
        [TwoFactorEnabled] bit NOT NULL,
        [LockoutEnd] datetimeoffset NULL,
        [LockoutEnabled] bit NOT NULL,
        [AccessFailedCount] int NOT NULL,
        CONSTRAINT [PK_AspNetUsers] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [Customers] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(150) NOT NULL,
        [Phone] nvarchar(30) NOT NULL,
        [Email] nvarchar(254) NULL,
        [Address] nvarchar(400) NULL,
        [Active] bit NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_Customers] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [Services] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(120) NOT NULL,
        [Description] nvarchar(1000) NULL,
        [BasePrice] decimal(18,2) NOT NULL,
        [EstimatedMinutes] int NOT NULL,
        [Active] bit NOT NULL,
        CONSTRAINT [PK_Services] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Service_Amounts] CHECK ([BasePrice] >= 0 AND [EstimatedMinutes] > 0)
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [AspNetRoleClaims] (
        [Id] int NOT NULL IDENTITY,
        [RoleId] nvarchar(450) NOT NULL,
        [ClaimType] nvarchar(max) NULL,
        [ClaimValue] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetRoleClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetRoleClaims_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [AspNetUserClaims] (
        [Id] int NOT NULL IDENTITY,
        [UserId] nvarchar(450) NOT NULL,
        [ClaimType] nvarchar(max) NULL,
        [ClaimValue] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetUserClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetUserClaims_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [AspNetUserLogins] (
        [LoginProvider] nvarchar(450) NOT NULL,
        [ProviderKey] nvarchar(450) NOT NULL,
        [ProviderDisplayName] nvarchar(max) NULL,
        [UserId] nvarchar(450) NOT NULL,
        CONSTRAINT [PK_AspNetUserLogins] PRIMARY KEY ([LoginProvider], [ProviderKey]),
        CONSTRAINT [FK_AspNetUserLogins_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [AspNetUserRoles] (
        [UserId] nvarchar(450) NOT NULL,
        [RoleId] nvarchar(450) NOT NULL,
        CONSTRAINT [PK_AspNetUserRoles] PRIMARY KEY ([UserId], [RoleId]),
        CONSTRAINT [FK_AspNetUserRoles_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_AspNetUserRoles_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [AspNetUserTokens] (
        [UserId] nvarchar(450) NOT NULL,
        [LoginProvider] nvarchar(450) NOT NULL,
        [Name] nvarchar(450) NOT NULL,
        [Value] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetUserTokens] PRIMARY KEY ([UserId], [LoginProvider], [Name]),
        CONSTRAINT [FK_AspNetUserTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [Audit] (
        [Id] int NOT NULL IDENTITY,
        [ActorId] nvarchar(450) NOT NULL,
        [Action] nvarchar(100) NOT NULL,
        [Resource] nvarchar(60) NOT NULL,
        [ResourceId] int NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_Audit] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Audit_AspNetUsers_ActorId] FOREIGN KEY ([ActorId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [Vehicles] (
        [Id] int NOT NULL IDENTITY,
        [CustomerId] int NOT NULL,
        [Vin] nvarchar(17) NULL,
        [Brand] nvarchar(60) NOT NULL,
        [Model] nvarchar(80) NOT NULL,
        [Year] int NOT NULL,
        [Plate] nvarchar(20) NOT NULL,
        [Color] nvarchar(40) NULL,
        [Fuel] nvarchar(40) NULL,
        [Transmission] nvarchar(40) NULL,
        [Mileage] int NOT NULL,
        [Active] bit NOT NULL,
        CONSTRAINT [PK_Vehicles] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Vehicle_MileageYear] CHECK ([Mileage] >= 0 AND [Year] BETWEEN 1900 AND 2100),
        CONSTRAINT [FK_Vehicles_Customers_CustomerId] FOREIGN KEY ([CustomerId]) REFERENCES [Customers] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [Appointments] (
        [Id] int NOT NULL IDENTITY,
        [VehicleId] int NOT NULL,
        [ServiceId] int NOT NULL,
        [StartsAt] datetimeoffset NOT NULL,
        [EndsAt] datetimeoffset NOT NULL,
        [Reason] nvarchar(1000) NOT NULL,
        [Status] int NOT NULL,
        [CreatedById] nvarchar(450) NOT NULL,
        CONSTRAINT [PK_Appointments] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Appointment_Dates] CHECK ([EndsAt] > [StartsAt]),
        CONSTRAINT [FK_Appointments_AspNetUsers_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Appointments_Services_ServiceId] FOREIGN KEY ([ServiceId]) REFERENCES [Services] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Appointments_Vehicles_VehicleId] FOREIGN KEY ([VehicleId]) REFERENCES [Vehicles] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [Orders] (
        [Id] int NOT NULL IDENTITY,
        [Folio] nvarchar(30) NOT NULL,
        [VehicleId] int NOT NULL,
        [AppointmentId] int NULL,
        [Status] int NOT NULL,
        [Priority] int NOT NULL,
        [EnteredAt] datetimeoffset NOT NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [EstimatedDelivery] datetimeoffset NULL,
        [DeliveredAt] datetimeoffset NULL,
        [EntryMileage] int NOT NULL,
        [Reason] nvarchar(2000) NOT NULL,
        [ReceivedById] nvarchar(450) NOT NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Orders] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Order_Mileage] CHECK ([EntryMileage] >= 0),
        CONSTRAINT [FK_Orders_Appointments_AppointmentId] FOREIGN KEY ([AppointmentId]) REFERENCES [Appointments] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Orders_AspNetUsers_ReceivedById] FOREIGN KEY ([ReceivedById]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Orders_Vehicles_VehicleId] FOREIGN KEY ([VehicleId]) REFERENCES [Vehicles] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [Assignments] (
        [Id] int NOT NULL IDENTITY,
        [MechanicId] nvarchar(450) NOT NULL,
        [EndedAt] datetimeoffset NULL,
        [WorkOrderId] int NOT NULL,
        [AuthorId] nvarchar(450) NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_Assignments] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Assignments_AspNetUsers_AuthorId] FOREIGN KEY ([AuthorId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Assignments_AspNetUsers_MechanicId] FOREIGN KEY ([MechanicId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Assignments_Orders_WorkOrderId] FOREIGN KEY ([WorkOrderId]) REFERENCES [Orders] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [Deliveries] (
        [Id] int NOT NULL IDENTITY,
        [ExitMileage] int NOT NULL,
        [ReceivedBy] nvarchar(150) NOT NULL,
        [CustomerAccepted] bit NOT NULL,
        [Notes] nvarchar(2000) NULL,
        [WorkOrderId] int NOT NULL,
        [AuthorId] nvarchar(450) NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_Deliveries] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Delivery_Mileage] CHECK ([ExitMileage] >= 0),
        CONSTRAINT [FK_Deliveries_AspNetUsers_AuthorId] FOREIGN KEY ([AuthorId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Deliveries_Orders_WorkOrderId] FOREIGN KEY ([WorkOrderId]) REFERENCES [Orders] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [Diagnoses] (
        [Id] int NOT NULL IDENTITY,
        [Description] nvarchar(4000) NOT NULL,
        [Cause] nvarchar(2000) NOT NULL,
        [Recommendation] nvarchar(2000) NOT NULL,
        [WorkOrderId] int NOT NULL,
        [AuthorId] nvarchar(450) NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_Diagnoses] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Diagnoses_AspNetUsers_AuthorId] FOREIGN KEY ([AuthorId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Diagnoses_Orders_WorkOrderId] FOREIGN KEY ([WorkOrderId]) REFERENCES [Orders] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [Evidence] (
        [Id] int NOT NULL IDENTITY,
        [StoredName] nvarchar(80) NOT NULL,
        [OriginalName] nvarchar(200) NOT NULL,
        [ContentType] nvarchar(40) NOT NULL,
        [Stage] nvarchar(40) NOT NULL,
        [Description] nvarchar(500) NOT NULL,
        [VisibleToCustomer] bit NOT NULL,
        [Size] bigint NOT NULL,
        [WorkOrderId] int NOT NULL,
        [AuthorId] nvarchar(450) NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_Evidence] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Evidence_AspNetUsers_AuthorId] FOREIGN KEY ([AuthorId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Evidence_Orders_WorkOrderId] FOREIGN KEY ([WorkOrderId]) REFERENCES [Orders] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [Payments] (
        [Id] int NOT NULL IDENTITY,
        [Amount] decimal(18,2) NOT NULL,
        [Method] nvarchar(30) NOT NULL,
        [Reference] nvarchar(100) NULL,
        [WorkOrderId] int NOT NULL,
        [AuthorId] nvarchar(450) NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_Payments] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Payment_Amount] CHECK ([Amount] > 0),
        CONSTRAINT [FK_Payments_AspNetUsers_AuthorId] FOREIGN KEY ([AuthorId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Payments_Orders_WorkOrderId] FOREIGN KEY ([WorkOrderId]) REFERENCES [Orders] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [Quotes] (
        [Id] int NOT NULL IDENTITY,
        [Version] int NOT NULL,
        [Subtotal] decimal(18,2) NOT NULL,
        [Discount] decimal(18,2) NOT NULL,
        [TaxPercent] decimal(18,2) NOT NULL,
        [Tax] decimal(18,2) NOT NULL,
        [Total] decimal(18,2) NOT NULL,
        [ExpiresAt] datetimeoffset NOT NULL,
        [Status] int NOT NULL,
        [WorkOrderId] int NOT NULL,
        [AuthorId] nvarchar(450) NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_Quotes] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Quote_Amounts] CHECK ([Subtotal] >= 0 AND [Discount] BETWEEN 0 AND [Subtotal] AND [TaxPercent] BETWEEN 0 AND 100 AND [Tax] >= 0 AND [Total] = [Subtotal] - [Discount] + [Tax] AND [Version] > 0),
        CONSTRAINT [FK_Quotes_AspNetUsers_AuthorId] FOREIGN KEY ([AuthorId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Quotes_Orders_WorkOrderId] FOREIGN KEY ([WorkOrderId]) REFERENCES [Orders] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [Receptions] (
        [Id] int NOT NULL IDENTITY,
        [WorkOrderId] int NOT NULL,
        [FuelPercent] int NOT NULL,
        [KeyCount] int NOT NULL,
        [SpareTire] bit NOT NULL,
        [Jack] bit NOT NULL,
        [Tools] bit NOT NULL,
        [Belongings] nvarchar(2000) NULL,
        [ExistingDamage] nvarchar(2000) NULL,
        CONSTRAINT [PK_Receptions] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Reception_Values] CHECK ([FuelPercent] BETWEEN 0 AND 100 AND [KeyCount] BETWEEN 0 AND 20),
        CONSTRAINT [FK_Receptions_Orders_WorkOrderId] FOREIGN KEY ([WorkOrderId]) REFERENCES [Orders] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [StatusHistory] (
        [Id] int NOT NULL IDENTITY,
        [Previous] int NULL,
        [Current] int NOT NULL,
        [Comment] nvarchar(1000) NULL,
        [WorkOrderId] int NOT NULL,
        [AuthorId] nvarchar(450) NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_StatusHistory] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_StatusHistory_AspNetUsers_AuthorId] FOREIGN KEY ([AuthorId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_StatusHistory_Orders_WorkOrderId] FOREIGN KEY ([WorkOrderId]) REFERENCES [Orders] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [Tests] (
        [Id] int NOT NULL IDENTITY,
        [Type] nvarchar(100) NOT NULL,
        [Result] int NOT NULL,
        [Notes] nvarchar(2000) NOT NULL,
        [WorkOrderId] int NOT NULL,
        [AuthorId] nvarchar(450) NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_Tests] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Tests_AspNetUsers_AuthorId] FOREIGN KEY ([AuthorId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Tests_Orders_WorkOrderId] FOREIGN KEY ([WorkOrderId]) REFERENCES [Orders] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [TrackingAccesses] (
        [Id] int NOT NULL IDENTITY,
        [WorkOrderId] int NOT NULL,
        [TokenHash] nvarchar(64) NOT NULL,
        [CodeHash] nvarchar(64) NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [ExpiresAt] datetimeoffset NOT NULL,
        [Revoked] bit NOT NULL,
        [LastAccess] datetimeoffset NULL,
        [FailedAttempts] int NOT NULL,
        [LockedUntil] datetimeoffset NULL,
        CONSTRAINT [PK_TrackingAccesses] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_TrackingAccesses_Orders_WorkOrderId] FOREIGN KEY ([WorkOrderId]) REFERENCES [Orders] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [Updates] (
        [Id] int NOT NULL IDENTITY,
        [Title] nvarchar(150) NOT NULL,
        [Message] nvarchar(3000) NOT NULL,
        [VisibleToCustomer] bit NOT NULL,
        [WorkOrderId] int NOT NULL,
        [AuthorId] nvarchar(450) NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_Updates] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Updates_AspNetUsers_AuthorId] FOREIGN KEY ([AuthorId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Updates_Orders_WorkOrderId] FOREIGN KEY ([WorkOrderId]) REFERENCES [Orders] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [Fault] (
        [Id] int NOT NULL IDENTITY,
        [DiagnosisId] int NOT NULL,
        [Description] nvarchar(1000) NOT NULL,
        [Priority] int NOT NULL,
        CONSTRAINT [PK_Fault] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Fault_Diagnoses_DiagnosisId] FOREIGN KEY ([DiagnosisId]) REFERENCES [Diagnoses] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [QuoteAuthorization] (
        [Id] int NOT NULL IDENTITY,
        [QuoteId] int NOT NULL,
        [Approved] bit NOT NULL,
        [ConsentEvidence] nvarchar(2000) NOT NULL,
        [RecordedById] nvarchar(450) NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_QuoteAuthorization] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_QuoteAuthorization_AspNetUsers_RecordedById] FOREIGN KEY ([RecordedById]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_QuoteAuthorization_Quotes_QuoteId] FOREIGN KEY ([QuoteId]) REFERENCES [Quotes] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [QuoteLine] (
        [Id] int NOT NULL IDENTITY,
        [QuoteId] int NOT NULL,
        [Type] nvarchar(30) NOT NULL,
        [Description] nvarchar(500) NOT NULL,
        [Quantity] decimal(18,2) NOT NULL,
        [UnitPrice] decimal(18,2) NOT NULL,
        [Total] decimal(18,2) NOT NULL,
        CONSTRAINT [PK_QuoteLine] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_QuoteLine_Amounts] CHECK ([Quantity] > 0 AND [UnitPrice] >= 0 AND [Total] >= 0),
        CONSTRAINT [FK_QuoteLine_Quotes_QuoteId] FOREIGN KEY ([QuoteId]) REFERENCES [Quotes] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [ReceptionCheck] (
        [Id] int NOT NULL IDENTITY,
        [ReceptionId] int NOT NULL,
        [Item] nvarchar(100) NOT NULL,
        [Condition] nvarchar(40) NOT NULL,
        [Notes] nvarchar(500) NULL,
        CONSTRAINT [PK_ReceptionCheck] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ReceptionCheck_Receptions_ReceptionId] FOREIGN KEY ([ReceptionId]) REFERENCES [Receptions] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE TABLE [Repairs] (
        [Id] int NOT NULL IDENTITY,
        [QuoteLineId] int NOT NULL,
        [Description] nvarchar(3000) NOT NULL,
        [CompletedAt] datetimeoffset NULL,
        [WorkOrderId] int NOT NULL,
        [AuthorId] nvarchar(450) NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_Repairs] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Repairs_AspNetUsers_AuthorId] FOREIGN KEY ([AuthorId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Repairs_Orders_WorkOrderId] FOREIGN KEY ([WorkOrderId]) REFERENCES [Orders] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Repairs_QuoteLine_QuoteLineId] FOREIGN KEY ([QuoteLineId]) REFERENCES [QuoteLine] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Appointments_CreatedById] ON [Appointments] ([CreatedById]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Appointments_ServiceId] ON [Appointments] ([ServiceId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Appointments_StartsAt] ON [Appointments] ([StartsAt]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Appointments_VehicleId] ON [Appointments] ([VehicleId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_AspNetRoleClaims_RoleId] ON [AspNetRoleClaims] ([RoleId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [RoleNameIndex] ON [AspNetRoles] ([NormalizedName]) WHERE [NormalizedName] IS NOT NULL');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_AspNetUserClaims_UserId] ON [AspNetUserClaims] ([UserId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_AspNetUserLogins_UserId] ON [AspNetUserLogins] ([UserId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_AspNetUserRoles_RoleId] ON [AspNetUserRoles] ([RoleId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [EmailIndex] ON [AspNetUsers] ([NormalizedEmail]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UserNameIndex] ON [AspNetUsers] ([NormalizedUserName]) WHERE [NormalizedUserName] IS NOT NULL');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Assignments_AuthorId] ON [Assignments] ([AuthorId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Assignments_MechanicId] ON [Assignments] ([MechanicId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Assignments_WorkOrderId_MechanicId] ON [Assignments] ([WorkOrderId], [MechanicId]) WHERE [EndedAt] IS NULL');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Audit_ActorId] ON [Audit] ([ActorId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Audit_CreatedAt] ON [Audit] ([CreatedAt]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Deliveries_AuthorId] ON [Deliveries] ([AuthorId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Deliveries_WorkOrderId] ON [Deliveries] ([WorkOrderId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Diagnoses_AuthorId] ON [Diagnoses] ([AuthorId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Diagnoses_WorkOrderId] ON [Diagnoses] ([WorkOrderId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Evidence_AuthorId] ON [Evidence] ([AuthorId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Evidence_WorkOrderId] ON [Evidence] ([WorkOrderId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Fault_DiagnosisId] ON [Fault] ([DiagnosisId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Orders_AppointmentId] ON [Orders] ([AppointmentId]) WHERE [AppointmentId] IS NOT NULL');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Orders_Folio] ON [Orders] ([Folio]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Orders_ReceivedById] ON [Orders] ([ReceivedById]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Orders_Status_EnteredAt] ON [Orders] ([Status], [EnteredAt]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Orders_VehicleId] ON [Orders] ([VehicleId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Payments_AuthorId] ON [Payments] ([AuthorId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Payments_WorkOrderId] ON [Payments] ([WorkOrderId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE UNIQUE INDEX [IX_QuoteAuthorization_QuoteId] ON [QuoteAuthorization] ([QuoteId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_QuoteAuthorization_RecordedById] ON [QuoteAuthorization] ([RecordedById]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_QuoteLine_QuoteId] ON [QuoteLine] ([QuoteId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Quotes_AuthorId] ON [Quotes] ([AuthorId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Quotes_WorkOrderId_Version] ON [Quotes] ([WorkOrderId], [Version]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ReceptionCheck_ReceptionId_Item] ON [ReceptionCheck] ([ReceptionId], [Item]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Receptions_WorkOrderId] ON [Receptions] ([WorkOrderId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Repairs_AuthorId] ON [Repairs] ([AuthorId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Repairs_QuoteLineId] ON [Repairs] ([QuoteLineId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Repairs_WorkOrderId] ON [Repairs] ([WorkOrderId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_StatusHistory_AuthorId] ON [StatusHistory] ([AuthorId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_StatusHistory_WorkOrderId_CreatedAt] ON [StatusHistory] ([WorkOrderId], [CreatedAt]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Tests_AuthorId] ON [Tests] ([AuthorId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Tests_WorkOrderId] ON [Tests] ([WorkOrderId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE UNIQUE INDEX [IX_TrackingAccesses_TokenHash] ON [TrackingAccesses] ([TokenHash]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_TrackingAccesses_WorkOrderId] ON [TrackingAccesses] ([WorkOrderId]) WHERE [Revoked] = 0');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Updates_AuthorId] ON [Updates] ([AuthorId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Updates_WorkOrderId] ON [Updates] ([WorkOrderId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Vehicles_CustomerId] ON [Vehicles] ([CustomerId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    CREATE INDEX [IX_Vehicles_Plate] ON [Vehicles] ([Plate]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Vehicles_Vin] ON [Vehicles] ([Vin]) WHERE [Vin] IS NOT NULL');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260923163034_InitialWorkshop'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260923163034_InitialWorkshop', N'8.0.26');
END;
GO

COMMIT;
GO

