using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;

namespace Taller.Web.Domain;

public static class Roles
{
    public const string Admin = "Administrador", Reception = "Recepcion", Mechanic = "Mecanico";
    public const string Office = Admin + "," + Reception;
}
public enum OrderStatus { Ingresado, EnEspera, Diagnostico, Cotizacion, Autorizacion, EnReparacion, Pruebas, Reparado, ListoParaEntrega, Entregado }
public enum Priority { Normal, Alta, Urgente }
public enum AppointmentStatus { Pendiente, Confirmada, EnEspera, Atendida, Cancelada, NoAsistio }
public enum QuoteStatus { Pendiente, Autorizada, Rechazada, Sustituida }
public enum TestResult { Satisfactorio, RequiereRevision, NoSatisfactorio }

public class StaffUser : IdentityUser
{
    [MaxLength(150)] public string FullName { get; set; } = "";
    public bool Active { get; set; } = true;
}
public abstract class Entity { public int Id { get; set; } }
public class Customer : Entity
{
    [MaxLength(150)] public string Name { get; set; } = "";
    [MaxLength(30)] public string Phone { get; set; } = "";
    [MaxLength(254)] public string? Email { get; set; }
    [MaxLength(400)] public string? Address { get; set; }
    public bool Active { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
public class Vehicle : Entity
{
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    [MaxLength(17)] public string? Vin { get; set; }
    [MaxLength(60)] public string Brand { get; set; } = "";
    [MaxLength(80)] public string Model { get; set; } = "";
    public int Year { get; set; }
    [MaxLength(20)] public string Plate { get; set; } = "";
    [MaxLength(40)] public string? Color { get; set; }
    [MaxLength(40)] public string? Fuel { get; set; }
    [MaxLength(40)] public string? Transmission { get; set; }
    public int Mileage { get; set; }
    public bool Active { get; set; } = true;
}
public class Service : Entity
{
    [MaxLength(120)] public string Name { get; set; } = "";
    [MaxLength(1000)] public string? Description { get; set; }
    public decimal BasePrice { get; set; }
    public int EstimatedMinutes { get; set; }
    public bool Active { get; set; } = true;
}
public class Appointment : Entity
{
    public int VehicleId { get; set; }
    public Vehicle Vehicle { get; set; } = null!;
    public int ServiceId { get; set; }
    public Service Service { get; set; } = null!;
    public DateTimeOffset StartsAt { get; set; }
    public DateTimeOffset EndsAt { get; set; }
    [MaxLength(1000)] public string Reason { get; set; } = "";
    public AppointmentStatus Status { get; set; }
    public string CreatedById { get; set; } = "";
    public StaffUser CreatedBy { get; set; } = null!;
}
public class WorkOrder : Entity
{
    [MaxLength(30)] public string Folio { get; set; } = "";
    public int VehicleId { get; set; }
    public Vehicle Vehicle { get; set; } = null!;
    public int? AppointmentId { get; set; }
    public Appointment? Appointment { get; set; }
    public OrderStatus Status { get; set; }
    public Priority Priority { get; set; }
    public DateTimeOffset EnteredAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? EstimatedDelivery { get; set; }
    public DateTimeOffset? DeliveredAt { get; set; }
    public int EntryMileage { get; set; }
    [MaxLength(2000)] public string Reason { get; set; } = "";
    public string ReceivedById { get; set; } = "";
    public StaffUser ReceivedBy { get; set; } = null!;
    [Timestamp] public byte[] RowVersion { get; set; } = [];
    public List<Assignment> Assignments { get; set; } = [];
    public List<Quote> Quotes { get; set; } = [];
    public List<Repair> Repairs { get; set; } = [];
    public List<VehicleTest> Tests { get; set; } = [];
    public List<Payment> Payments { get; set; } = [];
}
public class Reception : Entity
{
    public int WorkOrderId { get; set; }
    public WorkOrder WorkOrder { get; set; } = null!;
    public int FuelPercent { get; set; }
    public int KeyCount { get; set; }
    public bool SpareTire { get; set; }
    public bool Jack { get; set; }
    public bool Tools { get; set; }
    [MaxLength(2000)] public string? Belongings { get; set; }
    [MaxLength(2000)] public string? ExistingDamage { get; set; }
    public List<ReceptionCheck> Checklist { get; set; } = [];
}
public class ReceptionCheck : Entity
{
    public int ReceptionId { get; set; }
    public Reception Reception { get; set; } = null!;
    [MaxLength(100)] public string Item { get; set; } = "";
    [MaxLength(40)] public string Condition { get; set; } = "";
    [MaxLength(500)] public string? Notes { get; set; }
}
public abstract class OrderRecord : Entity
{
    public int WorkOrderId { get; set; }
    public WorkOrder WorkOrder { get; set; } = null!;
    public string AuthorId { get; set; } = "";
    public StaffUser Author { get; set; } = null!;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
public class Assignment : OrderRecord
{
    public string MechanicId { get; set; } = "";
    public StaffUser Mechanic { get; set; } = null!;
    public DateTimeOffset? EndedAt { get; set; }
}
public class StatusHistory : OrderRecord
{
    public OrderStatus? Previous { get; set; }
    public OrderStatus Current { get; set; }
    [MaxLength(1000)] public string? Comment { get; set; }
}
public class Diagnosis : OrderRecord
{
    [MaxLength(4000)] public string Description { get; set; } = "";
    [MaxLength(2000)] public string Cause { get; set; } = "";
    [MaxLength(2000)] public string Recommendation { get; set; } = "";
    public List<Fault> Faults { get; set; } = [];
}
public class Fault : Entity
{
    public int DiagnosisId { get; set; }
    public Diagnosis Diagnosis { get; set; } = null!;
    [MaxLength(1000)] public string Description { get; set; } = "";
    public Priority Priority { get; set; }
}
public class Quote : OrderRecord
{
    public int Version { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Discount { get; set; }
    public decimal TaxPercent { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public QuoteStatus Status { get; set; }
    public List<QuoteLine> Lines { get; set; } = [];
    public QuoteAuthorization? Authorization { get; set; }
}
public class QuoteLine : Entity
{
    public int QuoteId { get; set; }
    public Quote Quote { get; set; } = null!;
    [MaxLength(30)] public string Type { get; set; } = "";
    [MaxLength(500)] public string Description { get; set; } = "";
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Total { get; set; }
}
public class QuoteAuthorization : Entity
{
    public int QuoteId { get; set; }
    public Quote Quote { get; set; } = null!;
    public bool Approved { get; set; }
    [MaxLength(2000)] public string ConsentEvidence { get; set; } = "";
    public string RecordedById { get; set; } = "";
    public StaffUser RecordedBy { get; set; } = null!;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
public class Repair : OrderRecord
{
    public int QuoteLineId { get; set; }
    public QuoteLine QuoteLine { get; set; } = null!;
    [MaxLength(3000)] public string Description { get; set; } = "";
    public DateTimeOffset? CompletedAt { get; set; }
}
public class Evidence : OrderRecord
{
    [MaxLength(80)] public string StoredName { get; set; } = "";
    [MaxLength(200)] public string OriginalName { get; set; } = "";
    [MaxLength(40)] public string ContentType { get; set; } = "";
    [MaxLength(40)] public string Stage { get; set; } = "";
    [MaxLength(500)] public string Description { get; set; } = "";
    public bool VisibleToCustomer { get; set; }
    public long Size { get; set; }
}
public class VehicleTest : OrderRecord
{
    [MaxLength(100)] public string Type { get; set; } = "";
    public TestResult Result { get; set; }
    [MaxLength(2000)] public string Notes { get; set; } = "";
}
public class Payment : OrderRecord
{
    public decimal Amount { get; set; }
    [MaxLength(30)] public string Method { get; set; } = "";
    [MaxLength(100)] public string? Reference { get; set; }
}
public class Delivery : OrderRecord
{
    public int ExitMileage { get; set; }
    [MaxLength(150)] public string ReceivedBy { get; set; } = "";
    public bool CustomerAccepted { get; set; }
    [MaxLength(2000)] public string? Notes { get; set; }
}
public class OrderUpdate : OrderRecord
{
    [MaxLength(150)] public string Title { get; set; } = "";
    [MaxLength(3000)] public string Message { get; set; } = "";
    public bool VisibleToCustomer { get; set; }
}
public class TrackingAccess : Entity
{
    public int WorkOrderId { get; set; }
    public WorkOrder WorkOrder { get; set; } = null!;
    [MaxLength(64)] public string TokenHash { get; set; } = "";
    [MaxLength(64)] public string CodeHash { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ExpiresAt { get; set; }
    public bool Revoked { get; set; }
    public DateTimeOffset? LastAccess { get; set; }
    public int FailedAttempts { get; set; }
    public DateTimeOffset? LockedUntil { get; set; }
}
public class AuditEntry : Entity
{
    public string ActorId { get; set; } = "";
    public StaffUser Actor { get; set; } = null!;
    [MaxLength(100)] public string Action { get; set; } = "";
    [MaxLength(60)] public string Resource { get; set; } = "";
    public int ResourceId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
