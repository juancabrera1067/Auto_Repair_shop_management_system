using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Taller.Web.Domain;

namespace Taller.Web.Data;

public class TallerDbContext(DbContextOptions<TallerDbContext> options) : IdentityDbContext<StaffUser>(options)
{
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<WorkOrder> Orders => Set<WorkOrder>();
    public DbSet<Reception> Receptions => Set<Reception>();
    public DbSet<Diagnosis> Diagnoses => Set<Diagnosis>();
    public DbSet<Quote> Quotes => Set<Quote>();
    public DbSet<Repair> Repairs => Set<Repair>();
    public DbSet<Evidence> Evidence => Set<Evidence>();
    public DbSet<VehicleTest> Tests => Set<VehicleTest>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Delivery> Deliveries => Set<Delivery>();
    public DbSet<OrderUpdate> Updates => Set<OrderUpdate>();
    public DbSet<Assignment> Assignments => Set<Assignment>();
    public DbSet<StatusHistory> StatusHistory => Set<StatusHistory>();
    public DbSet<TrackingAccess> TrackingAccesses => Set<TrackingAccess>();
    public DbSet<AuditEntry> Audit => Set<AuditEntry>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);
        foreach (var type in b.Model.GetEntityTypes().Where(t => typeof(Entity).IsAssignableFrom(t.ClrType)).ToList())
            b.Entity(type.ClrType).HasBaseType((Type?)null);

        b.Entity<Vehicle>().HasIndex(x => x.Vin).IsUnique().HasFilter("[Vin] IS NOT NULL");
        b.Entity<Vehicle>().HasIndex(x => x.Plate);
        b.Entity<WorkOrder>().HasIndex(x => x.Folio).IsUnique();
        b.Entity<WorkOrder>().HasIndex(x => x.AppointmentId).IsUnique().HasFilter("[AppointmentId] IS NOT NULL");
        b.Entity<WorkOrder>().HasIndex(x => new { x.Status, x.EnteredAt });
        b.Entity<Appointment>().HasIndex(x => x.StartsAt);
        b.Entity<Reception>().HasIndex(x => x.WorkOrderId).IsUnique();
        b.Entity<ReceptionCheck>().HasIndex(x => new { x.ReceptionId, x.Item }).IsUnique();
        b.Entity<Delivery>().HasIndex(x => x.WorkOrderId).IsUnique();
        b.Entity<Quote>().HasIndex(x => new { x.WorkOrderId, x.Version }).IsUnique();
        b.Entity<QuoteAuthorization>().HasIndex(x => x.QuoteId).IsUnique();
        b.Entity<Quote>().HasOne(x => x.Authorization).WithOne(x => x.Quote).HasForeignKey<QuoteAuthorization>(x => x.QuoteId);
        b.Entity<Assignment>().HasIndex(x => new { x.WorkOrderId, x.MechanicId }).IsUnique().HasFilter("[EndedAt] IS NULL");
        b.Entity<TrackingAccess>().HasIndex(x => x.TokenHash).IsUnique();
        b.Entity<TrackingAccess>().HasIndex(x => x.WorkOrderId).IsUnique().HasFilter("[Revoked] = 0");
        b.Entity<StatusHistory>().HasIndex(x => new { x.WorkOrderId, x.CreatedAt });
        b.Entity<AuditEntry>().HasIndex(x => x.CreatedAt);
        b.Entity<Vehicle>().ToTable(t => t.HasCheckConstraint("CK_Vehicle_MileageYear", "[Mileage] >= 0 AND [Year] BETWEEN 1900 AND 2100"));
        b.Entity<Service>().ToTable(t => t.HasCheckConstraint("CK_Service_Amounts", "[BasePrice] >= 0 AND [EstimatedMinutes] > 0"));
        b.Entity<Appointment>().ToTable(t => t.HasCheckConstraint("CK_Appointment_Dates", "[EndsAt] > [StartsAt]"));
        b.Entity<WorkOrder>().ToTable(t => t.HasCheckConstraint("CK_Order_Mileage", "[EntryMileage] >= 0"));
        b.Entity<Reception>().ToTable(t => t.HasCheckConstraint("CK_Reception_Values", "[FuelPercent] BETWEEN 0 AND 100 AND [KeyCount] BETWEEN 0 AND 20"));
        b.Entity<Quote>().ToTable(t => t.HasCheckConstraint("CK_Quote_Amounts", "[Subtotal] >= 0 AND [Discount] BETWEEN 0 AND [Subtotal] AND [TaxPercent] BETWEEN 0 AND 100 AND [Tax] >= 0 AND [Total] = [Subtotal] - [Discount] + [Tax] AND [Version] > 0"));
        b.Entity<QuoteLine>().ToTable(t => t.HasCheckConstraint("CK_QuoteLine_Amounts", "[Quantity] > 0 AND [UnitPrice] >= 0 AND [Total] >= 0"));
        b.Entity<Payment>().ToTable(t => t.HasCheckConstraint("CK_Payment_Amount", "[Amount] > 0"));
        b.Entity<Delivery>().ToTable(t => t.HasCheckConstraint("CK_Delivery_Mileage", "[ExitMileage] >= 0"));
        foreach (var type in b.Model.GetEntityTypes())
        {
            foreach (var fk in type.GetForeignKeys()) fk.DeleteBehavior = DeleteBehavior.Restrict;
            foreach (var p in type.GetProperties().Where(p => p.ClrType == typeof(decimal))) { p.SetPrecision(18); p.SetScale(2); }
        }
    }
}
